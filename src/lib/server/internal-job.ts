import "server-only";

import { timingSafeEqual } from "node:crypto";

export function hasValidInternalJobSecret(
  request: Request,
  expectedSecret: string,
): boolean {
  const authorization = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${expectedSecret}`;
  const receivedBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
