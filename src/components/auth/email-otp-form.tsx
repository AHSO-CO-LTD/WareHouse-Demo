"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

const EMAIL_STORAGE_KEY = "ahso.pendingVerificationEmail";
const SENT_AT_STORAGE_KEY = "ahso.verificationOtpSentAt";

function remainingCooldown(sentAt: number): number {
  return Math.max(0, 60 - Math.floor((Date.now() - sentAt) / 1_000));
}

export function EmailOtpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedEmail = window.sessionStorage.getItem(EMAIL_STORAGE_KEY) ?? "";
    const sentAt = Number(
      window.sessionStorage.getItem(SENT_AT_STORAGE_KEY) ?? "0",
    );
    const notice = window.sessionStorage.getItem("ahso.verificationNotice");
    const frame = window.requestAnimationFrame(() => {
      setEmail(storedEmail);
      setCooldown(remainingCooldown(sentAt));
      setMessage(notice);
    });
    window.sessionStorage.removeItem("ahso.verificationNotice");

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOtp = otp.replace(/\D/g, "").slice(0, 6);

    if (!normalizedEmail || normalizedOtp.length !== 6) {
      setMessage("Vui lòng nhập email và mã OTP gồm 6 chữ số.");
      return;
    }

    setIsVerifying(true);
    const result = await authClient.emailOtp.verifyEmail({
      email: normalizedEmail,
      otp: normalizedOtp,
    });

    if (result.error) {
      setMessage(
        result.error.code === "TOO_MANY_ATTEMPTS"
          ? "Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã OTP mới."
          : "Mã OTP không đúng hoặc đã hết hạn.",
      );
      setIsVerifying(false);
      return;
    }

    window.sessionStorage.removeItem(EMAIL_STORAGE_KEY);
    window.sessionStorage.removeItem(SENT_AT_STORAGE_KEY);
    router.replace("/auth/continue");
    router.refresh();
  }

  async function handleResend() {
    if (cooldown > 0 || isResending || !email.trim()) {
      return;
    }

    setIsResending(true);
    setMessage(null);
    const normalizedEmail = email.trim().toLowerCase();
    const result = await authClient.emailOtp.sendVerificationOtp({
      email: normalizedEmail,
      type: "email-verification",
    });

    if (result.error) {
      setMessage(
        result.error.status === 429
          ? "Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau."
          : "Chưa thể gửi OTP. Vui lòng thử lại.",
      );
    } else {
      window.sessionStorage.setItem(EMAIL_STORAGE_KEY, normalizedEmail);
      window.sessionStorage.setItem(SENT_AT_STORAGE_KEY, String(Date.now()));
      setCooldown(60);
      setMessage("Mã OTP mới đã được gửi. Vui lòng kiểm tra cả thư rác.");
    }

    setIsResending(false);
  }

  return (
    <form className="auth-form" onSubmit={handleVerify}>
      <div className="field-group">
        <Label htmlFor="verificationEmail">Email</Label>
        <Input
          id="verificationEmail"
          type="email"
          className="h-12"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="field-group">
        <Label htmlFor="verificationOtp">Mã OTP</Label>
        <InputOTP
          id="verificationOtp"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={(value) => setOtp(value)}
          autoFocus
          required
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} />)}
          </InputOTPGroup>
        </InputOTP>
        <small>Mã có hiệu lực trong 10 phút.</small>
      </div>

      {message ? (
        <p className="form-message" role="status">
          {message}
        </p>
      ) : null}

      <Button
        className="h-12 w-full"
        disabled={isVerifying}
      >
        {isVerifying ? "Đang xác minh..." : "Xác minh và tiếp tục"}
      </Button>

      <Button
        variant="outline"
        className="h-12"
        type="button"
        onClick={handleResend}
        disabled={cooldown > 0 || isResending || !email.trim()}
      >
        {isResending
          ? "Đang gửi..."
          : cooldown > 0
            ? `Gửi lại sau ${cooldown}s`
            : "Gửi lại OTP"}
      </Button>

      <p className="form-footnote">
        Sai email? <Link href="/register">Đăng ký lại bằng email khác</Link>
      </p>
    </form>
  );
}
