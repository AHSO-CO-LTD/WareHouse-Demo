import Image from "next/image";
import Link from "next/link";
import { ArrowDown } from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { ProjectIntroductionMotion } from "@/components/landing/project-introduction-motion";
import { WarehouseMotionBackground } from "@/components/landing/warehouse-motion-background";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="landing-shell">
      <WarehouseMotionBackground />
      <ProjectIntroductionMotion />

      <header className="site-header">
        <Link className="brand" href="/" aria-label="AHSO Warehouse">
          <BrandLogo />
          <span>AHSO Warehouse</span>
        </Link>
        <nav className="header-actions" aria-label="Tài khoản và giao diện">
          <ThemeToggle />
          <Button className="h-10 px-4 text-sm" asChild>
            <Link href="/login">Đăng nhập / Đăng ký</Link>
          </Button>
        </nav>
      </header>

      <section className="project-hero" aria-labelledby="hero-heading">
        <div className="project-hero-copy" data-scroll-reveal>
          <h1 id="hero-heading">Quản lý kho rõ ràng.</h1>
          <p className="project-intro">
            AHSO Warehouse được xây dựng để thay thế việc theo dõi kho rời rạc bằng một quy trình
            có vị trí, giao dịch và kiểm kê rõ ràng.
          </p>
          <div className="project-hero-actions">
            <Button className="h-12 px-5" asChild>
              <Link href="/register">Tạo tài khoản dùng thử</Link>
            </Button>
            <Link className="project-scroll-link" href="#project-overview">
              Khám phá dự án
              <ArrowDown aria-hidden="true" />
            </Link>
          </div>
          <p className="hero-trial-facts">30 ngày dùng thử · 1 kho riêng · 100 giao dịch</p>
        </div>

        <figure className="project-image project-image--hero" data-scroll-reveal>
          <Image
            src="/images/warehouse-project-hero.png"
            alt="Lối đi trung tâm trong kho hàng với hệ thống kệ và kiện hàng được sắp xếp"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 48vw"
          />
        </figure>
      </section>

      <section id="project-overview" className="project-overview" aria-labelledby="overview-heading">
        <div className="project-section-copy" data-scroll-reveal>
          <h2 id="overview-heading">Biết hàng đang ở đâu.</h2>
          <p>
            Dự án tập trung vào từng vị trí lưu trữ để đội kho có thể tìm, ghi nhận và đối chiếu hàng
            hóa theo cùng một cách.
          </p>
        </div>
        <figure className="project-image project-image--detail" data-scroll-reveal>
          <Image
            src="/images/warehouse-location-management.png"
            alt="Nhân viên kiểm tra vị trí hàng trên kệ bằng thiết bị cầm tay"
            fill
            sizes="(max-width: 900px) 100vw, 42vw"
          />
        </figure>
      </section>

      <section className="project-capabilities" aria-labelledby="capabilities-heading">
        <div className="project-section-copy" data-scroll-reveal>
          <h2 id="capabilities-heading">Ba việc cốt lõi của kho.</h2>
        </div>
        <div className="project-capability-list">
          <article className="project-capability" data-scroll-reveal>
            <span>01</span>
            <div>
              <h3>Vị trí hàng</h3>
              <p>Biết hàng nằm ở khu vực, kệ và ô lưu trữ nào.</p>
            </div>
          </article>
          <article className="project-capability" data-scroll-reveal>
            <span>02</span>
            <div>
              <h3>Luồng nhập xuất</h3>
              <p>Ghi nhận từng giao dịch để theo dõi biến động tồn kho.</p>
            </div>
          </article>
          <article className="project-capability" data-scroll-reveal>
            <span>03</span>
            <div>
              <h3>Kiểm kê</h3>
              <p>Đối chiếu số liệu quản lý với tình trạng hàng thực tế.</p>
            </div>
          </article>
        </div>
      </section>

      <section className="project-trial" aria-labelledby="trial-heading">
        <div className="project-section-copy" data-scroll-reveal>
          <h2 id="trial-heading">Bắt đầu bằng bản dùng thử.</h2>
          <p>Mỗi tài khoản có một kho riêng để bạn làm quen với quy trình.</p>
          <Button className="h-12 px-5" asChild>
            <Link href="/register">Tạo tài khoản dùng thử</Link>
          </Button>
        </div>
        <dl className="project-trial-limits" data-scroll-reveal>
          <div>
            <dt>Thời hạn</dt>
            <dd>30 ngày</dd>
          </div>
          <div>
            <dt>Phạm vi</dt>
            <dd>1 kho riêng</dd>
          </div>
          <div>
            <dt>Giao dịch</dt>
            <dd>100 lượt</dd>
          </div>
        </dl>
      </section>

      <section className="project-status" aria-labelledby="status-heading">
        <figure className="project-image project-image--status" data-scroll-reveal>
          <Image
            src="/images/warehouse-stocktaking.png"
            alt="Nhân viên kiểm kê hàng hóa tại bàn làm việc trong kho"
            fill
            sizes="(max-width: 900px) 100vw, 42vw"
          />
        </figure>
        <div className="project-section-copy" data-scroll-reveal>
          <h2 id="status-heading">Dự án đang được xây dựng.</h2>
          <p>Tài khoản và kho dùng thử đã sẵn sàng. Các chức năng vận hành kho đang được hoàn thiện.</p>
        </div>
      </section>
    </main>
  );
}
