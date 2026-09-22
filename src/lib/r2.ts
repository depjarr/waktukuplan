export async function uploadImage(blob: Blob): Promise<string> {
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ext }),
  });
  const { uploadUrl, key } = await res.json();
  await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } });
  return key; // cuma nama file yang disimpan ke Supabase
}