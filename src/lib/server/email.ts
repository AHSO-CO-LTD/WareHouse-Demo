import nodemailer, { type Transporter } from "nodemailer";

import type { ServerEnv } from "@/config/server-env-schema";
import type { PrismaClient } from "@/generated/prisma/client";

type OtpPurpose =
  "sign-in" | "email-verification" | "forget-password" | "change-email";

type TrackedEmailType =
  "EMAIL_VERIFIED_WELCOME" | "DEMO_ACTIVATED" | "PASSWORD_CHANGED";

type EmailMessage = {
  subject: string;
  text: string;
  html: string;
};

let cachedTransporter: Transporter | undefined;

function getTransporter(env: ServerEnv): Transporter {
  cachedTransporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });

  return cachedTransporter;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };

    return entities[character] ?? character;
  });
}

function wrapEmail(content: string): string {
  return `<!doctype html>
<html lang="vi">
  <body style="margin:0;background:#f4f1ea;color:#17201d;font-family:Arial,sans-serif">
    <div style="max-width:600px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border:1px solid #ded8cc;padding:32px">
        <p style="margin:0 0 24px;font-size:13px;font-weight:700;letter-spacing:.08em;color:#17705a">AHSO WAREHOUSE</p>
        ${content}
      </div>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:#68736f">Đây là email giao dịch được gửi theo thao tác tài khoản của bạn. Vui lòng không trả lời email này.</p>
    </div>
  </body>
</html>`;
}

async function sendEmail(
  env: ServerEnv,
  recipient: string,
  message: EmailMessage,
): Promise<void> {
  await getTransporter(env).sendMail({
    from: env.SMTP_FROM,
    to: recipient,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}

export async function sendOtpEmail(
  env: ServerEnv,
  data: { email: string; otp: string; type: OtpPurpose },
): Promise<void> {
  const isPasswordReset = data.type === "forget-password";
  const purpose = isPasswordReset ? "đặt lại mật khẩu" : "xác minh email";
  const subject = isPasswordReset
    ? "Mã OTP đặt lại mật khẩu AHSO Warehouse"
    : "Mã OTP xác minh tài khoản AHSO Warehouse";
  const safeOtp = escapeHtml(data.otp);

  await sendEmail(env, data.email, {
    subject,
    text: `Mã OTP để ${purpose} của bạn là ${data.otp}. Mã có hiệu lực trong 10 phút. Không chia sẻ mã này với bất kỳ ai.`,
    html: wrapEmail(`
      <h1 style="margin:0 0 12px;font-size:24px">${subject}</h1>
      <p style="margin:0 0 20px;line-height:1.6">Nhập mã dưới đây để ${purpose}. Mã có hiệu lực trong 10 phút.</p>
      <p style="margin:0 0 20px;padding:16px;background:#f4f1ea;font-size:32px;font-weight:700;letter-spacing:.24em;text-align:center">${safeOtp}</p>
      <p style="margin:0;line-height:1.6;color:#68736f">Không chia sẻ OTP với bất kỳ ai. Nếu bạn không yêu cầu mã này, có thể bỏ qua email.</p>
    `),
  });
}

async function sendTrackedEmail(
  database: PrismaClient,
  env: ServerEnv,
  input: {
    userId?: string;
    workspaceId?: string;
    recipient: string;
    type: TrackedEmailType;
    idempotencyKey: string;
    message: EmailMessage;
  },
): Promise<void> {
  let deliveryId: string | undefined;
  try {
    const delivery = await database.emailDelivery.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        userId: input.userId,
        workspaceId: input.workspaceId,
        recipient: input.recipient,
        type: input.type,
        idempotencyKey: input.idempotencyKey,
      },
      update: {},
    });
    deliveryId = delivery.id;

    const claimed = await database.emailDelivery.updateMany({
      where: {
        id: delivery.id,
        status: "PENDING",
        attemptCount: 0,
      },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    if (claimed.count === 0) {
      return;
    }

    await sendEmail(env, input.recipient, input.message);
    await database.emailDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        failureCode: null,
      },
    });
  } catch (error) {
    if (deliveryId) {
      await database.emailDelivery
        .update({
          where: { id: deliveryId },
          data: {
            status: "FAILED",
            failureCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
          },
        })
        .catch(() => undefined);
    }

    console.error(
      JSON.stringify({
        level: "error",
        source: "transactional-email",
        message: "Email delivery failed",
        deliveryId,
        template: input.type,
      }),
    );
  }
}

export async function sendVerifiedWelcomeEmail(
  database: PrismaClient,
  env: ServerEnv,
  user: { id: string; email: string; name: string },
): Promise<void> {
  const safeName = escapeHtml(user.name);

  await sendTrackedEmail(database, env, {
    userId: user.id,
    recipient: user.email,
    type: "EMAIL_VERIFIED_WELCOME",
    idempotencyKey: `email-verified-welcome:${user.id}`,
    message: {
      subject: "Xác minh thành công — Chào mừng đến với AHSO",
      text: `Xin chào ${user.name}, email của bạn đã được xác minh. Hãy hoàn tất bước khởi tạo để bắt đầu 30 ngày trải nghiệm AHSO Warehouse.`,
      html: wrapEmail(`
        <h1 style="margin:0 0 12px;font-size:24px">Xác minh thành công</h1>
        <p style="margin:0 0 12px;line-height:1.6">Xin chào ${safeName}, chào mừng bạn đến với AHSO Warehouse.</p>
        <p style="margin:0;line-height:1.6">Hãy hoàn tất bước khởi tạo không gian kho. Thời hạn demo 30 ngày chỉ bắt đầu sau khi bạn hoàn thành bước này.</p>
      `),
    },
  });
}

export async function sendDemoActivatedEmail(
  database: PrismaClient,
  env: ServerEnv,
  input: {
    userId: string;
    workspaceId: string;
    email: string;
    name: string;
    workspaceName: string;
    startedAt: Date;
    expiresAt: Date;
  },
): Promise<void> {
  const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const startedAt = dateFormatter.format(input.startedAt);
  const expiresAt = dateFormatter.format(input.expiresAt);

  await sendTrackedEmail(database, env, {
    userId: input.userId,
    workspaceId: input.workspaceId,
    recipient: input.email,
    type: "DEMO_ACTIVATED",
    idempotencyKey: `demo-activated:${input.workspaceId}`,
    message: {
      subject: "Bản demo AHSO Warehouse đã được kích hoạt",
      text: `Xin chào ${input.name}, không gian ${input.workspaceName} đã được kích hoạt từ ${startedAt} đến ${expiresAt}. Hạn mức gồm 1 kho, 20 sản phẩm và 100 giao dịch kho.`,
      html: wrapEmail(`
        <h1 style="margin:0 0 12px;font-size:24px">Bản demo đã sẵn sàng</h1>
        <p style="margin:0 0 12px;line-height:1.6">Xin chào ${escapeHtml(input.name)}, không gian <strong>${escapeHtml(input.workspaceName)}</strong> đã được kích hoạt.</p>
        <p style="margin:0 0 12px;line-height:1.6"><strong>Thời hạn:</strong> ${startedAt} – ${expiresAt}</p>
        <p style="margin:0;line-height:1.6">Hạn mức chính: 1 kho, 20 sản phẩm, 5 dự án, 10 báo giá/dự toán và 100 giao dịch kho.</p>
      `),
    },
  });
}

export async function sendPasswordChangedEmail(
  database: PrismaClient,
  env: ServerEnv,
  input: {
    userId: string;
    email: string;
    changedAt: Date;
    eventId: string;
    ipAddress?: string;
  },
): Promise<void> {
  const timestamp = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "medium",
  }).format(input.changedAt);
  const ipLine = input.ipAddress ? ` Địa chỉ IP: ${input.ipAddress}.` : "";

  await sendTrackedEmail(database, env, {
    userId: input.userId,
    recipient: input.email,
    type: "PASSWORD_CHANGED",
    idempotencyKey: `password-changed:${input.eventId}`,
    message: {
      subject: "Mật khẩu AHSO Warehouse đã được thay đổi",
      text: `Mật khẩu tài khoản của bạn đã được thay đổi lúc ${timestamp}.${ipLine} Nếu đây không phải thao tác của bạn, hãy liên hệ AHSO ngay.`,
      html: wrapEmail(`
        <h1 style="margin:0 0 12px;font-size:24px">Mật khẩu đã được thay đổi</h1>
        <p style="margin:0 0 12px;line-height:1.6">Thao tác hoàn tất lúc <strong>${timestamp}</strong>.</p>
        ${input.ipAddress ? `<p style="margin:0 0 12px;line-height:1.6">Địa chỉ IP: ${escapeHtml(input.ipAddress)}</p>` : ""}
        <p style="margin:0;line-height:1.6;color:#a23a2a">Nếu đây không phải thao tác của bạn, hãy liên hệ AHSO ngay để khóa tài khoản.</p>
      `),
    },
  });
}
