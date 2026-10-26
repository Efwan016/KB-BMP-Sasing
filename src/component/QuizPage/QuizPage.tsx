import { useState, useEffect, useCallback } from 'react';
import SoalPilihanGanda from './SoalPilihanGanda';
import SoalIsianSingkat from './SoalIsianSingkat';
import SoalEssay from './SoalEssay';
import SoalAplikasiKonteks from './SoalAplikasiKonteks';
import type { LatihanSoalData, SoalPG, SoalIsian, SoalEssay as SoalEssayT, SoalAplikasiKonteks as SoalAK } from './types';
import { supabase } from '../../lib/supabase';

type MataKuliah = 'Bahasa_Indonesia' | 'Basic_Reading' | 'Basic_Writting' | 'Cybermedia' | 'PKN' | 'Pancasila';

interface Props {
  mataKuliah: string;
  modul: number;
  judulModul: string;
  onBack: () => void;
}

const normalizeSubject = (raw: string): MataKuliah | null => {
  const map: Record<string, MataKuliah> = {
    'bahasa_indonesia': 'Bahasa_Indonesia',
    'bahasa-indonesia': 'Bahasa_Indonesia',
    'basic_reading': 'Basic_Reading',
    'basic-reading': 'Basic_Reading',
    'basic_writting': 'Basic_Writting',
    'basic-writting': 'Basic_Writting',
    'cybermedia': 'Cybermedia',
    'pkn': 'PKN',
    'pancasila': 'Pancasila',
  };
  return map[raw.toLowerCase().replace(/[^a-z0-9-]/g, '')] ?? null;
};

const isLatihanSoalData = (value: unknown): value is LatihanSoalData => {
  if (!value || typeof value !== 'object') return false;
  const bank = value as Record<string, unknown>;
  return typeof bank.mataKuliah === 'string' && Array.isArray(bank.moduls) &&
    bank.moduls.every((module) => {
      if (!module || typeof module !== 'object') return false;
      const row = module as Record<string, unknown>;
      return Number.isInteger(row.modul) && typeof row.judul === 'string' &&
        Boolean(row.soal) && typeof row.soal === 'object';
    });
};

export default function QuizPage({ mataKuliah: rawMK, modul, judulModul: judulProps, onBack }: Props) {
  const subject = normalizeSubject(rawMK);

  const [data, setData] = useState<LatihanSoalData | null>(null);
  const [showKunci, setShowKunci] = useState(false);
  const [jawabanUser, setJawabanUser] = useState<Record<number, string>>({});

  // Error & loading initial state 디결정 di render-time (bukan di dalam useEffect)
  const initialLoading = Boolean(subject);
  const initialError: string | null = !subject
    ? 'Mata kuliah tidak dikenali.'
    : null;

  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(initialError);

  const soalModul = data?.moduls.find((m) => m.modul === modul);
  const dynamicJudul = soalModul?.judul ?? judulProps;

  useEffect(() => {
    if (!subject) return;
    let active = true;
    const loadBank = async () => {
      try {
        const { data: bank, error: bankError } = await supabase.rpc('ambil_latihan_soal', { p_matkul: subject });
        if (bankError) throw bankError;
        if (!isLatihanSoalData(bank)) throw new Error('Format bank latihan dari server tidak valid.');
        if (bank.mataKuliah !== subject && !(subject === 'Basic_Writting' && bank.mataKuliah === 'Basic_Writing')) {
          throw new Error('Bank latihan yang diterima tidak cocok dengan mata kuliah.');
        }
        if (active) setData(bank);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Gagal memuat bank latihan.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadBank();
    return () => { active = false; };
  }, [subject]);

  const handleJawabPG = useCallback((no: number, label: string) => {
    setJawabanUser((prev) => ({ ...prev, [no]: label }));
  }, []);

  const handleJawabIsian = useCallback((no: number, jawaban: string) => {
    setJawabanUser((prev) => ({ ...prev, [no]: jawaban }));
  }, []);

  const handleJawabEssay = useCallback((no: number, jawaban: string) => {
    setJawabanUser((prev) => ({ ...prev, [no]: jawaban }));
  }, []);

  if (loading) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-4 py-16 text-[var(--muted)] sm:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="size-9 animate-spin rounded-full border-[3px] border-[var(--line)] border-t-[var(--coral)]" aria-hidden="true" />
          <p className="text-sm">Memuat soal...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-4 py-16 text-[var(--muted)] sm:px-8">
        <div className="max-w-lg text-center">
          <h2 className="font-[var(--serif)] text-3xl font-normal text-[var(--coral)] sm:text-4xl">Error</h2>
          <p className="mt-3 text-sm leading-7">{error}</p>
        </div>
      </main>
    );
  }

  if (!data || !soalModul) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl items-center justify-center px-4 py-16 text-[var(--muted)] sm:px-8">
        <div className="max-w-lg text-center">
          <h2 className="font-[var(--serif)] text-3xl font-normal text-[var(--coral)] sm:text-4xl">Soal tidak ditemukan</h2>
          <p className="mt-3 text-sm leading-7">Modul {modul} belum memiliki data latihan soal.</p>
        </div>
      </main>
    );
  }

  const pilihanGanda: SoalPG[] = soalModul.soal.pilihanGanda.map((soal, index) => ({ ...soal, no: index + 1 }));
  const isianSingkat: SoalIsian[] = soalModul.soal.isianSingkat.map((soal, index) => ({ ...soal, no: pilihanGanda.length + index + 1 }));
  const essay: SoalEssayT[] = soalModul.soal.essay.map((soal, index) => ({ ...soal, no: pilihanGanda.length + isianSingkat.length + index + 1 }));
  const aplikasiKonteks: SoalAK[] = soalModul.soal.aplikasiKonteks.map((soal, index) => ({ ...soal, no: pilihanGanda.length + isianSingkat.length + essay.length + index + 1 }));
  const totalSoal = pilihanGanda.length + isianSingkat.length + essay.length + aplikasiKonteks.length;
  const totalObjektif = pilihanGanda.length + aplikasiKonteks.length;
  const jumlahTerjawab = Object.keys(jawabanUser).length;
  const jumlahBenar = [
    ...pilihanGanda.map((soal) => jawabanUser[soal.no] === soal.kunci),
    ...aplikasiKonteks.map((soal) => jawabanUser[soal.no] === soal.kunci),
  ].filter(Boolean).length;
  const nilaiOtomatis = totalObjektif === 0 ? 0 : Math.round((jumlahBenar / totalObjektif) * 100);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 text-[var(--ink)] sm:px-8 sm:py-12 lg:px-10 lg:py-14 print:max-w-none print:bg-white print:px-12 print:py-6 print:text-black">
      <header className="mb-8 flex flex-col gap-5 border-b border-[var(--line)] pb-7 sm:mb-10 sm:gap-6 print:mb-5 print:border-b-2 print:border-black">
        <button
          className="inline-flex w-fit items-center gap-2 text-xs font-bold text-[var(--muted)] transition hover:text-[var(--coral)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)] print:hidden"
          type="button"
          onClick={onBack}
        >
          <span className="text-lg leading-none" aria-hidden="true">←</span>
          Kembali ke modul
        </button>
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--coral)] sm:text-[11px]">{rawMK} / Modul {modul}</p>
          <h1 className="font-[var(--serif)] text-[clamp(2rem,5vw,3.25rem)] font-normal leading-[1.05] tracking-[-0.04em] text-[var(--ink)] print:text-black">
            Latihan Soal
            <br />
            <em className="text-[var(--coral)]">{dynamicJudul}</em>
          </h1>
        </div>
        <div className="flex w-full gap-2 sm:w-auto sm:justify-end print:hidden">
          <button
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 bg-[var(--ink)] px-3 py-2 text-[11px] font-bold tracking-[0.03em] text-[var(--paper)] transition hover:-translate-y-0.5 hover:bg-[var(--coral)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)] sm:flex-none sm:px-4"
            type="button"
            onClick={() => setShowKunci((v) => !v)}
          >
            {showKunci ? 'Sembunyikan Kunci' : 'Lihat Kunci Jawaban'}
            <span aria-hidden="true">↕</span>
          </button>
          <button
            className="inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 border border-[var(--line-strong)] bg-transparent px-3 py-2 text-[11px] font-bold tracking-[0.03em] text-[var(--ink)] transition hover:-translate-y-0.5 hover:border-[var(--coral)] hover:text-[var(--coral)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)] sm:flex-none sm:px-4"
            type="button"
            onClick={() => window.print()}
          >
            Cetak
            <span aria-hidden="true">⌘</span>
          </button>
        </div>
      </header>

      <section className="flex flex-col gap-9 sm:gap-12">
        <div className="pt-1">
          <h2 className="mb-4 flex flex-col gap-1 border-b-2 border-[var(--ink)] pb-2 font-[var(--serif)] text-xl font-normal tracking-[-0.02em] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-2xl">
            Bagian A: Pilihan Ganda
            <span className="font-[var(--sans)] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{pilihanGanda.length} soal</span>
          </h2>
          <SoalPilihanGanda
            soal={pilihanGanda}
            showKunci={showKunci}
            jawabanUser={jawabanUser}
            onJawab={handleJawabPG}
          />
        </div>

        <div className="pt-1">
          <h2 className="mb-4 flex flex-col gap-1 border-b-2 border-[var(--ink)] pb-2 font-[var(--serif)] text-xl font-normal tracking-[-0.02em] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-2xl">
            Bagian B: Isian Singkat
            <span className="font-[var(--sans)] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{isianSingkat.length} soal</span>
          </h2>
          <SoalIsianSingkat
            soal={isianSingkat}
            showKunci={showKunci}
            jawabanUser={jawabanUser}
            onJawab={handleJawabIsian}
          />
        </div>

        <div className="pt-1">
          <h2 className="mb-4 flex flex-col gap-1 border-b-2 border-[var(--ink)] pb-2 font-[var(--serif)] text-xl font-normal tracking-[-0.02em] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-2xl">
            Bagian C: Essay
            <span className="font-[var(--sans)] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{essay.length} soal</span>
          </h2>
          <SoalEssay
            soal={essay}
            showKunci={showKunci}
            jawabanUser={jawabanUser}
            onJawab={handleJawabEssay}
          />
        </div>

        <div className="pt-1">
          <h2 className="mb-4 flex flex-col gap-1 border-b-2 border-[var(--ink)] pb-2 font-[var(--serif)] text-xl font-normal tracking-[-0.02em] sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-2xl">
            Bagian D: Aplikasi Konteks
            <span className="font-[var(--sans)] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">{aplikasiKonteks.length} soal</span>
          </h2>
          <SoalAplikasiKonteks
            soal={aplikasiKonteks}
            showKunci={showKunci}
            jawabanUser={jawabanUser}
            onJawab={handleJawabPG}
          />
        </div>

        <footer className="mt-1 flex flex-col gap-4 border-t-2 border-[var(--ink)] pt-5 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div>
            <p className="text-sm font-bold text-[var(--ink)]">{jumlahTerjawab} dari {totalSoal} soal terjawab</p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Isian singkat dan essay tidak masuk nilai otomatis.</p>
          </div>
          {showKunci ? (
            <div className="border-l-2 border-[var(--coral)] pl-4 sm:text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Nilai otomatis</p>
              <p className="font-[var(--serif)] text-3xl leading-none text-[var(--coral)]">{nilaiOtomatis}<span className="text-base text-[var(--muted)]">/100</span></p>
              <p className="mt-1 text-xs text-[var(--muted)]">{jumlahBenar} benar dari {totalObjektif}</p>
            </div>
          ) : (
            <button
              className="inline-flex min-h-11 w-full items-center justify-center bg-[var(--coral)] px-5 py-2.5 text-xs font-bold tracking-[0.04em] text-white transition hover:-translate-y-0.5 hover:bg-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--coral)] sm:w-auto"
              type="button"
              onClick={() => setShowKunci(true)}
            >
              Selesai &amp; Lihat Nilai <span aria-hidden="true">→</span>
            </button>
          )}
        </footer>
      </section>
    </main>
  );
}
