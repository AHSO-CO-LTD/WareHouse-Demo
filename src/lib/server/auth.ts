import "server-only";

import { getServerEnv } from "@/config/server-env";
import { createAuth } from "@/lib/auth/create-auth";
import { db } from "@/lib/server/db";

export const auth = createAuth(db, getServerEnv());

export type AuthSession = typeof auth.$Infer.Session;
