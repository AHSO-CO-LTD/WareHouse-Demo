"use client";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.classList.contains("dark") ? "light" : "dark";

    root.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem("ahso-theme", nextTheme);
  }

  return (
    <button
      className="text-button"
      type="button"
      onClick={toggleTheme}
      aria-label="Đổi giao diện sáng hoặc tối"
    >
      Sáng / Tối
    </button>
  );
}
