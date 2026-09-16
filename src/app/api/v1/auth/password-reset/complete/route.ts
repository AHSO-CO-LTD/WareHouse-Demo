import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getServerEnv } from "@/config/server-env";
import {
  clearPasswordResetGrantCookieOptions,
  COOKIE_NAME,
  readPasswordResetGrant,
} from "@/lib/server/password-reset-grant";
import { auth } from "@/lib/server/auth";

export const runtime = "nodejs";

const completePasswordResetSchema = z
  .object({
    password: z.string().min(12).max(128),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
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

  const grant = readPasswordResetGrant(
    request.cookies.get(COOKIE_NAME)?.value,
    env.BETTER_AUTH_SECRET,
  );

  if (!grant) {
    const response = errorResponse(
      401,
      "PASSWORD_RESET_VERIFICATION_REQUIRED",
      "Hãy xác minh OTP trước khi đặt mật khẩu mới.",
    );
    response.cookies.set(COOKIE_NAME, "", clearPasswordResetGrantCookieOptions(env));
    return response;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "VALIDATION_ERROR", "Dữ liệu mật khẩu không hợp lệ.");
  }

  const parsed = completePasswordResetSchema.safeParse(payload);

  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Mật khẩu phải từ 12 đến 128 ký tự và trùng khớp xác nhận.",
    );
  }

  try {
    await auth.api.resetPasswordEmailOTP({
      headers: request.headers,
      body: {
        email: grant.email,
        otp: grant.otp,
        password: parsed.data.password,
      },
    });
  } catch {
    const response = errorResponse(
      400,
      "PASSWORD_RESET_FAILED",
      "Quyền đặt lại mật khẩu đã hết hạn. Hãy yêu cầu OTP mới.",
    );
    response.cookies.set(COOKIE_NAME, "", clearPasswordResetGrantCookieOptions(env));
    return response;
  }

  const response = NextResponse.json({
    status: 200,
    data: { passwordChanged: true },
    message: "Đặt mật khẩu mới thành công.",
    error: null,
  });
  response.cookies.set(COOKIE_NAME, "", clearPasswordResetGrantCookieOptions(env));

  return response;
}
