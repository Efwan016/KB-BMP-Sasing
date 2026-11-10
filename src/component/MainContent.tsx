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
  recentModule?: Module;
  totalModuleCount: number;
  subjectCount: number;
  clearHistory: () => void;
};

const getFileType = (asset: string) => asset.split(".").pop()?.toUpperCase() ?? "FILE";
const formatSubject = (subject: string) => subject.replace(/_/g, " ");

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
  recentModule,
  totalModuleCount,
  subjectCount,
  clearHistory,
}: MainContentProps) {
  const previewGroups = Object.entries(moduleGroups).reduce<Record<string, Module[]>>((groups, [subject, subjectModules]) => {
    groups[subject] = searchTerm ? subjectModules : subjectModules.slice(0, 3);
    return groups;
  }, {});

  return (
    <main className="home-page" id="top">
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="home-eyebrow"><span className="eyebrow-line" />Ruang belajar mandiri · 2026</p>
          <h1 id="hero-title">Belajar lebih<br /><em>terarah.</em></h1>
          <p className="home-hero-description">
            Temukan modul, lanjutkan bacaan, dan latihan sesuai waktumu—semua dalam satu ruang belajar.
          </p>
          <div className="home-hero-actions">
            <a className="home-primary-button" href="#modules">
              Jelajahi modul <span aria-hidden="true">↓</span>
            </a>
            <a
              href="https://chat.whatsapp.com/BBvjqar5kPIDbrXxyKSZyh?s=cl&p=i&mlu=4"
              target="_blank"
              rel="noopener noreferrer"
              className="home-secondary-link"
            >
              Gabung komunitas belajar <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <aside className="home-overview" aria-label="Ringkasan perpustakaan belajar">
          <div className="home-overview-heading">
            <span className="overview-icon" aria-hidden="true">✦</span>
            <p>Perpustakaan belajarmu</p>
          </div>
          <p className="overview-description">Materi tersusun agar kamu mudah memilih langkah berikutnya.</p>
          <div className="overview-stats">
            <div><strong>{totalModuleCount}</strong><span>modul</span></div>
            <div><strong>{subjectCount}</strong><span>mata kuliah</span></div>
            <div><strong>{examSubjects.length}</strong><span>ujian</span></div>
          </div>
          <span className="overview-note">Belajar sedikit demi sedikit tetap berarti.</span>
        </aside>
      </section>

      <section className="resume-section" aria-labelledby="resume-title">
        <div className="section-heading">
          <p className="home-section-kicker">{recentModule ? "Lanjutkan belajar" : "Mulai belajar"}</p>
          <h2 id="resume-title">
            {recentModule ? <>Kembali ke<br />modulmu.</> : <>Pilih langkah<br />pertamamu.</>}
          </h2>
        </div>
        <div className="resume-card">
          <span className="resume-card-icon" aria-hidden="true">{recentModule ? "↗" : "01"}</span>
          <div className="resume-card-copy">
            <p>{recentModule ? formatSubject(recentModule.title) : formatSubject(moduleData.title)} · {recentModule?.label ?? moduleData.label}</p>
            <h3>{recentModule ? "Lanjutkan modul terakhir" : "Jelajahi modul pertama"}</h3>
            <span>{recentModule?.description ?? moduleData.description}</span>
          </div>
          <button
            className="resume-card-action"
            type="button"
            onClick={() => onOpenModule(recentModule ?? moduleData)}
            aria-label={`Buka ${formatSubject(recentModule?.title ?? moduleData.title)} ${recentModule?.label ?? moduleData.label}`}
          >
            Buka modul <span aria-hidden="true">→</span>
          </button>
          {readingHistory.length > 0 && (
            <button className="clear-history-button" type="button" onClick={clearHistory}>Hapus riwayat</button>
          )}
        </div>
      </section>

      <section className="catalog-section" id="modules" aria-labelledby="catalog-title">
        <div className="catalog-heading">
          <div>
            <p className="home-section-kicker">Perpustakaan</p>
            <h2 id="catalog-title">Temukan modul<br /><em>berikutnya.</em></h2>
            <p className="catalog-description">Cari berdasarkan mata kuliah, nomor modul, atau topik yang ingin kamu pelajari.</p>
          </div>
          <p className="catalog-count" aria-live="polite">
            {searchTerm
              ? `${filteredModules.length} dari ${totalModuleCount} modul ditemukan`
              : `${totalModuleCount} modul tersedia`}
          </p>
        </div>
        <div className="search-wrap">
          <label htmlFor="module-search">Cari modul</label>
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input id="module-search" type="search" value={searchTerm} onChange={onSearchChange} placeholder="Contoh: Basic Reading atau modul 06" />
          {searchTerm && <button className="clear-search" type="button" onClick={onClearSearch} aria-label="Hapus pencarian">×</button>}
        </div>
        <div className="results-list card-results">
          {Object.entries(previewGroups).map(([subject, subjectModules]) => (
            <div className="subject-group" key={subject}>
              <div className="subject-heading">
                <div className="subject-title">
                  <h3>{formatSubject(subject)}</h3>
                  <span>{moduleGroups[subject].length} modul</span>
                </div>
                <div className="subject-actions">
                  {examSubjects.includes(subject) && (
                    <>
                      <button className="view-all-button" type="button" onClick={() => onStartExam(subject)}>
                        Mulai ujian <span aria-hidden="true">⏱</span>
                      </button>
                      <button className="view-all-button" type="button" onClick={() => onShowLeaderboard(subject)}>
                        Papan peringkat <span aria-hidden="true">🏆</span>
                      </button>
                    </>
                  )}
                  {!searchTerm && moduleGroups[subject].length > subjectModules.length && (
                    <button className="view-all-button" type="button" onClick={() => onShowAllModules(subject)}>
                      Semua modul <span aria-hidden="true">→</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="module-cards">
                {subjectModules.map((module) => (
                  <article className="module-card" key={module.asset}>
                    <div className="module-card-top"><div className="module-icon" aria-hidden="true">{module.label.replace(/\D/g, "") || "—"}</div><span className="card-arrow" aria-hidden="true">{getFileType(module.asset)}</span></div>
                    <p className="module-meta">{module.level}</p>
                    <h3>{module.label}</h3>
                    <p className="module-card-description">{module.description}</p>
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

      <section className="home-help" aria-label="Dukungan belajar">
        <span aria-hidden="true">✦</span>
        <p>Belajar bareng terasa lebih ringan.</p>
        <a href="https://chat.whatsapp.com/BBvjqar5kPIDbrXxyKSZyh?s=cl&p=i&mlu=4" target="_blank" rel="noopener noreferrer">
          Gabung komunitas WhatsApp <span aria-hidden="true">↗</span>
        </a>
      </section>
    </main>
  );
}
