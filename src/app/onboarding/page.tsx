import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandLogo } from "@/components/brand-logo";
import { WorkspaceForm } from "@/components/onboarding/workspace-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/data/current-user";
import { AUTH_ROLES } from "@/lib/auth/platform-access";
import { db } from "@/lib/server/db";

export const metadata = {
  title: "Khởi tạo bản demo | AHSO Warehouse",
};

export default async function OnboardingPage() {
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
    select: { id: true },
  });

  if (workspace) {
    redirect("/demo");
  }

  return (
    <main className="onboarding-shell">
      <header className="onboarding-header">
        <div>
          <BrandLogo />
          <span>AHSO Warehouse</span>
        </div>
        <div className="header-actions">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>
      <section className="onboarding-layout">
        <div className="onboarding-intro">
          <h1>Tạo kho demo</h1>
        </div>
        <div className="onboarding-form-panel">
          <WorkspaceForm
            name={user.name}
            email={user.email}
            phoneNumber={user.phoneNumber}
            companyName={user.companyName}
          />
        </div>
      </section>
    </main>
  );
}
