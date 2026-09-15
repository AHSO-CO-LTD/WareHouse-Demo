"use client";

import { useActionState } from "react";

import { createWorkspaceAction } from "@/app/onboarding/actions";
import { initialOnboardingState } from "@/app/onboarding/state";

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="form-error" role="alert">
      {errors[0]}
    </p>
  ) : null;
}

export function WorkspaceForm({
  name,
  email,
  phoneNumber,
  companyName,
}: {
  name: string;
  email: string;
  phoneNumber: string | null;
  companyName: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    createWorkspaceAction,
    initialOnboardingState,
  );
  const suggestedName = companyName || `Kho demo của ${name}`;

  return (
    <form className="workspace-form" action={formAction}>
      <div className="field-group">
        <label htmlFor="displayName">Tên không gian demo</label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          defaultValue={suggestedName}
          minLength={2}
          maxLength={120}
          aria-describedby="displayName-help displayName-error"
          required
        />
        <small id="displayName-help">Bạn có thể đổi tên này sau.</small>
        <div id="displayName-error">
          <FieldError errors={state.fieldErrors.displayName} />
        </div>
      </div>

      <dl className="profile-summary">
        <div>
          <dt>Người đăng ký</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{email}</dd>
        </div>
        <div>
          <dt>Số điện thoại</dt>
          <dd>{phoneNumber ?? "Chưa có"}</dd>
        </div>
      </dl>

      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button
        className="primary-button primary-button--full"
        disabled={isPending}
      >
        {isPending ? "Đang khởi tạo..." : "Bắt đầu 30 ngày dùng thử"}
      </button>
    </form>
  );
}
