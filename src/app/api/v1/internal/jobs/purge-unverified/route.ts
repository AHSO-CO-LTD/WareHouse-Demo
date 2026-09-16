import { getServerEnv } from "@/config/server-env";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { db } from "@/lib/server/db";
import { hasValidInternalJobSecret } from "@/lib/server/internal-job";

export async function POST(request: Request) {
  const env = getServerEnv();

  if (!hasValidInternalJobSecret(request, env.INTERNAL_JOB_SECRET)) {
    return Response.json(
      {
        status: 401,
        data: null,
        message: "Không được phép thực hiện tác vụ.",
        error: {
          code: "PERMISSION_DENIED",
          details: null,
          fieldErrors: null,
        },
      },
      { status: 401 },
    );
  }

  const cutoff = new Date();
  cutoff.setUTCDate(
    cutoff.getUTCDate() - env.UNVERIFIED_ACCOUNT_RETENTION_DAYS,
  );

  const deletedCount = await db.$transaction(
    async (transaction) => {
      const candidateUsers = await transaction.user.findMany({
        where: {
          emailVerified: false,
          role: AUTH_ROLES.DEMO_USER,
          createdAt: { lt: cutoff },
          workspace: null,
        },
        select: { id: true, email: true },
        take: 500,
      });

      if (candidateUsers.length === 0) {
        return 0;
      }

      const deletedUsers = await transaction.user.deleteMany({
        where: {
          id: { in: candidateUsers.map(({ id }) => id) },
          emailVerified: false,
          role: AUTH_ROLES.DEMO_USER,
          createdAt: { lt: cutoff },
          workspace: null,
        },
      });

      if (deletedUsers.count !== candidateUsers.length) {
        throw new Error("UNVERIFIED_ACCOUNT_SET_CHANGED");
      }

      const identifiers = candidateUsers.flatMap(({ email }) => [
        `email-verification-otp-${email}`,
        `forget-password-otp-${email}`,
        `sign-in-otp-${email}`,
        `change-email-otp-${email}`,
      ]);

      await transaction.verification.deleteMany({
        where: { identifier: { in: identifiers } },
      });
      await transaction.auditLog.create({
        data: {
          action: "auth.unverified.purge",
          resource: "user",
          result: "SUCCESS",
          metadata: {
            count: deletedUsers.count,
            retentionDays: env.UNVERIFIED_ACCOUNT_RETENTION_DAYS,
          },
        },
      });

      return deletedUsers.count;
    },
    {
      isolationLevel: "Serializable",
    },
  );

  return Response.json({
    status: 200,
    data: { deletedCount },
    message: "Đã xử lý tài khoản chưa xác minh hết hạn.",
    error: null,
  });
}
