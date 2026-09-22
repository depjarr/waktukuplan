import type { SupabaseClient } from '@supabase/supabase-js';

/** Kecilkan gambar di browser sebelum diunggah (hemat kuota & cepat). */
export function resizeImage(file: File, max: number, keepAlpha: boolean): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Bukan file gambar'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.width || 300;
      const h = img.height || 300;
      const k = Math.min(1, max / Math.max(w, h));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * k));
      c.height = Math.max(1, Math.round(h * k));
      const g = c.getContext('2d')!;
      if (!keepAlpha) {
        g.fillStyle = '#fff';
        g.fillRect(0, 0, c.width, c.height);
      }
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Gagal memproses gambar'))), keepAlpha ? 'image/png' : 'image/jpeg', 0.82);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gambar tidak bisa dibaca'));
    };
    img.src = url;
  });
}

/** Unggah ke bucket 'images' (folder = id user) dan kembalikan URL publiknya. */
export async function uploadImage(sb: SupabaseClient, userId: string, blob: Blob): Promise<string> {
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from('images').upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (error) throw error;
  return sb.storage.from('images').getPublicUrl(path).data.publicUrl;
}
