import { AuthPage } from "@/components/auth/auth-page";
import { EmailOtpForm } from "@/components/auth/email-otp-form";

export const metadata = {
  title: "Xác minh email | AHSO Warehouse",
};

export default function VerifyEmailPage() {
  return (
    <AuthPage
      eyebrow="Bước 2 / 2"
      title="Kiểm tra email."
      description="Nhập mã OTP gồm 6 chữ số. Bạn có thể dán cả mã và không cần mở liên kết trên cùng thiết bị."
    >
      <EmailOtpForm />
    </AuthPage>
  );
}
