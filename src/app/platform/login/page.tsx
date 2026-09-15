import Link from "next/link";

import { PlatformLoginForm } from "@/components/auth/platform-login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: "Đăng nhập quản trị | AHSO Warehouse",
};

export default function PlatformLoginPage() {
  return (
    <main className="login-shell">
      <div className="login-topbar">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>AHSO Warehouse</span>
        </Link>
        <ThemeToggle />
      </div>

      <section className="login-panel" aria-labelledby="login-heading">
        <p className="eyebrow">Khu vực nội bộ</p>
        <h1 id="login-heading">Đăng nhập quản trị</h1>
        <p>
          Dành cho DEV và ADMIN quản lý tài khoản demo, thống kê và hỗ trợ người
          dùng.
        </p>
        <PlatformLoginForm />
        <Link className="back-link" href="/">
          Quay lại trang demo
        </Link>
      </section>
    </main>
  );
}
