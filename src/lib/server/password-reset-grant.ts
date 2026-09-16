import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import type { ServerEnv } from "@/config/server-env-schema";

const COOKIE_NAME = "ahso.password-reset-grant";
const GRANT_TTL_SECONDS = 10 * 60;
const AAD = Buffer.from("ahso-password-reset-grant-v1", "utf8");

type PasswordResetGrant = {
  email: string;
  otp: string;
  expiresAt: number;
};

function getEncryptionKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}

function isPasswordResetGrant(value: unknown): value is PasswordResetGrant {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.email === "string" &&
    typeof candidate.otp === "string" &&
    /^\d{6}$/.test(candidate.otp) &&
    typeof candidate.expiresAt === "number" &&
    Number.isFinite(candidate.expiresAt)
  );
}

export function createPasswordResetGrant(
  email: string,
  otp: string,
  secret: string,
): string {
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(secret), initializationVector);
  cipher.setAAD(AAD);

  const payload = Buffer.from(
    JSON.stringify({
      email,
      otp,
      expiresAt: Date.now() + GRANT_TTL_SECONDS * 1_000,
    }),
    "utf8",
  );
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    initializationVector.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function readPasswordResetGrant(
  value: string | undefined,
  secret: string,
): PasswordResetGrant | null {
  if (!value) {
    return null;
  }

  const [initializationVectorValue, authTagValue, encryptedValue, ...extraParts] = value.split(".");
  if (
    extraParts.length > 0 ||
    !initializationVectorValue ||
    !authTagValue ||
    !encryptedValue
  ) {
    return null;
  }

  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getEncryptionKey(secret),
      Buffer.from(initializationVectorValue, "base64url"),
    );
    decipher.setAAD(AAD);
    decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]);
    const grant: unknown = JSON.parse(decrypted.toString("utf8"));

    if (!isPasswordResetGrant(grant) || grant.expiresAt <= Date.now()) {
      return null;
    }

    return grant;
  } catch {
    return null;
  }
}

export function passwordResetGrantCookieOptions(env: ServerEnv) {
  return {
    httpOnly: true,
    maxAge: GRANT_TTL_SECONDS,
    path: "/",
    sameSite: "strict" as const,
    secure: env.NODE_ENV === "production",
  };
}

export function clearPasswordResetGrantCookieOptions(env: ServerEnv) {
  return {
    ...passwordResetGrantCookieOptions(env),
    maxAge: 0,
  };
}

export { COOKIE_NAME };
