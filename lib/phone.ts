export function italianPhoneDigits(value: string): string {
  const withoutPrefix = value.trim().replace(/^(?:\+39|0039)\s*/, "");
  return withoutPrefix.replace(/\D/g, "");
}

export function normalizeItalianPhone(value: string): string | null {
  const digits = italianPhoneDigits(value);
  return /^\d{6,11}$/.test(digits) ? `+39${digits}` : null;
}
