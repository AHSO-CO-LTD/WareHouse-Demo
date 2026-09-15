import Link from "next/link";
import type { ReactNode } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

export function AuthPage({
  eyebrow,
  title,
  description,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  wide?: boolean;
}) {
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

      <section
        className={`login-panel${wide ? " login-panel--wide" : ""}`}
        aria-labelledby="auth-heading"
      >
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="auth-heading">{title}</h1>
        <p>{description}</p>
        {children}
      </section>
    </main>
  );
}
