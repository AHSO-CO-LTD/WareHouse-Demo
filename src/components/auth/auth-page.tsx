import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AuthPage({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="login-shell">
      <div className="login-topbar">
        <Link className="brand" href="/">
          <BrandLogo />
          <span>AHSO Warehouse</span>
        </Link>
        <ThemeToggle />
      </div>

      <Card
        className={`login-panel${wide ? " login-panel--wide" : ""}`}
        aria-labelledby="auth-heading"
      >
        <CardHeader>
          <CardTitle id="auth-heading" className="text-4xl tracking-tight sm:text-5xl">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
