import { AuthPage } from "@/components/auth/auth-page";
import { RegistrationForm } from "@/components/auth/registration-form";

export const metadata = {
  title: "Đăng ký dùng thử | AHSO Warehouse",
};

export default function RegisterPage() {
  return (
    <AuthPage
      eyebrow="Bắt đầu bản demo"
      title="Tạo tài khoản."
      description="Chỉ mất một bước đăng ký và một mã OTP. 30 ngày dùng thử chỉ bắt đầu sau khi bạn hoàn tất khởi tạo kho."
      wide
    >
      <RegistrationForm />
    </AuthPage>
  );
}
