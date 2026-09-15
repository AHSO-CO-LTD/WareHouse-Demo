"use client";

import { useActionState } from "react";

import {
  createWorkspaceAction,
  initialOnboardingState,
} from "@/app/onboarding/actions";

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p className="form-error" role="alert">
      {errors[0]}
    </p>
  );
}

export function WorkspaceForm({ email }: { email: string }) {
  const [state, formAction, isPending] = useActionState(
    createWorkspaceAction,
    initialOnboardingState,
  );

  return (
    <form className="workspace-form" action={formAction}>
      <div className="field-group">
        <label htmlFor="displayName">Tên công ty</label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="organization"
          minLength={2}
          maxLength={120}
          aria-describedby="displayName-error"
          required
        />
        <div id="displayName-error">
          <FieldError errors={state.fieldErrors.displayName} />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="contactName">Người liên hệ</label>
        <input
          id="contactName"
          name="contactName"
          type="text"
          autoComplete="name"
          minLength={2}
          maxLength={100}
          aria-describedby="contactName-error"
          required
        />
        <div id="contactName-error">
          <FieldError errors={state.fieldErrors.contactName} />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="contactEmail">Email liên hệ</label>
        <input id="contactEmail" type="email" value={email} disabled />
        <small>Email lấy từ tài khoản Google và không thể đổi tại đây.</small>
      </div>

      <div className="field-group">
        <label htmlFor="contactPhone">Số điện thoại (không bắt buộc)</label>
        <input
          id="contactPhone"
          name="contactPhone"
          type="tel"
          autoComplete="tel"
          maxLength={30}
          aria-describedby="contactPhone-error"
        />
        <div id="contactPhone-error">
          <FieldError errors={state.fieldErrors.contactPhone} />
        </div>
      </div>

      {state.message ? (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button
        className="primary-button primary-button--full"
        disabled={isPending}
      >
        {isPending ? "Đang khởi tạo..." : "Bắt đầu bản demo"}
      </button>
    </form>
  );
}
