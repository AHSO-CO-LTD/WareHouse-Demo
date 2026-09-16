import { toNextJsHandler } from "better-auth/next-js";

import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { auth } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

const handlers = toNextJsHandler(auth);

async function handleAuthenticatedRoute(
  request: Request,
  handler: (request: Request) => Promise<Response>,
) {
  const pathname = new URL(request.url).pathname;
  const isAdminPath = pathname.startsWith("/api/auth/admin/");

  if (isAdminPath) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (session?.user.mustChangePassword) {
      return Response.json(
        {
          code: "PASSWORD_CHANGE_REQUIRED",
          message: "Bạn phải đổi mật khẩu tạm thời trước khi tiếp tục.",
        },
        { status: 403 },
      );
    }
  }

  if (pathname === "/api/auth/admin/set-role") {
    return Response.json(
      {
        code: "GUARDED_ROLE_CHANGE_REQUIRED",
        message:
          "Thay đổi vai trò phải dùng flow được bảo vệ bởi quy tắc DEV cuối cùng.",
      },
      { status: 403 },
    );
  }

  if (pathname === "/api/auth/admin/create-user") {
    const body = (await request
      .clone()
      .json()
      .catch(() => null)) as Record<string, unknown> | null;
    const role = body?.role;
    const password = body?.password;
    const data = body?.data as Record<string, unknown> | undefined;
    const roleIsAllowed =
      role === AUTH_ROLES.PLATFORM_ADMIN || role === AUTH_ROLES.PLATFORM_DEV;
    const passwordIsAllowed =
      typeof password === "string" &&
      password.length >= 12 &&
      password.length <= 128;

    if (
      !roleIsAllowed ||
      !passwordIsAllowed ||
      data?.emailVerified !== true ||
      data?.mustChangePassword !== true
    ) {
      return Response.json(
        {
          code: "INVALID_PLATFORM_ACCOUNT",
          message:
            "Tài khoản platform phải dùng vai trò hợp lệ, mật khẩu tạm thời 12–128 ký tự và bắt buộc đổi mật khẩu.",
        },
        { status: 400 },
      );
    }
  }

  if (pathname === "/api/auth/admin/update-user") {
    const body = (await request
      .clone()
      .json()
      .catch(() => null)) as Record<string, unknown> | null;
    const data = body?.data as Record<string, unknown> | undefined;
    const userId = typeof body?.userId === "string" ? body.userId : "";

    if (data && Object.hasOwn(data, "role")) {
      return Response.json(
        {
          code: "GUARDED_ROLE_CHANGE_REQUIRED",
          message:
            "Thay đổi vai trò phải dùng flow được bảo vệ bởi quy tắc DEV cuối cùng.",
        },
        { status: 403 },
      );
    }

    const changesBanState =
      data &&
      ["banned", "banReason", "banExpires"].some((key) =>
        Object.hasOwn(data, key),
      );

    if (changesBanState && userId) {
      const target = await db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (target?.role === AUTH_ROLES.PLATFORM_DEV) {
        return Response.json(
          {
            code: "GUARDED_DEV_CHANGE_REQUIRED",
            message:
              "Không thể thay đổi trạng thái khóa của DEV bằng API chung.",
          },
          { status: 403 },
        );
      }
    }
  }

  if (pathname === "/api/auth/admin/ban-user") {
    const body = (await request
      .clone()
      .json()
      .catch(() => null)) as Record<string, unknown> | null;
    const userId = typeof body?.userId === "string" ? body.userId : "";

    if (userId) {
      const target = await db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (target?.role === AUTH_ROLES.PLATFORM_DEV) {
        return Response.json(
          {
            code: "GUARDED_DEV_CHANGE_REQUIRED",
            message:
              "Không thể khóa tài khoản DEV bằng API chung. Hãy dùng flow quản trị DEV được bảo vệ.",
          },
          { status: 403 },
        );
      }
    }
  }

  return handler(request);
}

export function GET(request: Request) {
  return handleAuthenticatedRoute(request, handlers.GET);
}

export function POST(request: Request) {
  return handleAuthenticatedRoute(request, handlers.POST);
}
