import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeEmail,
  normalizePhoneNumber,
  parseOptionalDateOfBirth,
} from "../src/lib/auth/registration.ts";

test("normalizes email for case-insensitive uniqueness", () => {
  assert.equal(
    normalizeEmail("  Demo.User@Example.COM "),
    "demo.user@example.com",
  );
});

test("normalizes Vietnamese local and international phone variants to one value", () => {
  const expected = "+84912345678";

  assert.equal(normalizePhoneNumber("0912 345 678", "+84"), expected);
  assert.equal(normalizePhoneNumber("84912345678", "+84"), expected);
  assert.equal(normalizePhoneNumber("+84 912 345 678", "+84"), expected);
  assert.equal(normalizePhoneNumber("0084 912 345 678", "+84"), expected);
});

test("supports non-Vietnam calling codes and rejects invalid phone input", () => {
  assert.equal(normalizePhoneNumber("202-555-0102", "+1"), "+12025550102");
  assert.equal(normalizePhoneNumber("phone", "+84"), null);
  assert.equal(normalizePhoneNumber("123", "+84"), null);
});

test("keeps date of birth optional and rejects impossible dates", () => {
  assert.equal(parseOptionalDateOfBirth(""), null);
  assert.equal(parseOptionalDateOfBirth("not-a-date"), undefined);
  assert.equal(parseOptionalDateOfBirth("2026-02-31"), undefined);
  assert.equal(parseOptionalDateOfBirth("2999-01-01"), undefined);
});
