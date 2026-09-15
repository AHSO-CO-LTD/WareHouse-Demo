import { z } from "zod";

const positiveIntegerFromString = z.coerce.number().int().positive();
const booleanFromString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.toLowerCase() === "true";
}, z.boolean());

export const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.url(),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: positiveIntegerFromString,
  SMTP_SECURE: booleanFromString.default(false),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().min(3),
  INTERNAL_JOB_SECRET: z.string().min(32),
  DEMO_DURATION_DAYS: positiveIntegerFromString.default(30),
  DEMO_GRACE_DAYS: positiveIntegerFromString.default(7),
  UNVERIFIED_ACCOUNT_RETENTION_DAYS: positiveIntegerFromString.default(7),
  SUPPORT_SESSION_MINUTES: positiveIntegerFromString.default(30),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(environment: NodeJS.ProcessEnv): ServerEnv {
  return serverEnvSchema.parse(environment);
}
