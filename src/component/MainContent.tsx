import type { ChangeEvent } from "react";
import type { Module, ReadingHistoryItem } from "../types";

type MainContentProps = {
  moduleData: Module;
  filteredModules: Module[];
  moduleGroups: Record<string, Module[]>;
  examSubjects: string[];
  searchTerm: string;
  onSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onShowAllModules: (subject: string) => void;
  onOpenModule: (module: Module) => void;
  onStartExam: (subject: string) => void;
  onShowLeaderboard: (subject: string) => void;
  readingHistory: ReadingHistoryItem[];
  clearHistory: () => void;
};

const getFileType = (asset: string) => asset.split(".").pop()?.toUpperCase() ?? "FILE";
const formatSubject = (subject: string) => subject.replace(/_/g, " ").replace("Basic Writting", "Basic Writing");
const formatModuleDescription = (description: string) =>
  description.replace(/_/g, " ").replace("Basic Writting", "Basic Writing");

export default function MainContent({
  moduleData,
  filteredModules,
  moduleGroups,
  examSubjects,
  searchTerm,
  onSearchChange,
  onClearSearch,
  onShowAllModules,
  onOpenModule,
  onStartExam,
  onShowLeaderboard,
  readingHistory,
  clearHistory,
}: MainContentProps) {
  const previewGroups = Object.entries(moduleGroups).reduce<Record<string, Module[]>>((groups, [subject, subjectModules]) => {
    groups[subject] = searchTerm ? subjectModules : subjectModules.slice(0, 3);
    return groups;
  }, {});
  return (
    <main id="top">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" />{moduleData.eyebrow}</p>
          <h1 id="hero-title">Read with<br /><em>intention.</em></h1>
          <p className="hero-description">{moduleData.description}</p>
          <p className="hero-meta">Sastra Inggris · Universitas Terbuka · Ganjil 2026</p>
          <div className="hero-actions">
            <a className="text-link" href="#module">
              Jelajahi materi <span aria-hidden="true">↓</span>
            </a>
            <a
              href="https://chat.whatsapp.com/BBvjqar5kPIDbrXxyKSZyh?s=cl&p=i&mlu=4"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link text-red-600"
            >
              Gabung grup belajar Sastra Inggris <span aria-hidden="true">↗</span>
            </a>
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
          <p className="section-kicker">{readingHistory.length > 0 ? "Your reading history" : "Inside the module"}</p>
          <h2 id="module-title">{readingHistory.length > 0 ? "Modul yang pernah dibuka" : <>A small shift<br /><em>in how you read.</em></>}</h2>
        </div>
        {readingHistory.length > 0 ? (
          <div className="module-details">
            <p className="module-intro">Riwayat baca tersimpan di browser ini.</p>
            <div className="history-list">
              {readingHistory.map((item) => (
                <div className="history-item" key={item.asset}>
                  <div className="history-item-info">
                    <span className="history-label">{item.label}</span>
                    <span className="history-title">{item.title}</span>
                  </div>
                  <span className="history-time">{new Date(item.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <button className="clear-history-button" type="button" onClick={clearHistory}>Hapus riwayat</button>
          </div>
        ) : (
          <div className="module-details">
            <p className="module-intro">Lihat ringkasan materi, lalu buka modul untuk membaca dan berlatih sesuai waktumu.</p>
            <div className="detail-grid">
              <div><span>Modul</span><strong>{moduleData.label.replace(/^Module\b/, "Modul")}</strong></div>
              <div><span>Format</span><strong>PDF · Mandiri</strong></div>
              <div><span>Tingkat</span><strong>{moduleData.level}</strong></div>
            </div>
            <ul className="highlight-list">
              {moduleData.highlights.map((highlight) => <li key={highlight}><span aria-hidden="true">+</span>{highlight}</li>)}
            </ul>
          </div>
        )}
      </section>

      <section className="catalog-section" id="modules" aria-labelledby="catalog-title">
        <div className="catalog-heading catalog-toolbar">
          <div>
            <p className="catalog-badge"><span aria-hidden="true">✦</span> Perpustakaan belajar</p>
            <h2 id="catalog-title">Materi belajar<br /><em>pilihanmu.</em></h2>
            <p className="catalog-description">Cari berdasarkan mata kuliah, nomor modul, atau topik materi.</p>
          </div>
        </div>
        <div className="search-wrap">
          <label htmlFor="module-search">Cari modul</label>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input id="module-search" type="search" value={searchTerm} onChange={onSearchChange} placeholder="Contoh: Basic Reading atau modul 06" />
          {searchTerm && <button className="clear-search" type="button" onClick={onClearSearch} aria-label="Hapus pencarian">×</button>}
        </div>
        <p className="catalog-count" aria-live="polite">
          {searchTerm ? `${filteredModules.length} modul ditemukan` : `${filteredModules.length} modul tersedia`}
        </p>
        <div className="results-list card-results">
          {Object.entries(previewGroups).map(([subject, subjectModules]) => (
            <div className="subject-group" key={subject}>
              <div className="subject-heading">
                <h3>{formatSubject(subject)}</h3>
                <div className="flex flex-wrap items-center justify-end gap-3">
                  {examSubjects.includes(subject) && (
                    <>
                      <button className="view-all-button" type="button" onClick={() => onStartExam(subject)}>
                        Ujian Mata Kuliah <span aria-hidden="true">⏱</span>
                      </button>
                      <button className="view-all-button" type="button" onClick={() => onShowLeaderboard(subject)}>
                        Leaderboard <span aria-hidden="true">🏆</span>
                      </button>
                    </>
                  )}
                  {!searchTerm && moduleGroups[subject].length > subjectModules.length && (
                    <button className="view-all-button" type="button" onClick={() => onShowAllModules(subject)}>
                      Lihat semua <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="module-cards">
                {subjectModules.map((module) => (
                  <article className="module-card" key={module.asset}>
                    <div className="module-card-top"><div className="module-icon" aria-hidden="true">{module.label.replace(/\D/g, "") || "—"}</div><span className="card-arrow" aria-hidden="true">↗</span></div>
                    <p className="module-meta">{module.level} / {getFileType(module.asset)}</p>
                    <h3>{module.label}</h3>
                    <p className="module-card-description">{formatModuleDescription(module.description)}</p>
                    <button className="module-card-link" type="button" onClick={() => onOpenModule(module)} aria-label={`Buka ${formatSubject(subject)} ${module.label}`}>
                      Buka modul <span aria-hidden="true">→</span>
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ))}
          {filteredModules.length === 0 && (
            <div className="empty-results" role="status">
              <strong>Modul tidak ditemukan.</strong>
              <span>Coba kata kunci lain, seperti nama mata kuliah atau nomor modul.</span>
              <button className="view-all-button" type="button" onClick={onClearSearch}>Hapus pencarian</button>
            </div>
          )}
        </div>
      </section>

      <section className="cta-section">
        <p className="section-kicker">Belajar mandiri</p>
        <h2>Mulai dari<br /><em>rasa ingin tahu.</em></h2>
        <a className="primary-button light-button" href={moduleData.asset} target="_blank" rel="noreferrer">Buka modul <span aria-hidden="true">↗</span></a>
      </section>
    </main>
  );
}
