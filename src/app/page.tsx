import Image from "next/image";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="landing-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="AHSO Warehouse">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>AHSO Warehouse</span>
        </Link>
        <nav className="header-actions" aria-label="Tiện ích">
          <ThemeToggle />
          <Link className="text-link" href="/platform/login">
            Quản trị
          </Link>
        </nav>
      </header>

      <section className="hero" aria-labelledby="hero-heading">
        <div className="hero-copy">
          <p className="eyebrow">Bản demo quản lý kho</p>
          <h1 id="hero-heading">Biết chính xác hàng ở đâu.</h1>
          <p className="hero-summary">
            Quản lý nhập, xuất, tồn và kiểm kê theo đúng vị trí, với lịch sử rõ
            ràng.
          </p>
          <GoogleSignInButton />
        </div>

        <figure className="hero-visual">
          <Image
            src="/images/warehouse-hero.png"
            alt="Kho hàng hiện đại với kệ nhiều tầng và các vị trí lưu trữ rõ ràng"
            fill
            priority
            sizes="(max-width: 767px) 100vw, 56vw"
          />
        </figure>
      </section>

      <section className="proof-strip" aria-label="Giới hạn bản demo">
        <div>
          <strong>30 ngày</strong>
          <span>trải nghiệm đầy đủ</span>
        </div>
        <div>
          <strong>1 kho</strong>
          <span>cấu trúc đến từng slot</span>
        </div>
        <div>
          <strong>100 giao dịch</strong>
          <span>để thử luồng vận hành</span>
        </div>
        <p>
          Dữ liệu demo độc lập theo tài khoản Google. Không dùng cho vận hành
          thực tế.
        </p>
      </section>
    </main>
  );
}
