'use client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCovers } from '@/hooks/useCovers';
import { useDayTitles } from '@/hooks/useDayTitles';
import { useDrawing } from '@/hooks/useDrawing';
import { useSettings } from '@/hooks/useSettings';
import { useTable } from '@/hooks/useTable';
import { useTodayKey } from '@/hooks/useNow';
import { fmtDate, parseYmd, ymOf, ymd } from '@/lib/dates';
import { createClient } from '@/lib/supabase/client';
import type {
  AgentResult, EventRow, NewEvent, NoteRow, StickerRow, Tool, UiSettings, UndoOp, ViewMode,
} from '@/lib/types';

export interface ViewState {
  year: number;
  month: number; // 0..11
  mode: ViewMode;
  tool: Tool;
  penColor: string;
  penSize: number;
  itinStart: string; // tanggal kolom pertama di tampilan itinerari
  selSticker: string | null;
}
interface ToastState { msg: string; undo?: () => void }
interface AskState { title: string; placeholder: string; onOk: (v: string) => void }

interface Ctx {
  userId: string;
  sb: SupabaseClient;
  todayKey: string;

  view: ViewState;
  ym: string;
  patchView: (p: Partial<ViewState>) => void;
  gotoMonth: (y: number, m: number) => void;
  setMode: (m: ViewMode) => void;
  setTool: (t: Tool) => void;
  mini: { y: number; m: number };
  setMini: (y: number, m: number) => void;

  events: EventRow[];
  byDate: Record<string, EventRow[]>;
  addEvent: (input: NewEvent) => Promise<EventRow | null>;
  saveEvent: (id: string, patch: Partial<EventRow>) => Promise<void>;
  removeEvent: (id: string) => void;
  toggleDone: (id: string) => void;
  toggleStar: (id: string) => void;
  clearDay: (date: string) => void;

  notes: ReturnType<typeof useTable<NoteRow>>;
  stickers: ReturnType<typeof useTable<StickerRow>>;
  addSticker: (s: Partial<StickerRow>) => Promise<string | null>;
  drawing: ReturnType<typeof useDrawing>;
  covers: ReturnType<typeof useCovers>;
  dayTitles: ReturnType<typeof useDayTitles>;
  ui: UiSettings;
  updateUi: (p: Partial<UiSettings>) => void;

  toast: (msg: string, opts?: { undo?: () => void }) => void;
  toastState: ToastState | null;
  dismissToast: () => void;
  flash: Set<string>;
  flashIds: (ids: string[]) => void;

  eventDlg: { id?: string; date?: string } | null;
  openEvent: (o?: { id?: string; date?: string }) => void;
  closeEvent: () => void;
  dayDlg: string | null;
  openDay: (date: string) => void;
  closeDay: () => void;
  askDlg: AskState | null;
  ask: (a: AskState) => void;
  closeAsk: () => void;
  aiDlg: boolean;
  setAiDlg: (b: boolean) => void;
  closeAi: () => void;

  applyUndo: (ops: UndoOp[]) => Promise<void>;
  afterAgent: (r: AgentResult) => Promise<void>;
}

const PlannerCtx = createContext<Ctx | null>(null);
export function usePlanner(): Ctx {
  const c = useContext(PlannerCtx);
  if (!c) throw new Error('usePlanner harus dipakai di dalam <PlannerProvider>');
  return c;
}

const cmpEvent = (a: EventRow, b: EventRow) => {
  const rank = (e: EventRow) => (e.kind === 'text' ? 2 : e.start_time ? 0 : 1);
  return rank(a) - rank(b) || (a.start_time ?? '').localeCompare(b.start_time ?? '') || a.title.localeCompare(b.title);
};
export { cmpEvent };

export function PlannerProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const sb = useMemo(() => createClient(), []);
  const todayKey = useTodayKey();
  const now0 = useMemo(() => new Date(), []);

  const [view, setView] = useState<ViewState>({
    year: now0.getFullYear(), month: now0.getMonth(), mode: 'month', tool: 'select',
    penColor: '#E4708C', penSize: 4, itinStart: ymd(now0), selSticker: null,
  });
  const [mini, setMiniState] = useState({ y: now0.getFullYear(), m: now0.getMonth() });
  const ym = ymOf(view.year, view.month);

  const eventsT = useTable<EventRow>('events', userId);
  const notes = useTable<NoteRow>('notes', userId, 'position');
  const stickers = useTable<StickerRow>('stickers', userId);
  const drawing = useDrawing(userId, ym);
  const covers = useCovers(userId);
  const dayTitles = useDayTitles(userId);
  const { ui, updateUi } = useSettings(userId);

  // ----- toast -----
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dismissToast = useCallback(() => setToastState(null), []);
  const toast = useCallback((msg: string, opts?: { undo?: () => void }) => {
    setToastState({ msg, undo: opts?.undo });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState(null), opts?.undo ? 6500 : 3200);
  }, []);

  // ----- flash (kedip sebentar untuk jadwal yang baru ditambah) -----
  const [flash, setFlash] = useState<Set<string>>(new Set());
  const flashIds = useCallback((ids: string[]) => {
    setFlash(new Set(ids));
    setTimeout(() => setFlash(new Set()), 2800);
  }, []);

  // ----- dialogs -----
  const [eventDlg, setEventDlg] = useState<Ctx['eventDlg']>(null);
  const [dayDlg, setDayDlg] = useState<string | null>(null);
  const [askDlg, setAskDlg] = useState<AskState | null>(null);
  const [aiDlg, setAiDlg] = useState(false);

  // ----- navigasi -----
  const itinStartFor = useCallback((y: number, m: number) => {
    const first = new Date(y, m, 1);
    return first.getFullYear() === now0.getFullYear() && first.getMonth() === now0.getMonth() ? todayKey : ymd(first);
  }, [now0, todayKey]);

  const patchView = useCallback((p: Partial<ViewState>) => setView((v) => ({ ...v, ...p })), []);
  const gotoMonth = useCallback((y: number, m: number) => {
    setView((v) => ({ ...v, year: y, month: m, selSticker: null, itinStart: itinStartFor(y, m) }));
  }, [itinStartFor]);
  const setMode = useCallback((mode: ViewMode) => {
    setView((v) => ({ ...v, mode, tool: mode === 'itin' ? 'select' : v.tool, itinStart: mode === 'itin' ? itinStartFor(v.year, v.month) : v.itinStart }));
  }, [itinStartFor]);
  const setTool = useCallback((t: Tool) => {
    setView((v) => {
      const next = v.tool === t && t !== 'select' ? 'select' : t;
      return { ...v, tool: next, mode: next !== 'select' ? 'month' : v.mode, selSticker: next !== 'select' ? null : v.selSticker };
    });
  }, []);
  const setMini = useCallback((y: number, m: number) => setMiniState({ y, m }), []);

  // ----- jadwal -----
  const events = eventsT.rows;
  const byDate = useMemo(() => {
    const m: Record<string, EventRow[]> = {};
    events.forEach((e) => (m[e.date] ??= []).push(e));
    Object.values(m).forEach((l) => l.sort(cmpEvent));
    return m;
  }, [events]);

  const addEvent = useCallback(async (input: NewEvent) => {
    const row: Partial<EventRow> = {
      start_time: null, end_time: null, category: 'Lainnya', category_name: null, place: null, note: null,
      image_url: null, done: false, starred: false, remind: null, kind: 'event', source: 'web', ...input,
    };
    try {
      return await eventsT.insert(row);
    } catch {
      toast('Gagal menyimpan jadwal, coba lagi');
      return null;
    }
  }, [eventsT, toast]);

  const saveEvent = useCallback(async (id: string, patch: Partial<EventRow>) => {
    try {
      await eventsT.update(id, patch);
    } catch {
      toast('Gagal menyimpan perubahan');
    }
  }, [eventsT, toast]);

  const removeEvent = useCallback((id: string) => {
    const row = events.find((e) => e.id === id);
    if (!row) return;
    eventsT.remove([id]).catch(() => toast('Gagal menghapus'));
    toast(`"${row.title}" dihapus`, { undo: () => eventsT.upsertMany([row]).catch(() => toast('Gagal mengembalikan')) });
  }, [events, eventsT, toast]);

  const toggleDone = useCallback((id: string) => {
    const e = events.find((x) => x.id === id);
    if (e) saveEvent(id, { done: !e.done });
  }, [events, saveEvent]);
  const toggleStar = useCallback((id: string) => {
    const e = events.find((x) => x.id === id);
    if (e) saveEvent(id, { starred: !e.starred });
  }, [events, saveEvent]);

  const clearDay = useCallback((date: string) => {
    const list = byDate[date] ?? [];
    if (!list.length) return toast('Tanggal ini sudah kosong');
    eventsT.remove(list.map((e) => e.id)).catch(() => toast('Gagal menghapus'));
    toast(`${list.length} item di ${fmtDate(date)} dihapus`, { undo: () => eventsT.upsertMany(list).catch(() => toast('Gagal mengembalikan')) });
  }, [byDate, eventsT, toast]);

  // ----- catatan: bikin satu catatan awal kalau masih kosong -----
  const seeded = useRef(false);
  useEffect(() => {
    if (notes.ready && notes.rows.length === 0 && !seeded.current) {
      seeded.current = true;
      notes.insert({ title: 'Catatan', items: [], position: 0 }).catch(() => undefined);
    }
  }, [notes]);

  // ----- stiker -----
  const addSticker = useCallback(async (s: Partial<StickerRow>) => {
    const z = stickers.rows.reduce((a, r) => Math.max(a, r.z), 1) + 1;
    const id = crypto.randomUUID();
    setView((v) => ({ ...v, selSticker: id })); // langsung terpilih, tanpa menunggu server
    try {
      await stickers.insert({
        id, ym, x: 40, y: 10, rot: 0, z, ch: null, text_content: null, src: null, w: null, fs: null, color: null, ...s,
      } as Partial<StickerRow>);
      return id;
    } catch {
      toast('Gagal menyimpan stiker');
      return null;
    }
  }, [stickers, ym, toast]);

  // ----- undo & setelah AI selesai -----
  const applyUndo = useCallback(async (ops: UndoOp[]) => {
    for (const o of ops.slice().reverse()) {
      if (o.op === 'delete_event') await eventsT.remove([o.id]).catch(() => undefined);
      else if (o.op === 'restore_event') await eventsT.upsertMany([o.row]).catch(() => undefined);
      else if (o.op === 'set_done') await eventsT.update(o.id, { done: o.done }).catch(() => undefined);
      else if (o.op === 'delete_note') await notes.remove([o.id]).catch(() => undefined);
    }
  }, [eventsT, notes]);

  const afterAgent = useCallback(async (r: AgentResult) => {
    await Promise.all([eventsT.reload(), notes.reload()]);
    if (r.firstDate) {
      const d = parseYmd(r.firstDate);
      gotoMonth(d.getFullYear(), d.getMonth());
      setMiniState({ y: d.getFullYear(), m: d.getMonth() });
    }
    if (r.addedIds.length) flashIds(r.addedIds);
  }, [eventsT, notes, gotoMonth, flashIds]);

  const value: Ctx = {
    userId, sb, todayKey, view, ym, patchView, gotoMonth, setMode, setTool, mini, setMini,
    events, byDate, addEvent, saveEvent, removeEvent, toggleDone, toggleStar, clearDay,
    notes, stickers, addSticker, drawing, covers, dayTitles, ui, updateUi,
    toast, toastState, dismissToast, flash, flashIds,
    eventDlg, openEvent: (o) => setEventDlg(o ?? {}), closeEvent: () => setEventDlg(null),
    dayDlg, openDay: setDayDlg, closeDay: () => setDayDlg(null),
    askDlg, ask: setAskDlg, closeAsk: () => setAskDlg(null),
     aiDlg, setAiDlg, closeAi: () => setAiDlg(false), applyUndo, afterAgent,
  };
  return <PlannerCtx.Provider value={value}>{children}</PlannerCtx.Provider>;
}
