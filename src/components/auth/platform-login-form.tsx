"use client";

import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth/client";

export function PlatformLoginForm() {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/platform",
    });

    if (result.error) {
      setErrorMessage("Email hoặc mật khẩu không đúng.");
      setIsPending(false);
    }
  }

  return (
    <form className="platform-login-form" onSubmit={handleSubmit}>
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
        <label htmlFor="password">Mật khẩu</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={12}
          required
        />
      </div>
      {errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button
        className="primary-button primary-button--full"
        disabled={isPending}
      >
        {isPending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
    </form>
  );
}
