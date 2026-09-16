"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function AppToaster() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const syncTheme = () =>
      setTheme(root.classList.contains("dark") ? "dark" : "light");

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return (
    <Toaster
      closeButton
      richColors
      position="top-right"
      theme={theme}
      toastOptions={{ className: "font-sans" }}
    />
  );
}
