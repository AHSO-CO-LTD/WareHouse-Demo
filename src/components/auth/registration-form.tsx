"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { CALLING_CODE_OPTIONS } from "@/lib/auth/registration";

type RegistrationError = {
  code: string;
  fieldErrors: Record<string, string[]> | null;
};

type RegistrationResponse = {
  status: number;
  data: { email: string; otpSent: boolean } | null;
  message: string;
  error: RegistrationError | null;
};

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="form-error" role="alert">
      {errors[0]}
    </p>
  ) : null;
}

export function RegistrationForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [verificationAvailable, setVerificationAvailable] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<
    string,
    string[]
  > | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);
    setVerificationAvailable(false);
    setFieldErrors(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      callingCode: String(formData.get("callingCode") ?? "+84"),
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      dateOfBirth: String(formData.get("dateOfBirth") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? ""),
      acceptTerms: formData.get("acceptTerms") === "on",
      acceptPrivacy: formData.get("acceptPrivacy") === "on",
      marketingEmailConsent: formData.get("marketingEmailConsent") === "on",
    };

    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as RegistrationResponse;

      if (!response.ok || !result.data) {
        setMessage(result.message);
        setFieldErrors(result.error?.fieldErrors ?? null);

        const firstInvalidField = Object.keys(
          result.error?.fieldErrors ?? {},
        )[0];
        if (firstInvalidField) {
          formRef.current
            ?.querySelector<HTMLElement>(`[name="${firstInvalidField}"]`)
            ?.focus();
        }

        if (result.error?.code === "EMAIL_VERIFICATION_PENDING") {
          setVerificationAvailable(true);
          window.sessionStorage.setItem(
            "ahso.pendingVerificationEmail",
            payload.email.trim().toLowerCase(),
          );
        }

        return;
      }

      window.sessionStorage.setItem(
        "ahso.pendingVerificationEmail",
        result.data.email,
      );
      if (result.data.otpSent) {
        window.sessionStorage.setItem(
          "ahso.verificationOtpSentAt",
          String(Date.now()),
        );
      } else {
        window.sessionStorage.removeItem("ahso.verificationOtpSentAt");
        window.sessionStorage.setItem(
          "ahso.verificationNotice",
          result.message,
        );
      }
      router.push("/verify-email");
    } catch {
      setMessage(
        "Không thể kết nối hệ thống. Vui lòng kiểm tra mạng và thử lại.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      className="auth-form"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="form-grid">
        <div className="field-group">
          <label htmlFor="name">Họ và tên</label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
          />
          <FieldError errors={fieldErrors?.name} />
        </div>

        <div className="field-group">
          <label htmlFor="email">Email đăng nhập</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
          />
          <FieldError errors={fieldErrors?.email} />
        </div>

        <div className="field-group">
          <label htmlFor="callingCode">Mã quốc gia</label>
          <input
            id="callingCode"
            name="callingCode"
            type="tel"
            list="calling-code-options"
            defaultValue="+84"
            autoComplete="tel-country-code"
            required
          />
          <datalist id="calling-code-options">
            {CALLING_CODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </datalist>
          <FieldError errors={fieldErrors?.callingCode} />
        </div>

        <div className="field-group">
          <label htmlFor="phoneNumber">Số điện thoại</label>
          <input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            autoComplete="tel-national"
            maxLength={24}
            placeholder="0912 345 678"
            required
          />
          <FieldError errors={fieldErrors?.phoneNumber} />
        </div>

        <div className="field-group">
          <label htmlFor="companyName">Tên công ty (không bắt buộc)</label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            autoComplete="organization"
            maxLength={120}
          />
          <FieldError errors={fieldErrors?.companyName} />
        </div>

        <div className="field-group">
          <label htmlFor="dateOfBirth">Ngày sinh (không bắt buộc)</label>
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            autoComplete="bday"
          />
          <FieldError errors={fieldErrors?.dateOfBirth} />
        </div>

        <div className="field-group">
          <label htmlFor="password">Mật khẩu</label>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
          <small>Từ 12 đến 128 ký tự.</small>
          <FieldError errors={fieldErrors?.password} />
        </div>

        <div className="field-group">
          <label htmlFor="confirmPassword">Xác nhận mật khẩu</label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
          <FieldError errors={fieldErrors?.confirmPassword} />
        </div>
      </div>

      <label className="check-row">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(event) => setShowPassword(event.target.checked)}
        />
        Hiện mật khẩu
      </label>

      <div className="consent-group">
        <label className="check-row">
          <input name="acceptTerms" type="checkbox" required />
          Tôi đồng ý với Điều khoản sử dụng.
        </label>
        <FieldError errors={fieldErrors?.acceptTerms} />

        <label className="check-row">
          <input name="acceptPrivacy" type="checkbox" required />
          Tôi đồng ý với Chính sách bảo mật.
        </label>
        <FieldError errors={fieldErrors?.acceptPrivacy} />

        <label className="check-row">
          <input name="marketingEmailConsent" type="checkbox" />
          Tôi muốn nhận thông tin sản phẩm và tư vấn từ AHSO.
        </label>
      </div>

      {message ? (
        <div className="form-message form-message--error" role="alert">
          <span>{message}</span>
          {verificationAvailable ? (
            <Link href="/verify-email">Đi đến xác minh email</Link>
          ) : null}
        </div>
      ) : null}

      <button
        className="primary-button primary-button--full"
        disabled={isPending}
      >
        {isPending ? "Đang tạo tài khoản..." : "Đăng ký và nhận OTP"}
      </button>

      <p className="form-footnote">
        Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
      </p>
    </form>
  );
}
