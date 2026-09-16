import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";

import { AppToaster } from "@/components/ui/app-toaster";
import { ThemeBootstrap } from "@/components/theme-bootstrap";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AHSO Warehouse Demo",
  description: "Trải nghiệm quản lý nhập, xuất, tồn và kiểm kê theo vị trí.",
  icons: {
    icon: "/images/favicon.ico",
    shortcut: "/images/favicon.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={beVietnamPro.variable}>
        <ThemeBootstrap />
        <TooltipProvider>
          {children}
          <AppToaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
