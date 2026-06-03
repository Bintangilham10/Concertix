export const FORM_LIMITS = {
  fullNameMin: 2,
  fullNameMax: 120,
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 128,
  otpLength: 6,
  searchMax: 80,
  ticketCodeMax: 96,
  buyerPhoneMin: 8,
  buyerPhoneMax: 13,
  concertNameMax: 160,
  concertArtistMax: 160,
  concertVenueMax: 200,
  concertTimeMax: 32,
  concertDescriptionMax: 2000,
  concertImageUrlMax: 500,
  concertQuotaMin: 1,
  concertQuotaMax: 100000,
  concertPriceMin: 1,
  concertPriceMax: 1000000000,
} as const;

export const UUID_PATTERN =
  "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

const UUID_REGEX = new RegExp(UUID_PATTERN);
const EMAIL_REGEX = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const CONTROL_OR_TAG_CHARS = /[\u0000-\u001f\u007f<>]/g;

export function limitLength(value: string, maxLength: number): string {
  return value.slice(0, maxLength);
}

export function cleanPlainText(value: string, maxLength: number): string {
  return limitLength(value.replace(CONTROL_OR_TAG_CHARS, ""), maxLength);
}

export function cleanDigits(value: string, maxLength: number): string {
  return limitLength(value.replace(/\D/g, ""), maxLength);
}

export function parseTicketCode(value: string): string {
  const cleaned = cleanPlainText(value, FORM_LIMITS.ticketCodeMax).trim();
  const match = cleaned.match(/CONCERTIX-VERIFY:([0-9a-fA-F-]+)/i);
  return match?.[1] ?? cleaned;
}

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isValidEmail(value: string): boolean {
  return value.length <= FORM_LIMITS.emailMax && EMAIL_REGEX.test(value);
}
