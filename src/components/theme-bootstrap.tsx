"use client";

import { useLayoutEffect } from "react";

const THEME_STORAGE_KEY = "ahso-theme";
const THEME_CHANGE_EVENT = "ahso-theme-change";

export function ThemeBootstrap() {
  useLayoutEffect(() => {
    try {
      const theme = window.localStorage.getItem(THEME_STORAGE_KEY);
      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch {
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return null;
}
