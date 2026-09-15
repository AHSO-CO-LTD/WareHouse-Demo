import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";

export const metadata = {
  title: "Quản trị platform | AHSO Warehouse",
};

export default async function PlatformPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/platform/login");
  }

  if (
    user.role !== AUTH_ROLES.PLATFORM_ADMIN &&
    user.role !== AUTH_ROLES.PLATFORM_DEV
  ) {
    redirect("/demo");
  }

  return (
    <main className="app-placeholder-shell">
      <header className="app-placeholder-header">
        <div>
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <strong>Platform Control</strong>
        </div>
        <ThemeToggle />
      </header>
      <section className="app-placeholder-content">
        <p className="eyebrow">{user.role}</p>
        <h1>Quản trị bản demo AHSO Warehouse.</h1>
        <p>
          Tài khoản platform đã được tách khỏi workspace người dùng. Support
          Mode sẽ yêu cầu lý do, có thời hạn và ghi audit đầy đủ.
        </p>
      </section>
    </main>
  );
}
