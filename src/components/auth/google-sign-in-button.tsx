"use client";

import { useState } from "react";

import { authClient } from "@/lib/auth/client";

export function GoogleSignInButton() {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignIn() {
    setIsPending(true);
    setErrorMessage(null);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/onboarding",
    });

    if (result.error) {
      setErrorMessage(
        "Không thể kết nối Google. Vui lòng thử lại hoặc liên hệ AHSO.",
      );
      setIsPending(false);
    }
  }

  return (
    <div className="auth-action">
      <button
        className="primary-button"
        type="button"
        onClick={handleSignIn}
        disabled={isPending}
      >
        <span className="google-mark" aria-hidden="true">
          G
        </span>
        {isPending ? "Đang kết nối..." : "Dùng thử với Google"}
      </button>
      {errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
