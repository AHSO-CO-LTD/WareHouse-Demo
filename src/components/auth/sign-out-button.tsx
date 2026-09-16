"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

const APP_STORAGE_PREFIX = "ahso.";

function clearAppStorage(storage: Storage) {
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);

    if (key?.startsWith(APP_STORAGE_PREFIX)) {
      storage.removeItem(key);
    }
  }
}

type SignOutButtonProps = {
  className?: string;
  onPendingChange?: (isPending: boolean) => void;
};

export function SignOutButton({
  className,
  onPendingChange,
}: SignOutButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSignOut() {
    setIsPending(true);
    setErrorMessage(null);
    onPendingChange?.(true);

    try {
      const result = await authClient.signOut();

      if (result.error) {
        setErrorMessage("Không thể đăng xuất. Vui lòng thử lại.");
        toast.error("Không thể đăng xuất. Vui lòng thử lại.");
        return;
      }

      clearAppStorage(window.localStorage);
      clearAppStorage(window.sessionStorage);
      window.location.assign("/login");
    } catch {
      setErrorMessage("Không thể đăng xuất. Vui lòng thử lại.");
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
    } finally {
      setIsPending(false);
      onPendingChange?.(false);
    }
  }

  return (
    <div className="sign-out-control">
      <Button
        variant="ghost"
        size="sm"
        className={`h-10 px-4 text-sm${className ? ` ${className}` : ""}`}
        type="button"
        onClick={handleSignOut}
        disabled={isPending}
      >
        {isPending ? "Đang đăng xuất..." : "Đăng xuất"}
      </Button>
      {errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
