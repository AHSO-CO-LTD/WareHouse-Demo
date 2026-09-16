import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getServerEnv } from "@/config/server-env";
import { AuthPage } from "@/components/auth/auth-page";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { COOKIE_NAME, readPasswordResetGrant } from "@/lib/server/password-reset-grant";

export const metadata = {
  title: "Đặt lại mật khẩu | AHSO Warehouse",
};

export default async function ResetPasswordPage() {
  const env = getServerEnv();
  const cookieStore = await cookies();
  const grant = readPasswordResetGrant(
    cookieStore.get(COOKIE_NAME)?.value,
    env.BETTER_AUTH_SECRET,
  );

  if (!grant) {
    redirect("/forgot-password");
  }

  return (
    <AuthPage
      title="Tạo mật khẩu mới"
    >
      <ResetPasswordForm />
    </AuthPage>
  );
}
