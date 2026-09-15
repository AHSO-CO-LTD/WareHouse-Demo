import { z } from "zod";

const positiveIntegerFromString = z.coerce.number().int().positive();

export const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.url(),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  DEMO_DURATION_DAYS: positiveIntegerFromString.default(30),
  DEMO_GRACE_DAYS: positiveIntegerFromString.default(7),
  SUPPORT_SESSION_MINUTES: positiveIntegerFromString.default(30),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(environment: NodeJS.ProcessEnv): ServerEnv {
  return serverEnvSchema.parse(environment);
}
