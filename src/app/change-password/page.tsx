import { redirect } from "next/navigation";

import { AuthPage } from "@/components/auth/auth-page";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { getCurrentUser } from "@/data/current-user";

export const metadata = {
  title: "Đổi mật khẩu bắt buộc | AHSO Warehouse",
};

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.mustChangePassword) {
    redirect("/auth/continue");
  }

  return (
    <AuthPage
      title="Đổi mật khẩu"
    >
      <ChangePasswordForm />
    </AuthPage>
  );
}
