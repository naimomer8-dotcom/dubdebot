export function normalizeIsraeliPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let local = digits;
  if (local.startsWith("+972")) local = "0" + local.slice(4);
  else if (local.startsWith("972")) local = "0" + local.slice(3);
  // mobile: 05X-XXXXXXX
  if (/^05\d{8}$/.test(local)) return local;
  return null;
}

export function isEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim());
}

export function cleanName(input: string) {
  return input.replace(/\s+/g, " ").trim().slice(0, 80);
}
