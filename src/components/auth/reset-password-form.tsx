"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

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

    const response = await fetch("/api/v1/auth/password-reset/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, confirmPassword }),
    });
    const result = (await response.json()) as { message?: string };

    if (!response.ok) {
      setMessage(result.message ?? "Chưa thể đặt mật khẩu mới. Vui lòng thử lại.");
      setIsPending(false);
      return;
    }

    router.replace("/login?passwordChanged=1");
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div className="field-group">
        <Label htmlFor="newPassword">Mật khẩu mới</Label>
        <Input
          id="newPassword"
          name="password"
          type="password"
          className="h-12"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
          autoFocus
        />
      </div>
      <div className="field-group">
        <Label htmlFor="confirmNewPassword">Xác nhận mật khẩu mới</Label>
        <Input
          id="confirmNewPassword"
          name="confirmPassword"
          type="password"
          className="h-12"
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
      <p className="form-message" role="note">
        Đặt mật khẩu mới sẽ đăng xuất mọi phiên hiện có.
      </p>
      <Button
        className="h-12 w-full"
        disabled={isPending}
      >
        {isPending ? "Đang cập nhật..." : "Đặt mật khẩu mới"}
      </Button>
      <Link className="back-link" href="/forgot-password">
        Yêu cầu OTP mới
      </Link>
    </form>
  );
}
