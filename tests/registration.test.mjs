import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeEmail,
  normalizePhoneNumber,
  parseOptionalBirthYear,
} from "../src/lib/auth/registration.ts";

test("normalizes email for case-insensitive uniqueness", () => {
  assert.equal(
    normalizeEmail("  Demo.User@Example.COM "),
    "demo.user@example.com",
  );
});

test("normalizes Vietnamese local and international phone variants to one value", () => {
  const expected = "+84912345678";

  assert.equal(normalizePhoneNumber("0912 345 678"), expected);
  assert.equal(normalizePhoneNumber("84912345678"), expected);
  assert.equal(normalizePhoneNumber("+84 912 345 678"), expected);
  assert.equal(normalizePhoneNumber("0084 912 345 678"), expected);
});

test("accepts international numbers and rejects invalid phone input", () => {
  assert.equal(normalizePhoneNumber("+1 202-555-0102"), "+12025550102");
  assert.equal(normalizePhoneNumber("phone"), null);
  assert.equal(normalizePhoneNumber("123"), null);
});

test("keeps birth year optional and rejects invalid years", () => {
  const currentYear = new Date().getUTCFullYear();

  assert.equal(parseOptionalBirthYear(""), null);
  assert.equal(parseOptionalBirthYear("not-a-year"), undefined);
  assert.equal(parseOptionalBirthYear(String(currentYear + 1)), undefined);
  assert.equal(parseOptionalBirthYear(String(currentYear - 121)), undefined);
  assert.equal(parseOptionalBirthYear("1990"), 1990);
});
