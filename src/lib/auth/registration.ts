const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export const CALLING_CODE_OPTIONS = [
  { value: "+84", label: "Việt Nam (+84)" },
  { value: "+1", label: "Hoa Kỳ / Canada (+1)" },
  { value: "+81", label: "Nhật Bản (+81)" },
  { value: "+82", label: "Hàn Quốc (+82)" },
  { value: "+65", label: "Singapore (+65)" },
] as const;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhoneNumber(
  phoneNumber: string,
  callingCode = "+84",
): string | null {
  const compact = phoneNumber.trim().replace(/[\s().-]/g, "");
  const normalizedCallingCode = callingCode.trim().replace(/^00/, "+");

  if (!compact || !/^\+\d{1,3}$/.test(normalizedCallingCode)) {
    return null;
  }

  let candidate: string;

  if (compact.startsWith("+")) {
    candidate = compact;
  } else if (compact.startsWith("00")) {
    candidate = `+${compact.slice(2)}`;
  } else if (compact.startsWith(normalizedCallingCode.slice(1))) {
    candidate = `+${compact}`;
  } else {
    const nationalNumber = compact.replace(/^0+/, "");
    candidate = `${normalizedCallingCode}${nationalNumber}`;
  }

  return E164_PATTERN.test(candidate) ? candidate : null;
}

export function isNormalizedPhoneNumber(value: string): boolean {
  return E164_PATTERN.test(value);
}

export function parseOptionalDateOfBirth(
  value: string,
): Date | null | undefined {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return undefined;
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== normalized
  ) {
    return undefined;
  }

  const today = new Date();
  const oldest = new Date();
  oldest.setUTCFullYear(today.getUTCFullYear() - 120);

  if (date > today || date < oldest) {
    return undefined;
  }

  return date;
}
