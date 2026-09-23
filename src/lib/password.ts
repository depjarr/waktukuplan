/**
 * Aturan kekuatan kata sandi untuk SIGN UP dan RESET password.
 * Sengaja TIDAK dipakai di form login — password lama yang dibuat sebelum
 * aturan ini ada harus tetap bisa dipakai masuk seperti biasa.
 */
export const PASSWORD_MIN_LENGTH = 8;

// Karakter yang dianggap "unik" / simbol (bukan huruf atau angka).
const SPECIAL_CHAR_RE = /[^A-Za-z0-9]/;
const UPPERCASE_RE = /[A-Z]/;

/** Mengembalikan pesan error (string) kalau password belum memenuhi syarat, atau null kalau sudah oke. */
export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`;
  }
  if (!UPPERCASE_RE.test(password)) {
    return 'Kata sandi harus mengandung minimal 1 huruf besar.';
  }
  if (!SPECIAL_CHAR_RE.test(password)) {
    return 'Kata sandi harus mengandung minimal 1 karakter unik (misalnya # * & @ !).';
  }
  return null;
}

/** Versi boolean, dipakai untuk enable/disable tombol tanpa perlu tampilkan pesan. */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password) === null;
}