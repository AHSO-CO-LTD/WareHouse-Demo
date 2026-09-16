import { getServerEnv } from "@/config/server-env";
import { hasValidInternalJobSecret } from "@/lib/server/internal-job";
import { db } from "@/lib/server/db";
import { processDueWorkspaceLifecycle } from "@/lib/server/workspace-lifecycle";

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

  const report = await processDueWorkspaceLifecycle(db);

  return Response.json({
    status: 200,
    data: report,
    message: "Đã xử lý vòng đời bản dùng thử đến hạn.",
    error: null,
  });
}
