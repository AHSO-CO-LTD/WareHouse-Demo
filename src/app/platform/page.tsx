import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { PlatformAccountForm } from "@/components/platform/platform-account-form";
import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";

export const metadata = {
  title: "Quản trị platform | AHSO Warehouse",
};

export default async function PlatformPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.mustChangePassword) {
    redirect("/change-password");
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
          <BrandLogo />
          <strong>Platform Control</strong>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <section className="app-placeholder-content">
        <h1>Quản trị demo</h1>
        {user.role === AUTH_ROLES.PLATFORM_DEV ? (
          <div className="platform-tool">
            <div>
              <h2>Tạo tài khoản DEV hoặc ADMIN</h2>
            </div>
            <PlatformAccountForm />
          </div>
        ) : null}
      </section>
    </main>
  );
}
