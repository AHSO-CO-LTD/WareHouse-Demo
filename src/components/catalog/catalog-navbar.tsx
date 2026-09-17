"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/products", label: "Sản phẩm" },
  { href: "/units", label: "Đơn vị tính" },
] as const;

export function CatalogNavbar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Danh mục sản phẩm" className="catalog-navbar">
      {items.map((item) => {
        const isCurrent = pathname === item.href;
        return <Link aria-current={isCurrent ? "page" : undefined} className="catalog-navbar-link" data-current={isCurrent || undefined} href={item.href} key={item.href}>{item.label}</Link>;
      })}
    </nav>
  );
}
