import type { Module } from "../types";

type ModuleDetailProps = {
  module: Module;
  relatedModules: Module[];
  onBack: () => void;
  onOpenModule: (module: Module) => void;
};

const getFileType = (asset: string) => asset.split(".").pop()?.toUpperCase() ?? "FILE";

export default function ModuleDetail({ module, relatedModules, onBack, onOpenModule }: ModuleDetailProps) {
  return (
    <main className="detail-page">
      <button className="back-link" type="button" onClick={onBack}><span aria-hidden="true">←</span> Back to library</button>
      <section className="detail-hero" aria-labelledby="detail-title">
        <div className="detail-hero-copy">
          <p className="detail-badge"><span aria-hidden="true">✦</span> {module.title} / {getFileType(module.asset)}</p>
          <h1 id="detail-title">{module.label}<br /><em>in detail.</em></h1>
          <p className="detail-description">{module.description}</p>
          <div className="detail-actions"><a className="primary-button light-button" href={module.asset} target="_blank" rel="noreferrer">Open {getFileType(module.asset)} <span aria-hidden="true">↗</span></a><span className="detail-hint">Self-paced learning<br />for focused practice</span></div>
        </div>
        <div className="detail-index" aria-hidden="true"><span>MODULE</span><strong>{module.label.replace(/\D/g, "") || "—"}</strong><small>{module.level}</small></div>
      </section>
      <section className="detail-body">
        <div>
          <p className="section-kicker">What you will practice</p>
          <h2>Read closer.<br /><em>Build further.</em></h2>
        </div>
        <div className="detail-content">
          <p className="module-intro">This module is a focused step in your learning practice. Take your time with each idea, then return to the text with a sharper point of view.</p>
          <div className="detail-highlight-grid">{module.highlights.map((highlight, index) => <div className="detail-highlight-card" key={highlight}><span>0{index + 1}</span><strong>{highlight}</strong></div>)}</div>
        </div>
      </section>
      {relatedModules.length > 0 && <section className="related-section" aria-labelledby="related-title">
        <div className="catalog-heading"><div><p className="section-kicker">Continue learning</p><h2 id="related-title">More from<br /><em>{module.title}.</em></h2></div></div>
        <div className="related-list">{relatedModules.map((related) => <button className="related-item" type="button" key={related.asset} onClick={() => onOpenModule(related)}><span>{related.label}</span><strong>{related.description}</strong><b aria-hidden="true">↗</b></button>)}</div>
      </section>}
    </main>
  );
}