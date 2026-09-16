"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";

const EMAIL_STORAGE_KEY = "ahso.passwordResetEmail";
const SENT_AT_STORAGE_KEY = "ahso.passwordResetOtpSentAt";

type ApiErrorResponse = {
  message?: string;
};

export function VerifyResetOtpForm() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setEmail(window.sessionStorage.getItem(EMAIL_STORAGE_KEY) ?? "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedOtp = otp.replace(/\D/g, "").slice(0, 6);

    if (!email) {
      setMessage("Phiên yêu cầu OTP không còn. Hãy yêu cầu một mã mới.");
      return;
    }

    if (normalizedOtp.length !== 6) {
      setMessage("OTP phải gồm đúng 6 chữ số.");
      return;
    }

    setIsPending(true);
    setMessage(null);

    const response = await fetch("/api/v1/auth/password-reset/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, otp: normalizedOtp }),
    });
    const result = (await response.json()) as ApiErrorResponse;

    if (!response.ok) {
      setMessage(result.message ?? "Chưa thể xác minh OTP. Vui lòng thử lại.");
      setIsPending(false);
      return;
    }

    window.sessionStorage.removeItem(EMAIL_STORAGE_KEY);
    window.sessionStorage.removeItem(SENT_AT_STORAGE_KEY);
    router.replace("/reset-password");
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <Label htmlFor="resetOtpEmail">Email</Label>
        <Input
          id="resetOtpEmail"
          type="email"
          className="h-12"
          value={email ?? ""}
          readOnly
          aria-readonly="true"
        />
      </div>
      <div className="field-group">
        <Label htmlFor="resetOtp">Mã OTP</Label>
        <InputOTP
          id="resetOtp"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={setOtp}
          autoFocus
          required
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} />)}
          </InputOTPGroup>
        </InputOTP>
        <small>Mã có hiệu lực trong 10 phút.</small>
      </div>
      {message ? (
        <p className="form-message form-message--error" role="alert">
          {message}
        </p>
      ) : null}
      <Button className="h-12 w-full" disabled={isPending || email === null}>
        {isPending ? "Đang xác minh..." : "Xác minh OTP"}
      </Button>
      <Link className="back-link" href="/forgot-password">
        Yêu cầu OTP mới
      </Link>
    </form>
  );
}
