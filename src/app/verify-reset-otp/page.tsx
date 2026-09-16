import { AuthPage } from "@/components/auth/auth-page";
import { VerifyResetOtpForm } from "@/components/auth/verify-reset-otp-form";

export const metadata = {
  title: "Xác minh OTP | AHSO Warehouse",
};

export default function VerifyResetOtpPage() {
  return (
    <AuthPage title="Xác minh OTP">
      <VerifyResetOtpForm />
    </AuthPage>
  );
}
