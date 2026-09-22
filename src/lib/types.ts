import type { ThemePref } from './theme';
import type { FontPref } from './fonts';
export type Category = 'Meeting' | 'Liburan' | 'Konser' | 'Makan' | 'Tugas' | 'Personal' | 'Lainnya';
export type EventKind = 'event' | 'text';

export interface EventRow {
  id: string;
  user_id: string;
  title: string;
  date: string; // 'YYYY-MM-DD'
  start_time: string | null; // 'HH:MM'
  end_time: string | null;
  category: Category;
  category_name: string | null;
  place: string | null;
  note: string | null;
  image_url: string | null;
  done: boolean;
  starred: boolean;
  remind: string | null;
  kind: EventKind;
  source: string;
  created_at?: string;
}

/** Data yang dibutuhkan untuk membuat jadwal baru. */
export type NewEvent = Partial<Omit<EventRow, 'id' | 'user_id'>> & { title: string; date: string };

export interface NoteItem {
  t: string;
  ck: boolean; // true = punya kotak ceklis
  done: boolean;
}
export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  items: NoteItem[];
  position: number;
}

export type StickerType = 'emoji' | 'text' | 'img';
export interface StickerRow {
  id: string;
  user_id: string;
  ym: string;
  type: StickerType;
  ch: string | null;
  text_content: string | null;
  src: string | null;
  x: number;
  y: number;
  w: number | null;
  fs: number | null;
  rot: number;
  z: number;
  color: string | null;
}

export interface Stroke {
  c: string; // warna
  w: number; // tebal (dinormalisasi terhadap lebar kanvas)
  e: boolean; // penghapus?
  p: [number, number][]; // titik (0..1)
}

export type Tool = 'select' | 'text' | 'pencil' | 'eraser';
export type ViewMode = 'month' | 'itin';

export interface UiSettings {
  notes: 'dock' | 'float' | 'hidden';
  left: boolean;
  mini: boolean;
  stickers: boolean;
  nCheck: boolean;
  nx: number | null;
  ny: number | null;
  activeNote: string | null;
  theme?: ThemePref;
  font?: FontPref;
  journalName?: string;
  headerImage?: string | null;
}
export const DEFAULT_UI: UiSettings = {
  notes: 'dock', left: true, mini: true, stickers: true, nCheck: true, nx: null, ny: null, activeNote: null,
};

/** Cara membatalkan (undo) perubahan yang dibuat AI. */
export type UndoOp =
  | { op: 'delete_event'; id: string }
  | { op: 'restore_event'; row: EventRow }
  | { op: 'set_done'; id: string; done: boolean }
  | { op: 'delete_note'; id: string };

export interface AgentResult {
  reply: string;
  changes: string[]; // ringkasan perubahan, tampil sebagai daftar
  undo: UndoOp[];
  addedIds: string[];
  firstDate: string | null;
}