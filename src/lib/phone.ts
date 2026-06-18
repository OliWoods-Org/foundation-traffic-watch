/** Normalize US phone numbers to E.164-ish digits for comparison. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export function phonesMatch(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}

export function isVoipRange(_phone: string): boolean {
  // Placeholder for carrier lookup integration (Twilio Lookup, etc.)
  return false;
}