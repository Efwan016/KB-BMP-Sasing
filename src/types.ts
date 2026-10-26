export type Module = {
  title: string;
  description: string;
  eyebrow: string;
  label: string;
  duration: string;
  level: string;
  asset: string;
  videoUrl?: string;
  highlights: string[];
  exam?: ExamConfig;
};

export type ExamConfig = {
  durasiMenit: number;
  jumlahSoal: number;
  acak: boolean;
  maxPelanggaran: number;
  cooldownJam: number;
  cooldownScope: "modul" | "semua";
  aturan: string[];
};

export type Peserta = {
  nim: string;
  nama: string;
};

export type ViolationCode = "L-01" | "L-02";

export type ExamViolation = {
  kode: ViolationCode;
  mulai: string;
  kembali: string;
  durasiDetik: number;
  ke: number;
  serverRecorded?: boolean;
};

export type ExamAttempt = {
  id: string;
  startedAt: number;
  expiresAt: number;
  serverOffsetMs: number;
  answers: Record<number, string>;
  violations: ExamViolation[];
};

export type ExamResult = {
  attemptId: string;
  startedAt: number;
  finishedAt: number;
  score: number;
  correctCount?: number;
  objectiveCount?: number;
  status: "selesai" | "waktu_habis" | "dihentikan_pelanggaran";
  answers: Record<number, string>;
  violations: ExamViolation[];
};

export type ReadingHistoryItem = {
  asset: string;
  label: string;
  title: string;
  timestamp: number;
};