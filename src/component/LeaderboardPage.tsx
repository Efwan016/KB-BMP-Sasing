import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type LeaderboardEntry = {
  posisi: number;
  nama: string;
  skor: number;
  durasi_detik: number;
};

type Props = {
  mataKuliah: string;
  onBack: () => void;
};

const SUBJECT_LABELS: Record<string, string> = {
  Bahasa_Indonesia: "Bahasa Indonesia",
  Basic_Reading: "Basic Reading",
  Basic_Writting: "Basic Writing",
  Cybermedia: "Cybermedia",
  PKN: "PKN",
  Pancasila: "Pancasila",
};

const parseEntries = (value: unknown): LeaderboardEntry[] => {
  if (!Array.isArray(value)) throw new Error("Format leaderboard dari server tidak valid.");

  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== "object") throw new Error("Data peringkat dari server tidak valid.");
    const row = entry as Record<string, unknown>;
    const posisi = Number(row.posisi);
    const skor = Number(row.skor);
    const durasi = Number(row.durasi_detik);
    if (
      !Number.isInteger(posisi) || posisi < 1 ||
      typeof row.nama !== "string" || !row.nama.trim() ||
      !Number.isFinite(skor) || skor < 0 || skor > 100 ||
      !Number.isInteger(durasi) || durasi < 0
    ) {
      throw new Error("Data peringkat dari server tidak valid.");
    }
    return { posisi, nama: row.nama, skor, durasi_detik: durasi };
  });
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
    : `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function LeaderboardPage({ mataKuliah, onBack }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const subjectLabel = SUBJECT_LABELS[mataKuliah] ?? mataKuliah;

  useEffect(() => {
    let active = true;
    const loadLeaderboard = async () => {
      try {
        const { data, error: requestError } = await supabase.rpc("leaderboard_ujian", {
          p_matkul: mataKuliah,
          p_limit: 10,
        });
        if (requestError) throw requestError;
        const nextEntries = parseEntries(data);
        if (active) {
          setEntries(nextEntries);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(`Leaderboard belum dapat dimuat: ${loadError instanceof Error ? loadError.message : "kesalahan server"}`);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadLeaderboard();
    return () => { active = false; };
  }, [mataKuliah, reloadKey]);

  const retry = () => {
    setLoading(true);
    setReloadKey((current) => current + 1);
  };

  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-4xl px-4 py-8 text-[var(--ink)] sm:px-8 sm:py-12">
      <button className="mb-7 text-sm font-semibold text-[var(--muted)] underline" type="button" onClick={onBack}>← Kembali</button>
      <section className="border border-[var(--line)] bg-white/20 p-5 sm:p-8">
        <p className="section-kicker">Papan peringkat</p>
        <h1 className="mb-3 font-[var(--serif)] text-4xl">Leaderboard — {subjectLabel}</h1>
        <p className="mb-6 text-sm leading-6 text-[var(--muted)]">
          Menampilkan 10 skor terbaik. Setiap peserta hanya muncul sekali; skor yang sama diurutkan berdasarkan siapa yang mencapainya lebih dulu.
          Nama samaran, skor, dan durasi pengerjaan ditampilkan kepada pengunjung.
        </p>

        {loading ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]" role="status">Memuat peringkat...</p>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="mb-4 text-sm text-red-700" role="alert">{error}</p>
            <button className="view-all-button" type="button" onClick={retry}>Coba lagi</button>
          </div>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--muted)]">Belum ada hasil ujian yang masuk peringkat. Jadilah yang pertama!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b-2 border-[var(--ink)]">
                  <th className="px-3 py-3 font-bold" scope="col">#</th>
                  <th className="px-3 py-3 font-bold" scope="col">Nama samaran</th>
                  <th className="px-3 py-3 text-right font-bold" scope="col">Skor</th>
                  <th className="px-3 py-3 text-right font-bold" scope="col">Durasi</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr className="border-b border-[var(--line)]" key={`${entry.posisi}-${entry.nama}`}>
                    <td className="px-3 py-3 font-bold">{entry.posisi}</td>
                    <td className="px-3 py-3 font-semibold">{entry.nama}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{entry.skor}/100</td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">{formatDuration(entry.durasi_detik)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
