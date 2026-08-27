import type { SoalEssay as SoalEssayT } from './types';

interface Props {
  soal: SoalEssayT[];
  showKunci: boolean;
  jawabanUser: Record<number, string>;
  onJawab: (no: number, jawaban: string) => void;
}

export default function SoalEssay({ soal, showKunci, jawabanUser, onJawab }: Props) {
  return (
    <div className="soal-essay">
      {soal.map((s) => (
        <div key={s.no} className="border-b border-[var(--line)] py-4 last:border-0 sm:py-5 print:break-inside-avoid">
          <p className="mb-3 font-[var(--serif)] text-[15px] leading-7 text-[var(--ink)] sm:text-[17px]">{s.no}. {s.pertanyaan}</p>
          <div className="flex flex-col gap-2">
            <textarea
              className="min-h-28 w-full resize-y border border-[var(--line-strong)] bg-white/45 px-3 py-2.5 font-[var(--serif)] text-sm leading-6 text-[var(--ink)] outline-none transition placeholder:font-[var(--sans)] placeholder:text-[var(--muted)] focus:border-[var(--coral)] focus:bg-white/65 focus:ring-2 focus:ring-[var(--coral)]/15 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-[var(--muted)]"
              placeholder="Tulis jawaban essay..."
              value={jawabanUser[s.no] ?? ''}
              onChange={(e) => onJawab(s.no, e.target.value)}
              disabled={showKunci}
            />
            {showKunci && (
                <div className="rounded-sm border border-[#278b5a]/35 bg-[#278b5a]/10 px-3 py-2 text-[12px] leading-5 text-[#1b6b4a] print:block">
                  <strong className="text-[var(--ink)]">Kunci: </strong>
                  <p className="mt-1">{s.kunci}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
