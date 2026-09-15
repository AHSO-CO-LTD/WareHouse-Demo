import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

import { parseServerEnv } from "@/config/server-env-schema";
import { PrismaClient } from "@/generated/prisma/client";
import { createAuth } from "@/lib/auth/create-auth";

config({ path: [".env.local", ".env"], quiet: true });

const env = parseServerEnv(process.env);
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const database = new PrismaClient({ adapter });

export const auth = createAuth(database, env);
