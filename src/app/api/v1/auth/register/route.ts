import { z } from "zod";

import { CURRENT_POLICIES } from "@/config/policies";
import {
  normalizeEmail,
  normalizePhoneNumber,
  parseOptionalDateOfBirth,
} from "@/lib/auth/registration";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { auth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Vui lòng nhập họ tên từ 2 ký tự.")
      .max(100, "Họ tên không được vượt quá 100 ký tự."),
    email: z
      .email({ error: "Email không đúng định dạng." })
      .max(254, "Email không được vượt quá 254 ký tự."),
    callingCode: z
      .string()
      .trim()
      .regex(/^\+\d{1,3}$/, "Mã quốc gia không hợp lệ."),
    phoneNumber: z
      .string()
      .trim()
      .min(7, "Vui lòng nhập số điện thoại hợp lệ.")
      .max(24, "Số điện thoại không được vượt quá 24 ký tự."),
    companyName: z
      .string()
      .trim()
      .max(120, "Tên công ty không được vượt quá 120 ký tự."),
    dateOfBirth: z.string().trim().max(10, "Ngày sinh không đúng định dạng."),
    password: z
      .string()
      .min(12, "Mật khẩu phải có ít nhất 12 ký tự.")
      .max(128, "Mật khẩu không được vượt quá 128 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu."),
    acceptTerms: z.literal(true, {
      error: "Bạn cần đồng ý với Điều khoản sử dụng.",
    }),
    acceptPrivacy: z.literal(true, {
      error: "Bạn cần đồng ý với Chính sách bảo mật.",
    }),
    marketingEmailConsent: z.boolean().default(false),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp.",
  });

function errorResponse(
  status: number,
  code: string,
  message: string,
  fieldErrors: Record<string, string[]> | null = null,
) {
  return Response.json(
    {
      status,
      data: null,
      message,
      error: {
        code,
        details: null,
        fieldErrors,
      },
    },
    { status },
  );
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Dữ liệu đăng ký không hợp lệ.",
    );
  }

  const parsed = registerSchema.safeParse(payload);

  if (!parsed.success) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Vui lòng kiểm tra lại thông tin đăng ký.",
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const email = normalizeEmail(parsed.data.email);
  const phoneNumber = normalizePhoneNumber(
    parsed.data.phoneNumber,
    parsed.data.callingCode,
  );
  const dateOfBirth = parseOptionalDateOfBirth(parsed.data.dateOfBirth);

  if (!phoneNumber) {
    return errorResponse(
      400,
      "VALIDATION_ERROR",
      "Số điện thoại không hợp lệ.",
      {
        phoneNumber: ["Vui lòng nhập số điện thoại hợp lệ."],
      },
    );
  }

  if (dateOfBirth === undefined) {
    return errorResponse(400, "VALIDATION_ERROR", "Ngày sinh không hợp lệ.", {
      dateOfBirth: ["Ngày sinh phải trong quá khứ và không quá 120 năm."],
    });
  }

  const existingUser = await db.user.findFirst({
    where: {
      OR: [{ email }, { phoneNumber }],
    },
    select: {
      email: true,
      phoneNumber: true,
      emailVerified: true,
    },
  });

  if (existingUser?.email === email) {
    const verificationPending = !existingUser.emailVerified;

    return errorResponse(
      409,
      verificationPending
        ? "EMAIL_VERIFICATION_PENDING"
        : "EMAIL_ALREADY_EXISTS",
      verificationPending
        ? "Email đang chờ xác minh. Hãy nhập OTP hoặc yêu cầu gửi lại mã."
        : "Email đã được đăng ký. Hãy đăng nhập hoặc đặt lại mật khẩu.",
      { email: ["Email này đã được sử dụng."] },
    );
  }

  if (existingUser?.phoneNumber === phoneNumber) {
    return errorResponse(
      409,
      "PHONE_ALREADY_EXISTS",
      "Số điện thoại đã được sử dụng cho một tài khoản khác.",
      { phoneNumber: ["Số điện thoại này đã được sử dụng."] },
    );
  }

  try {
    const registrationResult = await auth.api.signUpEmail({
      headers: request.headers,
      body: {
        name: parsed.data.name,
        email,
        password: parsed.data.password,
        phoneNumber,
        ...(parsed.data.companyName
          ? { companyName: parsed.data.companyName }
          : {}),
        ...(dateOfBirth ? { dateOfBirth } : {}),
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        termsVersion: CURRENT_POLICIES.terms.version,
        privacyVersion: CURRENT_POLICIES.privacy.version,
        marketingEmailConsent: parsed.data.marketingEmailConsent,
      },
    });

    void db.auditLog
      .create({
        data: {
          actorUserId: registrationResult.user.id,
          action: "auth.registration.create",
          resource: "user",
          resourceId: registrationResult.user.id,
          result: "SUCCESS",
          metadata: { role: AUTH_ROLES.DEMO_USER },
          ipAddress:
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
            request.headers.get("x-real-ip"),
          userAgent: request.headers.get("user-agent"),
        },
      })
      .catch((error: unknown) => {
        console.error(
          JSON.stringify({
            level: "error",
            source: "registration-audit",
            message: "Registration audit write failed",
            errorType: error instanceof Error ? error.name : "UNKNOWN_ERROR",
          }),
        );
      });
  } catch (error) {
    const code =
      typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "";

    if (code === "P2002") {
      return errorResponse(
        409,
        "IDENTITY_ALREADY_EXISTS",
        "Email hoặc số điện thoại đã được sử dụng.",
      );
    }

    try {
      const createdUser = await db.user.findUnique({
        where: { email },
        select: { emailVerified: true },
      });

      if (createdUser && !createdUser.emailVerified) {
        return Response.json(
          {
            status: 202,
            data: { email, otpSent: false },
            message:
              "Tài khoản đã được tạo nhưng OTP chưa gửi thành công. Hãy yêu cầu gửi lại mã tại bước xác minh.",
            error: null,
          },
          { status: 202 },
        );
      }
    } catch {
      // Keep the public response generic when both registration and recovery checks fail.
    }

    console.error(
      JSON.stringify({
        level: "error",
        source: "registration",
        message: "Registration failed",
        errorType: error instanceof Error ? error.name : "UNKNOWN_ERROR",
      }),
    );

    return errorResponse(
      503,
      "REGISTRATION_UNAVAILABLE",
      "Chưa thể hoàn tất đăng ký hoặc gửi OTP. Vui lòng thử lại.",
    );
  }

  return Response.json(
    {
      status: 201,
      data: { email, otpSent: true },
      message: "Đăng ký thành công. Vui lòng kiểm tra email để nhận OTP.",
      error: null,
    },
    { status: 201 },
  );
}
