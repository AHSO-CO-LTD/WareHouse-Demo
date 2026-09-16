import { AuthPage } from "@/components/auth/auth-page";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Quên mật khẩu | AHSO Warehouse",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      title="Đặt lại mật khẩu"
    >
      <ForgotPasswordForm />
    </AuthPage>
  );
}
