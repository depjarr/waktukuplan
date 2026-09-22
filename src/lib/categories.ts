import type { Category, EventRow } from './types';

export const CATEGORIES: Category[] = ['Meeting', 'Liburan', 'Konser', 'Makan', 'Tugas', 'Personal', 'Lainnya'];
/** Ikon kecil di depan nama kategori. Dikosongkan supaya tampilan lebih bersih (warna kartu sudah menandai kategori).
 *  Mau dikembalikan? Isi dengan emoji atau huruf, mis. Meeting: '💼'. */
export const CAT_ICON: Record<Category, string> = {
  Meeting: '', Liburan: '', Konser: '', Makan: '', Tugas: '', Personal: '', Lainnya: '',
};
export const catIcon = (e: Pick<EventRow, 'category'>) => CAT_ICON[e.category] ?? '';
export const catLabel = (e: Pick<EventRow, 'category' | 'category_name'>) =>
  e.category === 'Lainnya' && e.category_name ? e.category_name : e.category;
export const isCategory = (c: unknown): c is Category => typeof c === 'string' && (CATEGORIES as string[]).includes(c);

export const MONTH_EMOJI = ['🎀', '🍓', '🌱', '🌷', '🌼', '☁️', '🍰', '🎐', '🧸', '🍂', '🍄', '🎄'];
export const STICKER_EMOJIS = ['🌸', '🌷', '🌼', '🍓', '🍰', '☕', '🧸', '🐻', '🐰', '🐶', '🐱', '🎀', '⭐', '✨', '💗', '🎄', '🎁', '🎂', '🍪', '🥐', '🍑', '🌈', '☁️', '🌙', '🎫', '🎧', '📷', '✈️', '🏖️', '📌', '🧋', '🍡', '🎈', '🍀', '🦋', '🐝', '🌿', '📚', '💌', '🍒'];
export const PEN_COLORS = ['#E4708C', '#5B4037', '#5E9E80', '#5B9BD5', '#E7B23E', '#9A82D0', '#FFF2EC'];
