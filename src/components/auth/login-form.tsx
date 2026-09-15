"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

export function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);
    setUnverifiedEmail(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const result = await authClient.signIn.email({ email, password });

    if (result.error) {
      if (result.error.code === "EMAIL_NOT_VERIFIED") {
        window.sessionStorage.setItem("ahso.pendingVerificationEmail", email);
        setUnverifiedEmail(email);
        setErrorMessage("Email chưa được xác minh.");
      } else {
        setErrorMessage("Email hoặc mật khẩu không đúng.");
      }
      setIsPending(false);
      return;
    }

    router.replace("/auth/continue");
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {notice ? (
        <div className="form-message" role="status">
          <span>{notice}</span>
        </div>
      ) : null}
      <div className="field-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </div>
      <div className="field-group">
        <div className="field-label-row">
          <label htmlFor="password">Mật khẩu</label>
          <Link href="/forgot-password">Quên mật khẩu?</Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {errorMessage ? (
        <div className="form-message form-message--error" role="alert">
          <span>{errorMessage}</span>
          {unverifiedEmail ? (
            <Link href="/verify-email">Nhập hoặc gửi lại OTP</Link>
          ) : null}
        </div>
      ) : null}
      <button
        className="primary-button primary-button--full"
        disabled={isPending}
      >
        {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <p className="form-footnote">
        Chưa có tài khoản? <Link href="/register">Đăng ký dùng thử</Link>
      </p>
    </form>
  );
}
