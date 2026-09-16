const DEFAULT_CALLING_CODE = "+84";
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhoneNumber(phoneNumber: string): string | null {
  const compact = phoneNumber.trim().replace(/[\s().-]/g, "");

  if (!compact) {
    return null;
  }

  let candidate: string;

  if (compact.startsWith("+")) {
    candidate = compact;
  } else if (compact.startsWith("00")) {
    candidate = `+${compact.slice(2)}`;
  } else if (compact.startsWith(DEFAULT_CALLING_CODE.slice(1))) {
    candidate = `+${compact}`;
  } else {
    const nationalNumber = compact.replace(/^0+/, "");
    candidate = `${DEFAULT_CALLING_CODE}${nationalNumber}`;
  }

  return E164_PATTERN.test(candidate) ? candidate : null;
}

export function isNormalizedPhoneNumber(value: string): boolean {
  return E164_PATTERN.test(value);
}

export function isValidBirthYear(value: number): boolean {
  const currentYear = new Date().getUTCFullYear();

  return (
    Number.isInteger(value) && value <= currentYear && value >= currentYear - 120
  );
}

export function parseOptionalBirthYear(
  value: string,
): number | null | undefined {
  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (!/^\d{4}$/.test(normalized)) {
    return undefined;
  }

  const year = Number(normalized);

  if (!isValidBirthYear(year)) {
    return undefined;
  }

  return year;
}
