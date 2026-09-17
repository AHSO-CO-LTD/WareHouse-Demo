"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const navigationItems = [
  { href: "/demo", label: "Tổng quan" },
  { href: "/warehouse", label: "Quản lý kho" },
  { href: "/products", label: "Sản phẩm" },
  { href: "/inventory", label: "Tồn kho" },
] as const;

type WorkspaceNavbarProps = {
  workspaceName: string | null;
};

export function WorkspaceNavbar({ workspaceName }: WorkspaceNavbarProps) {
  const pathname = usePathname();

  return (
    <header className="workspace-navbar">
      <Link className="workspace-navbar-brand" href="/demo">
        <BrandLogo />
        <strong>{workspaceName ?? "AHSO Warehouse"}</strong>
      </Link>
      <nav aria-label="Điều hướng kho" className="workspace-navbar-links">
        {navigationItems.map((item) => {
          const isCurrent = pathname === item.href || (item.href === "/products" && pathname === "/units");

          return (
            <Link
              aria-current={isCurrent ? "page" : undefined}
              className="workspace-navbar-link"
              data-current={isCurrent || undefined}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="workspace-navbar-actions">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  );
}
