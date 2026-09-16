"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.classList.contains("dark") ? "light" : "dark";

    root.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem("ahso-theme", nextTheme);
    setIsDark(nextTheme === "dark");
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        >
          {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isDark ? "Giao diện sáng" : "Giao diện tối"}</TooltipContent>
    </Tooltip>
  );
}
