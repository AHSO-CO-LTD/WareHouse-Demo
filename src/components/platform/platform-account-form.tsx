"use client";

import { FormEvent, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [role, setRole] = useState<AccountDraft["role"]>(
    AUTH_ROLES.PLATFORM_ADMIN,
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const submittedRole = String(formData.get("role"));

    if (
      submittedRole !== AUTH_ROLES.PLATFORM_DEV &&
      submittedRole !== AUTH_ROLES.PLATFORM_ADMIN
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
      role: submittedRole,
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
    setRole(AUTH_ROLES.PLATFORM_ADMIN);
    toast.success("Đã tạo tài khoản platform.");
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
            <Label htmlFor="platformName">Họ và tên</Label>
            <Input
              id="platformName"
              name="name"
              type="text"
              className="h-12"
              minLength={2}
              maxLength={100}
              required
            />
          </div>
          <div className="field-group">
            <Label htmlFor="platformEmail">Email đăng nhập</Label>
            <Input
              id="platformEmail"
              name="email"
              type="email"
              className="h-12"
              autoComplete="off"
              required
            />
          </div>
          <div className="field-group">
            <Label htmlFor="platformRole">Vai trò</Label>
            <input name="role" type="hidden" value={role} />
            <Select value={role} onValueChange={(value) => setRole(value as AccountDraft["role"])}>
              <SelectTrigger id="platformRole" className="h-12 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTH_ROLES.PLATFORM_ADMIN}>Platform ADMIN</SelectItem>
                <SelectItem value={AUTH_ROLES.PLATFORM_DEV}>Platform DEV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="field-group">
            <Label htmlFor="platformPassword">Mật khẩu tạm thời</Label>
            <Input
              id="platformPassword"
              name="password"
              type="password"
              className="h-12"
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

        <Button className="h-12" type="submit">
          Tạo tài khoản Platform
        </Button>
      </form>

      {draft ? (
        <AlertDialog open onOpenChange={(open) => !open && setDraft(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tạo {draft.role}?</AlertDialogTitle>
              <AlertDialogDescription>
                Tài khoản <strong>{draft.email}</strong> sẽ được xác minh sẵn và bắt buộc đổi mật khẩu khi đăng nhập lần đầu.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
              <AlertDialogAction disabled={isPending} onClick={confirmCreate}>
                {isPending ? "Đang tạo..." : "Xác nhận tạo"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  );
}
