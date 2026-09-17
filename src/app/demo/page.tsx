import { redirect } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { WorkspaceNavbar } from "@/components/workspace-navbar";
import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { db } from "@/lib/server/db";
import { getWorkspaceAccessState } from "@/lib/server/workspace-lifecycle";

export const metadata = {
  title: "Kho demo | AHSO Warehouse",
};

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function getStatusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Đang hoạt động";
    case "READ_ONLY":
      return "Chỉ xem";
    case "PURGE_PENDING":
      return "Chờ xóa";
    case "PURGED":
      return "Đã kết thúc";
    default:
      return "Chưa khởi tạo";
  }
}

export default async function DemoPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  if (user.role !== AUTH_ROLES.DEMO_USER) {
    redirect("/platform");
  }

  const workspace = await db.workspace.findUnique({
    where: { ownerUserId: user.id },
    select: {
      displayName: true,
      status: true,
      expiresAt: true,
      purgeAt: true,
    },
  });

  if (!workspace) {
    redirect("/onboarding");
  }

  const access = getWorkspaceAccessState(workspace);
  const isActive = access.status === "ACTIVE";

  return (
    <main className="app-placeholder-shell">
      <WorkspaceNavbar workspaceName={workspace.displayName} />
      <section className="app-placeholder-content">
        <h1>{isActive ? "Kho đang sẵn sàng." : "Kho ở chế độ xem."}</h1>
        <Alert className="app-placeholder-status">
          <AlertTitle className="flex items-center gap-3">
            <Badge variant={isActive ? "default" : "outline"}>
              {getStatusLabel(access.status)}
            </Badge>
            <span>{access.message}</span>
          </AlertTitle>
          <AlertDescription>
            {isActive && workspace.expiresAt
              ? `Dùng thử đến ${dateFormatter.format(workspace.expiresAt)}.`
              : workspace.purgeAt
                ? `Dữ liệu nghiệp vụ được xử lý theo chính sách vào ${dateFormatter.format(workspace.purgeAt)}.`
                : null}
          </AlertDescription>
        </Alert>
      </section>
    </main>
  );
}
