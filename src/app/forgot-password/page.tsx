import { AuthPage } from "@/components/auth/auth-page";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = {
  title: "Quên mật khẩu | AHSO Warehouse",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPage
      eyebrow="Khôi phục tài khoản"
      title="Đặt lại mật khẩu."
      description="Nhập email đăng nhập. Chúng tôi sẽ gửi OTP nếu tài khoản hợp lệ."
    >
      <ForgotPasswordForm />
    </AuthPage>
  );
}
