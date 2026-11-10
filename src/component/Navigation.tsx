import { useEffect, useState } from "react";

const THEME_KEY = "sasing-theme";

function getInitialTheme() {
  try {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark" || savedTheme === "light") {
      return savedTheme === "dark";
    }
  } catch (error) {
    console.warn("Unable to read the saved theme preference.", error);
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export default function Navigation() {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    const theme = isDark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      console.warn("Unable to save the theme preference.", error);
    }
  }, [isDark]);

  return (
    <>
      <a className="skip-link" href="#top">Lewati ke konten utama</a>
      <nav className="site-nav" aria-label="Navigasi utama">
        <a className="brand" href="#top" aria-label="Sasing Ganjil 2026, beranda">
          <span className="brand-mark" aria-hidden="true">UT</span>
          <span className="brand-text">
            Sasing Ganjil 2026<span className="brand-dot">.</span>
          </span>
        </a>

        <div className="nav-actions">
          <a className="nav-link" href="#modules">
            <span className="nav-icon" aria-hidden="true">⌕</span>
            Find a module
          </a>

          <a className="nav-link" href="#photo-booth">Photo Booth</a>

          <button
            className="theme-toggle"
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
    </>
  );
}