export default function Navigation() {
  return (
    <nav className="site-nav" aria-label="Navigasi utama">
      <a className="brand" href="#top" aria-label="Readwise home">
        <span className="brand-mark">UT</span>
        <span>BMP<span className="brand-dot">.</span></span>
      </a>
      <a className="nav-link" href="#modules">Find a module <span aria-hidden="true">⌕</span></a>
    </nav>
  );
}