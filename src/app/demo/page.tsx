import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { db } from "@/lib/server/db";

export const metadata = {
  title: "Kho demo | AHSO Warehouse",
};

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
    },
  });

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <main className="app-placeholder-shell">
      <header className="app-placeholder-header">
        <div>
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <strong>{workspace.displayName}</strong>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <section className="app-placeholder-content">
        <p className="eyebrow">Không gian demo đã sẵn sàng</p>
        <h1>Nền tảng vận hành kho đang được xây dựng.</h1>
        <p>
          Bước nền đã kết nối tài khoản, workspace riêng, quota và vòng đời 30
          ngày. Module kho sẽ được triển khai ở pha tiếp theo.
        </p>
      </section>
    </main>
  );
}
