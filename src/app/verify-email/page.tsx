import { AuthPage } from "@/components/auth/auth-page";
import { EmailOtpForm } from "@/components/auth/email-otp-form";

export const metadata = {
  title: "Xác minh email | AHSO Warehouse",
};

export default function VerifyEmailPage() {
  return (
    <AuthPage
      title="Xác minh email"
    >
      <EmailOtpForm />
    </AuthPage>
  );
}
