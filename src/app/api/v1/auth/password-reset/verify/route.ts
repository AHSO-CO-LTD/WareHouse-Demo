import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/config/server-env";
import {
  COOKIE_NAME,
  createPasswordResetGrant,
  passwordResetGrantCookieOptions,
} from "@/lib/server/password-reset-grant";
import { auth } from "@/lib/server/auth";

export const runtime = "nodejs";

const verifyOtpSchema = z.object({
  email: z.email().max(254),
  otp: z.string().regex(/^\d{6}$/),
});

function errorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      status,
      data: null,
      message,
      error: { code, details: null, fieldErrors: null },
    },
    { status },
  );
}

function isSameOrigin(request: NextRequest, appUrl: string): boolean {
  return request.headers.get("origin") === new URL(appUrl).origin;
}

export async function POST(request: NextRequest) {
  const env = getServerEnv();

  if (!isSameOrigin(request, env.APP_URL)) {
    return errorResponse(403, "ORIGIN_NOT_ALLOWED", "Yêu cầu không hợp lệ.");
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "VALIDATION_ERROR", "Dữ liệu xác minh không hợp lệ.");
  }

  const parsed = verifyOtpSchema.safeParse(payload);

  if (!parsed.success) {
    return errorResponse(400, "VALIDATION_ERROR", "Mã OTP phải gồm 6 chữ số.");
  }

  const email = parsed.data.email.trim().toLowerCase();

  try {
    await auth.api.checkVerificationOTP({
      headers: request.headers,
      body: {
        email,
        otp: parsed.data.otp,
        type: "forget-password",
      },
    });
  } catch {
    return errorResponse(
      400,
      "OTP_INVALID",
      "Mã OTP không đúng, đã hết hạn hoặc đã vượt quá số lần thử.",
    );
  }

  const response = NextResponse.json({
    status: 200,
    data: { verified: true },
    message: "Xác minh OTP thành công.",
    error: null,
  });

  response.cookies.set(
    COOKIE_NAME,
    createPasswordResetGrant(email, parsed.data.otp, env.BETTER_AUTH_SECRET),
    passwordResetGrantCookieOptions(env),
  );

  return response;
}
