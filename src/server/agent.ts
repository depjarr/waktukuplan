import Groq from 'groq-sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { addDays, fmtDate, todayInTz } from '@/lib/dates';
import type { AgentResult, EventRow, UndoOp } from '@/lib/types';
import { addNote, createEvent, deleteEvent, listEvents, updateEvent } from './eventService';

export class AiRateLimitError extends Error {
  constructor() {
    super('Batas pemakaian AI sedang penuh');
    this.name = 'AiRateLimitError';
  }
}

const MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
const MAX_ROUNDS = 3;

const CATS = ['Meeting', 'Liburan', 'Konser', 'Makan', 'Tugas', 'Personal', 'Lainnya'];

// Definisi Tools untuk Groq (Format OpenAI / Function Calling)
const TOOLS: Groq.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'add_event',
      description: 'Tambah satu jadwal ke kalender.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Judul singkat' },
          date: { type: 'string', description: 'Format YYYY-MM-DD' },
          start_time: { type: 'string', description: 'HH:MM 24 jam' },
          end_time: { type: 'string', description: 'HH:MM 24 jam' },
          category: { type: 'string', enum: CATS },
          place: { type: 'string' },
          note: { type: 'string' },
          starred: { type: 'boolean' },
        },
        required: ['title', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_events',
      description: 'Lihat jadwal user dalam rentang tanggal. Wajib dipanggil sebelum update/delete/complete.',
      parameters: {
        type: 'object',
        properties: {
          from: { type: 'string', description: 'YYYY-MM-DD' },
          to: { type: 'string', description: 'YYYY-MM-DD' },
          query: { type: 'string', description: 'Kata kunci judul' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_event',
      description: 'Ubah jadwal. Butuh id dari list_events.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          date: { type: 'string' },
          start_time: { type: 'string' },
          end_time: { type: 'string' },
          category: { type: 'string', enum: CATS },
          place: { type: 'string' },
          note: { type: 'string' },
          starred: { type: 'boolean' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_event',
      description: 'Tandai jadwal selesai.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_event',
      description: 'Hapus jadwal.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_note',
      description: 'Tambah catatan/checklist.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
        },
        required: ['items'],
      },
    },
  },
];

function systemPrompt(tz: string) {
  const t = todayInTz(tz);
  return [
    'Kamu adalah asisten di aplikasi jurnal jadwal bernama "waktukuplan". Tugasmu mengubah pesan user menjadi aksi pada kalender mereka.',
    `Hari ini: ${t.weekday}, ${t.key}. Zona waktu user: ${tz}.`,
    'Hitung tanggal relatif (besok, lusa, Jumat depan) dari hari ini. Jam pakai format 24 jam.',
    'Jangan mengarang id. Untuk hapus/ubah/selesaikan, panggil list_events dulu.',
    'Balas singkat (1-2 kalimat) santai dalam bahasa Indonesia tanpa markdown.',
  ].join('\n');
}

export async function runAgent(o: {
  sb: SupabaseClient;
  userId: string;
  message: string;
  timezone?: string;
}): Promise<AgentResult> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error('GROQ_API_KEY belum diisi di environment variable');

  const groq = new Groq({ apiKey });
  const { sb, userId } = o;
  const timezone = o.timezone || 'Asia/Jakarta';
  const message = o.message.slice(0, 600);

  const changes: string[] = [];
  const undo: UndoOp[] = [];
  const addedIds: string[] = [];
  let firstDate: string | null = null;

  const brief = (e: EventRow) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    start_time: e.start_time,
    end_time: e.end_time,
    category: e.category,
    place: e.place,
    done: e.done,
  });

  async function runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    const today = todayInTz(timezone).key;
    switch (name) {
      case 'add_event': {
        const e = await createEvent(sb, userId, input, 'ai');
        addedIds.push(e.id);
        undo.push({ op: 'delete_event', id: e.id });
        firstDate = firstDate ?? e.date;
        changes.push(`Ditambah: ${e.title}, ${fmtDate(e.date)}${e.start_time ? ` jam ${e.start_time}` : ''}`);
        return { ok: true, event: brief(e) };
      }
      case 'list_events': {
        const from = typeof input.from === 'string' ? input.from : today;
        const to = typeof input.to === 'string' ? input.to : addDays(today, 90);
        const rows = await listEvents(sb, userId, {
          from,
          to,
          query: typeof input.query === 'string' ? input.query : undefined,
        });
        return { events: rows.map(brief) };
      }
      case 'update_event': {
        const r = await updateEvent(sb, userId, String(input.id), input);
        if (!r) return { ok: false, error: 'jadwal tidak ditemukan' };
        undo.push({ op: 'restore_event', row: r.before });
        changes.push(`Diubah: ${r.after.title}`);
        return { ok: true, event: brief(r.after) };
      }
      case 'complete_event': {
        const r = await updateEvent(sb, userId, String(input.id), { done: true });
        if (!r) return { ok: false, error: 'jadwal tidak ditemukan' };
        undo.push({ op: 'set_done', id: r.before.id, done: r.before.done });
        changes.push(`Selesai: ${r.after.title}`);
        return { ok: true };
      }
      case 'delete_event': {
        const before = await deleteEvent(sb, userId, String(input.id));
        if (!before) return { ok: false, error: 'jadwal tidak ditemukan' };
        undo.push({ op: 'restore_event', row: before });
        changes.push(`Dihapus: ${before.title}`);
        return { ok: true };
      }
      case 'add_note': {
        const items = Array.isArray(input.items) ? input.items.map(String) : [];
        if (!items.length) return { ok: false, error: 'items kosong' };
        const r = await addNote(sb, userId, { title: typeof input.title === 'string' ? input.title : '', items });
        if (r.created) undo.push({ op: 'delete_note', id: r.note.id });
        changes.push(`Catatan: ${r.note.title}`);
        return { ok: true };
      }
      default:
        return { ok: false, error: `tool tidak dikenal: ${name}` };
    }
  }

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt(timezone) },
    { role: 'user', content: message },
  ];

  let reply = '';

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: 1024,
    });

    const choice = response.choices[0]?.message;
    if (!choice) break;

    messages.push(choice);

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      reply = choice.content || '';
      break;
    }

    for (const toolCall of choice.tool_calls) {
      const name = toolCall.function.name;
      let args = {};
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }

      const toolResult = await runTool(name, args as Record<string, unknown>);

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }
  }

  return {
    reply: reply || (changes.length ? 'Beres!' : 'Maaf, aku belum paham. Coba sebutkan tanggal dan kegiatannya ya.'),
    changes,
    undo,
    addedIds,
    firstDate,
  };
}