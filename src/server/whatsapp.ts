import crypto from 'node:crypto';

/** Memeriksa tanda tangan Meta (X-Hub-Signature-256) supaya webhook tidak bisa dipalsukan. */
export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const got = header.slice(7);
  if (got.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

/** Kirim pesan teks lewat WhatsApp Cloud API. */
export async function sendWhatsApp(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) {
    console.error('[wa] WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID belum diisi');
    return;
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text.slice(0, 3800) } }),
  });
  if (!res.ok) console.error('[wa] gagal kirim', res.status, await res.text());
}

export interface WaMessage {
  id: string;
  from: string;
  type: string;
  text?: string;
}

/** Ambil daftar pesan dari payload webhook Meta. */
export function extractMessages(body: unknown): WaMessage[] {
  const out: WaMessage[] = [];
  const entries = (body as { entry?: unknown[] })?.entry ?? [];
  for (const entry of entries) {
    for (const change of (entry as { changes?: unknown[] }).changes ?? []) {
      const msgs = (change as { value?: { messages?: unknown[] } }).value?.messages ?? [];
      for (const m of msgs as { id: string; from: string; type: string; text?: { body: string } }[]) {
        out.push({ id: m.id, from: m.from, type: m.type, text: m.text?.body });
      }
    }
  }
  return out;
}
