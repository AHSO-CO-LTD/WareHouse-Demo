import "server-only";

import { parseServerEnv, type ServerEnv } from "@/config/server-env-schema";

let cachedServerEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cachedServerEnv ??= parseServerEnv(process.env);

  return cachedServerEnv;
}
