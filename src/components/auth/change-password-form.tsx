"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { authClient } from "@/lib/auth/client";

export function ChangePasswordForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (newPassword.length < 12 || newPassword.length > 128) {
      setMessage("Mật khẩu mới phải từ 12 đến 128 ký tự.");
      setIsPending(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      setIsPending(false);
      return;
    }

    if (newPassword === currentPassword) {
      setMessage("Mật khẩu mới phải khác mật khẩu hiện tại.");
      setIsPending(false);
      return;
    }

    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });

    if (result.error) {
      setMessage("Mật khẩu hiện tại không đúng hoặc mật khẩu mới chưa hợp lệ.");
      setIsPending(false);
      return;
    }

    router.replace("/auth/continue");
    router.refresh();
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <label htmlFor="currentPassword">Mật khẩu tạm thời</label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
        />
      </div>
      <div className="field-group">
        <label htmlFor="mandatoryNewPassword">Mật khẩu mới</label>
        <input
          id="mandatoryNewPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
        <small>Từ 12 đến 128 ký tự và khác mật khẩu tạm thời.</small>
      </div>
      <div className="field-group">
        <label htmlFor="mandatoryConfirmPassword">Xác nhận mật khẩu mới</label>
        <input
          id="mandatoryConfirmPassword"
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
        {isPending ? "Đang đổi mật khẩu..." : "Đổi mật khẩu và tiếp tục"}
      </button>
      <SignOutButton
        className="secondary-button"
        onPendingChange={setIsPending}
      />
    </form>
  );
}
