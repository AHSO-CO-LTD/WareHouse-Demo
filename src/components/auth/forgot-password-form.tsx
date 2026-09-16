"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const result = await authClient.emailOtp.requestPasswordReset({ email });

    if (result.error) {
      setMessage(
        result.error.status === 429
          ? "Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau."
          : "Chưa thể xử lý yêu cầu. Vui lòng thử lại.",
      );
      setIsPending(false);
      return;
    }

    window.sessionStorage.setItem("ahso.passwordResetEmail", email);
    window.sessionStorage.setItem(
      "ahso.passwordResetOtpSentAt",
      String(Date.now()),
    );
    router.push("/verify-reset-otp");
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <Label htmlFor="resetEmail">Email đăng nhập</Label>
        <Input
          id="resetEmail"
          name="email"
          type="email"
          className="h-12"
          autoComplete="email"
          required
          autoFocus
        />
        <small>
          Nếu tài khoản tồn tại, hệ thống sẽ gửi một OTP có hiệu lực 10 phút.
        </small>
      </div>
      {message ? (
        <p className="form-message form-message--error" role="alert">
          {message}
        </p>
      ) : null}
      <Button
        className="h-12 w-full"
        disabled={isPending}
      >
        {isPending ? "Đang gửi..." : "Gửi OTP đặt lại mật khẩu"}
      </Button>
      <Link className="back-link" href="/login">
        Quay lại đăng nhập
      </Link>
    </form>
  );
}
