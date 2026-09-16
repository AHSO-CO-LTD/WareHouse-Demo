"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const BIRTH_YEAR_OPTIONS = Array.from(
  { length: 121 },
  (_, index) => new Date().getUTCFullYear() - index,
);

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.[0] ? (
    <p className="form-error" role="alert">
      {errors[0]}
    </p>
  ) : null;
}

function RequiredIndicator() {
  return (
    <span className="required-indicator" aria-hidden="true">
      *
    </span>
  );
}

function PasswordVisibilityIcon({ isVisible }: { isVisible: boolean }) {
  return isVisible ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 4.2A10.5 10.5 0 0 1 12 4c5.2 0 8.8 4.1 9.8 6.6a2 2 0 0 1 0 1.5 12 12 0 0 1-3 4.2" />
      <path d="M6.2 6.2a12 12 0 0 0-4 4.4 2 2 0 0 0 0 1.5C3.2 14.6 6.8 18.7 12 18.7c1 0 1.9-.2 2.8-.5" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2.2 12.1a2 2 0 0 1 0-1.5C3.2 8.1 6.8 4 12 4s8.8 4.1 9.8 6.6a2 2 0 0 1 0 1.5C20.8 14.6 17.2 18.7 12 18.7S3.2 14.6 2.2 12.1Z" />
      <circle cx="12" cy="11.4" r="3.1" />
    </svg>
  );
}

function DropdownChevron({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
      className={isOpen ? "year-picker__chevron year-picker__chevron--open" : "year-picker__chevron"}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function BirthYearField({ errors }: { errors?: string[] }) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const matchingYears = BIRTH_YEAR_OPTIONS.filter((year) =>
    year.toString().startsWith(value.trim()),
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function selectYear(year: number) {
    setValue(String(year));
    setIsOpen(false);
    inputRef.current?.focus();
  }

  return (
    <div className="field-group">
      <Label htmlFor="birthYear">Năm sinh (không bắt buộc)</Label>
      <div className="year-picker" ref={pickerRef}>
        <Input
          ref={inputRef}
          id="birthYear"
          name="birthYear"
          type="text"
          className="year-picker__input"
          autoComplete="bday-year"
          inputMode="numeric"
          pattern="\\d{4}"
          maxLength={4}
          placeholder="1990"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="birth-year-options"
          onChange={(event) => {
            setValue(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
            }
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          className="year-picker__toggle"
          type="button"
          aria-label={isOpen ? "Đóng danh sách năm sinh" : "Mở danh sách năm sinh"}
          aria-expanded={isOpen}
          aria-controls="birth-year-options"
          onClick={() => {
            setIsOpen((open) => !open);
            inputRef.current?.focus();
          }}
        >
          <DropdownChevron isOpen={isOpen} />
        </Button>
        {isOpen ? (
          <div id="birth-year-options" className="year-picker__menu" role="listbox">
            {matchingYears.length ? (
              matchingYears.map((year) => (
                <Button
                  variant="ghost"
                  size="sm"
                  key={year}
                  className="year-picker__option h-10"
                  type="button"
                  role="option"
                  aria-selected={value === String(year)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectYear(year)}
                >
                  {year}
                </Button>
              ))
            ) : (
              <p className="year-picker__empty">Không có năm phù hợp.</p>
            )}
          </div>
        ) : null}
      </div>
      <FieldError errors={errors} />
    </div>
  );
}

export function RegistrationForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
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
      phoneNumber: String(formData.get("phoneNumber") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      birthYear: String(formData.get("birthYear") ?? ""),
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
          <Label htmlFor="name">
            Họ và tên<RequiredIndicator />
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            className="h-12"
            autoComplete="name"
            minLength={2}
            maxLength={100}
            required
          />
          <FieldError errors={fieldErrors?.name} />
        </div>

        <div className="field-group">
          <Label htmlFor="email">
            Email đăng nhập<RequiredIndicator />
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            className="h-12"
            autoComplete="email"
            maxLength={254}
            required
          />
          <FieldError errors={fieldErrors?.email} />
        </div>

        <div className="field-group">
          <Label htmlFor="phoneNumber">
            Số điện thoại<RequiredIndicator />
          </Label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            className="h-12"
            autoComplete="tel-national"
            maxLength={24}
            placeholder="0912 345 678"
            required
          />
          <FieldError errors={fieldErrors?.phoneNumber} />
        </div>

        <div className="field-group">
          <Label htmlFor="companyName">Tên công ty (không bắt buộc)</Label>
          <Input
            id="companyName"
            name="companyName"
            type="text"
            className="h-12"
            autoComplete="organization"
            maxLength={120}
          />
          <FieldError errors={fieldErrors?.companyName} />
        </div>

        <div className="field-group">
          <Label htmlFor="password">
            Mật khẩu<RequiredIndicator />
          </Label>
          <div className="password-input">
            <Input
              id="password"
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              className="h-12 pr-12"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
            <Button
              variant="ghost"
              size="icon"
              className="password-visibility-toggle"
              type="button"
              aria-label={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={isPasswordVisible}
              onClick={() => setIsPasswordVisible((isVisible) => !isVisible)}
            >
              <PasswordVisibilityIcon isVisible={isPasswordVisible} />
            </Button>
          </div>
          <small className="password-help">Từ 12 đến 128 ký tự.</small>
          <FieldError errors={fieldErrors?.password} />
        </div>

        <div className="field-group">
          <Label htmlFor="confirmPassword">
            Xác nhận mật khẩu<RequiredIndicator />
          </Label>
          <div className="password-input">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={isConfirmPasswordVisible ? "text" : "password"}
              className="h-12 pr-12"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
            />
            <Button
              variant="ghost"
              size="icon"
              className="password-visibility-toggle"
              type="button"
              aria-label={
                isConfirmPasswordVisible
                  ? "Ẩn xác nhận mật khẩu"
                  : "Hiện xác nhận mật khẩu"
              }
              aria-pressed={isConfirmPasswordVisible}
              onClick={() =>
                setIsConfirmPasswordVisible((isVisible) => !isVisible)
              }
            >
              <PasswordVisibilityIcon isVisible={isConfirmPasswordVisible} />
            </Button>
          </div>
          <small className="password-help" aria-hidden="true" />
          <FieldError errors={fieldErrors?.confirmPassword} />
        </div>

        <BirthYearField errors={fieldErrors?.birthYear} />
      </div>

      <div className="consent-group">
        <Label className="check-row">
          <Checkbox name="acceptTerms" required />
          <span>
            Tôi đồng ý với Điều khoản sử dụng.<RequiredIndicator />
          </span>
        </Label>
        <FieldError errors={fieldErrors?.acceptTerms} />

        <Label className="check-row">
          <Checkbox name="acceptPrivacy" required />
          <span>
            Tôi đồng ý với Chính sách bảo mật.<RequiredIndicator />
          </span>
        </Label>
        <FieldError errors={fieldErrors?.acceptPrivacy} />

        <Label className="check-row">
          <Checkbox name="marketingEmailConsent" />
          Tôi muốn nhận thông tin sản phẩm và tư vấn từ AHSO.
        </Label>
      </div>

      {message ? (
        <div className="form-message form-message--error" role="alert">
          <span>{message}</span>
          {verificationAvailable ? (
            <Link href="/verify-email">Đi đến xác minh email</Link>
          ) : null}
        </div>
      ) : null}

      <Button
        className="h-12 w-full"
        disabled={isPending}
      >
        {isPending ? "Đang tạo tài khoản..." : "Đăng ký và nhận OTP"}
      </Button>

      <p className="form-footnote">
        Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
      </p>
    </form>
  );
}
