"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
    router.push("/reset-password");
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="resetEmail">Email đăng nhập</label>
        <input
          id="resetEmail"
          name="email"
          type="email"
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
      <button
        className="primary-button primary-button--full"
        disabled={isPending}
      >
        {isPending ? "Đang gửi..." : "Gửi OTP đặt lại mật khẩu"}
      </button>
      <Link className="back-link" href="/login">
        Quay lại đăng nhập
      </Link>
    </form>
  );
}
