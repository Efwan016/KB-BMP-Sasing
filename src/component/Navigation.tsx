import { useEffect, useState } from "react";

const THEME_KEY = "sasing-theme";

export default function Navigation() {
  const [isDark, setIsDark] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const theme = isDark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [isDark]);

  return (
    <nav className="site-nav transition-colors duration-300" aria-label="Navigasi utama">
      <a className="brand" href="#top" aria-label="Readwise home">
        <span className="brand-mark">UT</span>
        <span>BMP UT<span className="brand-dot">.</span></span>
      </a>
      <div className="flex items-center gap-4">
        <a className="nav-link" href="#modules">Find a module <span aria-hidden="true">⌕</span></a>
        <button
          className="grid size-9 place-items-center border border-[var(--line-strong)] text-base text-[var(--ink)] transition hover:border-[var(--coral)] hover:text-[var(--coral)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)]"
          type="button"
          aria-label={isDark ? "Aktifkan light mode" : "Aktifkan dark mode"}
          aria-pressed={isDark}
          title={isDark ? "Light mode" : "Dark mode"}
          onClick={() => setIsDark((theme) => !theme)}
        >
          <span aria-hidden="true">{isDark ? "☼" : "☾"}</span>
        </button>
      </div>
    </nav>
  );
}