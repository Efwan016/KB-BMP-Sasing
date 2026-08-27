import type { SoalPG } from './types';

interface Props {
  soal: SoalPG[];
  showKunci: boolean;
  jawabanUser: Record<number, string>;
  onJawab: (no: number, label: string) => void;
}

export default function SoalPilihanGanda({ soal, showKunci, jawabanUser, onJawab }: Props) {
  return (
    <div className="soal-pilihan-ganda">
      {soal.map((s) => (
        <div key={s.no} className="border-b border-[var(--line)] py-4 last:border-0 sm:py-5 print:break-inside-avoid">
          <p className="mb-3 font-[var(--serif)] text-[15px] leading-7 text-[var(--ink)] sm:text-[17px]">{s.no}. {s.pertanyaan}</p>
          <div className="flex flex-col gap-2">
            {s.opsi.map((o) => (
              <label key={o.label} className="flex cursor-pointer items-start gap-2.5 border border-[var(--line)] bg-white/30 px-3 py-2.5 text-[13px] leading-6 text-[var(--ink)] transition hover:border-[var(--coral)] hover:bg-white/60 has-[:checked]:border-[var(--coral)] has-[:checked]:bg-[color-mix(in_srgb,var(--coral)_8%,transparent)] has-[:disabled]:cursor-not-allowed sm:px-3.5">
                <input
                  type="radio"
                  name={`q${s.no}`}
                  value={o.label}
                  checked={jawabanUser[s.no] === o.label}
                  onChange={() => onJawab(s.no, o.label)}
                  disabled={showKunci}
                />
                <span className="min-w-5 shrink-0 font-bold text-[var(--coral)]">{o.label}.</span>
                <span className="flex-1">{o.text}</span>
                {showKunci && jawabanUser[s.no] === o.label && o.label === s.kunci && (
                  <span className="ml-auto font-bold text-[#278b5a] print:hidden" aria-label="Jawaban benar">✓</span>
                )}
              </label>
            ))}
          </div>
          {showKunci && (
            <div className={`mt-2 rounded-sm border px-3 py-2.5 text-[12px] leading-5 ${s.kunci === jawabanUser[s.no] ? 'border-[#278b5a]/35 bg-[#278b5a]/10 text-[#1b6b4a]' : 'border-[var(--coral)]/25 bg-[var(--coral)]/10 text-[#a0402e]'}`}>
              <strong className="text-[var(--ink)]">Kunci: {s.kunci}</strong>
              <p className="mt-1">{s.penjelasan}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
