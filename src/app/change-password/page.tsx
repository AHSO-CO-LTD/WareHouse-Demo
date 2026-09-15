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
      eyebrow="Bảo vệ tài khoản"
      title="Đổi mật khẩu lần đầu."
      description="Mật khẩu hiện tại chỉ dùng để bootstrap. Hãy đổi mật khẩu trước khi sử dụng chức năng quản trị."
    >
      <ChangePasswordForm />
    </AuthPage>
  );
}
