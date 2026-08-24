import type { ChangeEvent } from "react";
import type { Module } from "../types";

type MainContentProps = {
  moduleData: Module;
  filteredModules: Module[];
  moduleGroups: Record<string, Module[]>;
  searchTerm: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onOpenModule: (module: Module) => void;
};

const getFileType = (asset: string) => asset.split(".").pop()?.toUpperCase() ?? "FILE";

export default function MainContent({
  moduleData,
  filteredModules,
  moduleGroups,
  searchTerm,
  onSearchChange,
  onClearSearch,
  onOpenModule,
}: MainContentProps) {
  const previewGroups = Object.entries(moduleGroups).reduce<Record<string, Module[]>>((groups, [subject, subjectModules]) => {
    groups[subject] = subjectModules.slice(0, 3);
    return groups;
  }, {});
  return (
    <main id="top">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" />{moduleData.eyebrow}</p>
          <h1 id="hero-title">Read with<br /><em>intention.</em></h1>
          <p className="hero-description">{moduleData.description}</p>
          <p className="hero-meta">Kelompok Gabungan Belajar Mandiri Sasing Ganji 2026</p>
          <div className="hero-actions">
            <a className="text-link" href="#module">See what is inside <span aria-hidden="true">↓</span></a>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="visual-card">
            <span className="visual-number">2026</span>
            <span className="visual-caption">
                Keep Growing, Keep Building, byte by byte
                <br /> 
                in attention</span>
            <span className="visual-arrow">↗</span>
          </div>
          <span className="visual-note">slow down<br />to notice more</span>
        </div>
      </section>

      <section className="module-section" id="module" aria-labelledby="module-title">
        <div className="section-heading">
          <p className="section-kicker">Inside the module</p>
          <h2 id="module-title">A small shift<br /><em>in how you read.</em></h2>
        </div>
        <div className="module-details">
          <p className="module-intro">A focused reading session designed to help you move from decoding words to understanding the ideas behind them.</p>
          <div className="detail-grid">
            <div><span>Module</span><strong>{moduleData.label}</strong></div>
            <div><span>Format</span><strong>PDF / {moduleData.duration}</strong></div>
            <div><span>Level</span><strong>{moduleData.level}</strong></div>
          </div>
          <ul className="highlight-list">
            {moduleData.highlights.map((highlight) => <li key={highlight}><span aria-hidden="true">+</span>{highlight}</li>)}
          </ul>
        </div>
      </section>

      <section className="catalog-section" id="modules" aria-labelledby="catalog-title">
        <div className="catalog-heading catalog-toolbar">
          <div>
            <p className="catalog-badge"><span aria-hidden="true">✦</span> Learning library</p>
            <h2 id="catalog-title">Latest modules from<br /><em>your library.</em></h2>
            <p className="catalog-description">A quick selection of materials to keep your reading and writing practice moving forward.</p>
          </div>
          {filteredModules.length > 3 && <button className="view-all-button" type="button" onClick={() => onOpenModule(filteredModules[0])}>Show all <span aria-hidden="true">→</span></button>}
        </div>
        <div className="search-wrap">
          <label htmlFor="module-search">Search modules</label>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input id="module-search" type="search" value={searchTerm} onChange={onSearchChange} placeholder="Try reading, vocabulary, or module 06" />
          {searchTerm && <button className="clear-search" type="button" onClick={onClearSearch} aria-label="Clear search">×</button>}
        </div>
        <div className="results-list card-results">
          {Object.entries(previewGroups).map(([subject, subjectModules]) => (
            <div className="subject-group" key={subject}>
              <div className="subject-heading"><h3>{subject}</h3><span>{subjectModules.length} shown</span></div>
              <div className="module-cards">
                {subjectModules.map((module) => (
                  <article className="module-card" key={module.asset}>
                    <div className="module-card-top"><div className="module-icon" aria-hidden="true">{module.label.replace(/\D/g, "") || "—"}</div><span className="card-arrow" aria-hidden="true">↗</span></div>
                    <p className="module-meta">{module.level} / {getFileType(module.asset)}</p>
                    <h3>{module.label}</h3>
                    <p className="module-card-description">{module.description}</p>
                    <button className="module-card-link" type="button" onClick={() => onOpenModule(module)}>View module <span aria-hidden="true">→</span></button>
                  </article>
                ))}
              </div>
            </div>
          ))}
          {filteredModules.length === 0 && <div className="empty-results"><strong>No modules found.</strong><span>Try a different keyword.</span></div>}
        </div>
      </section>

      <section className="cta-section">
        <p className="section-kicker">Your next page</p>
        <h2>Start where<br /><em>curiosity leads.</em></h2>
        <a className="primary-button light-button" href={moduleData.asset} target="_blank" rel="noreferrer">Read module <span aria-hidden="true">↗</span></a>
      </section>
    </main>
  );
}