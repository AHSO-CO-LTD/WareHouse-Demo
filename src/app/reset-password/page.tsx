import { AuthPage } from "@/components/auth/auth-page";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = {
  title: "Đặt lại mật khẩu | AHSO Warehouse",
};

export default function ResetPasswordPage() {
  return (
    <AuthPage
      eyebrow="OTP bảo mật"
      title="Tạo mật khẩu mới."
      description="Nhập OTP trong email và chọn mật khẩu mới. Mọi phiên đăng nhập cũ sẽ bị thu hồi."
    >
      <ResetPasswordForm />
    </AuthPage>
  );
}
