"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedEmail =
      window.sessionStorage.getItem("ahso.passwordResetEmail") ?? "";
    const frame = window.requestAnimationFrame(() => setEmail(storedEmail));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const otp = String(formData.get("otp") ?? "").replace(/\D/g, "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (otp.length !== 6) {
      setMessage("OTP phải gồm đúng 6 chữ số.");
      setIsPending(false);
      return;
    }

    if (password.length < 12 || password.length > 128) {
      setMessage("Mật khẩu mới phải từ 12 đến 128 ký tự.");
      setIsPending(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      setIsPending(false);
      return;
    }

    const result = await authClient.emailOtp.resetPassword({
      email: email.trim().toLowerCase(),
      otp,
      password,
    });

    if (result.error) {
      setMessage(
        result.error.code === "TOO_MANY_ATTEMPTS"
          ? "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu OTP mới."
          : "OTP không đúng, đã hết hạn hoặc mật khẩu chưa hợp lệ.",
      );
      setIsPending(false);
      return;
    }

    window.sessionStorage.removeItem("ahso.passwordResetEmail");
    window.sessionStorage.removeItem("ahso.passwordResetOtpSentAt");
    router.replace("/login?passwordChanged=1");
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="resetPasswordEmail">Email</label>
        <input
          id="resetPasswordEmail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="field-group">
        <label htmlFor="resetOtp">Mã OTP</label>
        <input
          className="otp-input"
          id="resetOtp"
          name="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
        />
      </div>
      <div className="field-group">
        <label htmlFor="newPassword">Mật khẩu mới</label>
        <input
          id="newPassword"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </div>
      <div className="field-group">
        <label htmlFor="confirmNewPassword">Xác nhận mật khẩu mới</label>
        <input
          id="confirmNewPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
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
        {isPending ? "Đang cập nhật..." : "Đặt mật khẩu mới"}
      </button>
      <Link className="back-link" href="/forgot-password">
        Yêu cầu OTP mới
      </Link>
    </form>
  );
}
