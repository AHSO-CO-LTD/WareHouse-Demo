"use client";

import { FormEvent, useRef, useState } from "react";

import { authClient } from "@/lib/auth/client";
import { AUTH_ROLES, type AuthRole } from "@/lib/auth/platform-access";

type AccountDraft = {
  name: string;
  email: string;
  password: string;
  role: Extract<AuthRole, "platform_dev" | "platform_admin">;
};

export function PlatformAccountForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<AccountDraft | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const role = String(formData.get("role"));

    if (
      role !== AUTH_ROLES.PLATFORM_DEV &&
      role !== AUTH_ROLES.PLATFORM_ADMIN
    ) {
      setIsError(true);
      setMessage("Vai trò không hợp lệ.");
      return;
    }

    setDraft({
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
      password: String(formData.get("password") ?? ""),
      role,
    });
  }

  async function confirmCreate() {
    if (!draft) {
      return;
    }

    setIsPending(true);
    const result = await authClient.admin.createUser({
      name: draft.name,
      email: draft.email,
      password: draft.password,
      role: draft.role,
      data: {
        emailVerified: true,
        mustChangePassword: true,
      },
    });

    if (result.error) {
      setIsError(true);
      setMessage(
        result.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
          ? "Email đã tồn tại. Không thể tạo thêm tài khoản."
          : "Chưa thể tạo tài khoản platform. Vui lòng thử lại.",
      );
      setIsPending(false);
      setDraft(null);
      return;
    }

    setIsError(false);
    setMessage(
      "Đã tạo tài khoản. Người dùng phải đổi mật khẩu trong lần đăng nhập đầu tiên.",
    );
    setIsPending(false);
    setDraft(null);
    formRef.current?.reset();
  }

  return (
    <>
      <form
        ref={formRef}
        className="auth-form platform-account-form"
        onSubmit={handleSubmit}
      >
        <div className="form-grid">
          <div className="field-group">
            <label htmlFor="platformName">Họ và tên</label>
            <input
              id="platformName"
              name="name"
              type="text"
              minLength={2}
              maxLength={100}
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="platformEmail">Email đăng nhập</label>
            <input
              id="platformEmail"
              name="email"
              type="email"
              autoComplete="off"
              required
            />
          </div>
          <div className="field-group">
            <label htmlFor="platformRole">Vai trò</label>
            <select
              id="platformRole"
              name="role"
              defaultValue={AUTH_ROLES.PLATFORM_ADMIN}
            >
              <option value={AUTH_ROLES.PLATFORM_ADMIN}>Platform ADMIN</option>
              <option value={AUTH_ROLES.PLATFORM_DEV}>Platform DEV</option>
            </select>
          </div>
          <div className="field-group">
            <label htmlFor="platformPassword">Mật khẩu tạm thời</label>
            <input
              id="platformPassword"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
          </div>
        </div>

        {message ? (
          <p
            className={`form-message${isError ? " form-message--error" : ""}`}
            role="status"
          >
            {message}
          </p>
        ) : null}

        <button className="primary-button" type="submit">
          Tạo tài khoản platform
        </button>
      </form>

      {draft ? (
        <div className="dialog-backdrop" role="presentation">
          <div
            className="confirmation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-account-title"
          >
            <p className="eyebrow">Xác nhận thao tác nhạy cảm</p>
            <h2 id="create-account-title">Tạo {draft.role}?</h2>
            <p>
              Tài khoản <strong>{draft.email}</strong> sẽ được xác minh sẵn và
              bắt buộc đổi mật khẩu khi đăng nhập lần đầu.
            </p>
            <div className="dialog-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => setDraft(null)}
                disabled={isPending}
              >
                Hủy
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={confirmCreate}
                disabled={isPending}
              >
                {isPending ? "Đang tạo..." : "Xác nhận tạo"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
