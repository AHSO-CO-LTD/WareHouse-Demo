import { AuthPage } from "@/components/auth/auth-page";
import { RegistrationForm } from "@/components/auth/registration-form";

export const metadata = {
  title: "Đăng ký dùng thử | AHSO Warehouse",
};

export default function RegisterPage() {
  return (
    <AuthPage
      title="Tạo tài khoản"
      wide
    >
      <RegistrationForm />
    </AuthPage>
  );
}
