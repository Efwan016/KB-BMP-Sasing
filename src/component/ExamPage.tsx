import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import type { ExamAttempt, ExamConfig, ExamResult, ExamViolation, Peserta } from "../types";
import SoalAplikasiKonteks from "./QuizPage/SoalAplikasiKonteks";
import SoalEssay from "./QuizPage/SoalEssay";
import SoalIsianSingkat from "./QuizPage/SoalIsianSingkat";
import SoalPilihanGanda from "./QuizPage/SoalPilihanGanda";
import type { LatihanSoalData, SoalAplikasiKonteks as SoalAK, SoalEssay as SoalEssayType, SoalIsian, SoalPG } from "./QuizPage/types";
import useExamGuard from "../hooks/useExamGuard";
import useExamRoomMonitor from "../hooks/useExamRoomMonitor";

const PARTICIPANT_KEY = "exam:peserta";
const ATTEMPT_KEY = (subject: string, module: number) => `exam:attempt:${subject}:${module}`;
const RESULT_KEY = (subject: string, module: number) => `exam:result:${subject}:${module}`;
const QUEUE_KEY = (subject: string, module: number) => `exam:pending:${subject}:${module}`;
const SUBJECT_LABELS: Record<string, string> = {
  Bahasa_Indonesia: "Bahasa Indonesia",
  Basic_Reading: "Basic Reading",
  Basic_Writting: "Basic Writing",
  Cybermedia: "Cybermedia",
  PKN: "PKN",
  Pancasila: "Pancasila",
};

type Props = {
  mataKuliah: string;
  modul: number;
  config: ExamConfig;
  onBack: () => void;
};

type ResultPayload = {
  p_nim: string;
  p_nama: string;
  p_attempt_id: string;
  p_matkul: string;
  p_modul: number;
  p_jawaban: Record<string, string>;
  p_pelanggaran: ExamViolation[];
};

type ServerResult = {
  result_id: string;
  skor: number;
  jumlah_benar: number;
  jumlah_objektif: number;
  status: ExamResult["status"];
};

type QuestionWithSource<T> = T & { sourceNo: number };

const readStored = <T,>(key: string): T | null => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) as T : null;
};

const seededShuffle = <T,>(values: T[], seed: string): T[] => {
  const shuffled = [...values];
  let state = [...seed].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7) || 1;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const target = (state >>> 0) % (index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
};

const rpcError = (message: string) => new Error(message);

const ensureAuthSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session) return data.session;

  const { data: anonymousData, error: anonymousError } = await supabase.auth.signInAnonymously();
  if (anonymousError) throw anonymousError;
  if (!anonymousData.session) throw rpcError("Supabase tidak mengembalikan sesi peserta.");
  return anonymousData.session;
};

const isPeserta = (value: unknown): value is Peserta => {
  if (!value || typeof value !== "object") return false;
  const participant = value as Record<string, unknown>;
  return typeof participant.nim === "string" && typeof participant.nama === "string";
};

const samePeserta = (left: Peserta | null, right: Peserta) =>
  left?.nim === right.nim && left.nama.toLocaleLowerCase() === right.nama.toLocaleLowerCase();

const isQuestionBank = (value: unknown): value is LatihanSoalData => {
  if (!value || typeof value !== "object") return false;
  const bank = value as Record<string, unknown>;
  return typeof bank.mataKuliah === "string" && Array.isArray(bank.moduls) &&
    bank.moduls.every((module) => {
      if (!module || typeof module !== "object") return false;
      const row = module as Record<string, unknown>;
      return Number.isInteger(row.modul) && typeof row.judul === "string" &&
        Boolean(row.soal) && typeof row.soal === "object";
    });
};

export default function ExamPage({ mataKuliah, modul, config, onBack }: Props) {
  const subjectLabel = SUBJECT_LABELS[mataKuliah] ?? mataKuliah;
  const subjectAvailable = Object.hasOwn(SUBJECT_LABELS, mataKuliah);
  const attemptKey = ATTEMPT_KEY(mataKuliah, modul);
  const resultKey = RESULT_KEY(mataKuliah, modul);
  const queueKey = QUEUE_KEY(mataKuliah, modul);
  const [participant, setParticipant] = useState<Peserta | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(() => readStored<ExamAttempt>(attemptKey));
  const [result, setResult] = useState<ExamResult | null>(() => readStored<ExamResult>(resultKey));
  const [questions, setQuestions] = useState<LatihanSoalData | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [formMode, setFormMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [nim, setNim] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState(() => subjectAvailable ? "" : `Bank soal ujian untuk ${subjectLabel} belum tersedia.`);
  const [warning, setWarning] = useState("");
  const [violationModal, setViolationModal] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const [cooldownTick, setCooldownTick] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [violationCount, setViolationCount] = useState(() => attempt?.violations.length ?? 0);
  const [syncPending, setSyncPending] = useState(() => Boolean(localStorage.getItem(queueKey)));
  const [busy, setBusy] = useState(false);
  const [pendingRestoreStatus, setPendingRestoreStatus] = useState<ExamResult["status"] | null>(null);
  const { start: startRoomMonitor, stop: stopRoomMonitor } = useExamRoomMonitor({
    onWarning: (message) => setWarning(message),
  });
  const [restoringAttempt, setRestoringAttempt] = useState(Boolean(attempt && participant && !result));
  const submitStarted = useRef(false);
  const syncStarted = useRef(false);
  const submitRef = useRef<(status: ExamResult["status"]) => Promise<void>>(async () => undefined);
  const retrySyncRef = useRef<() => Promise<void>>(async () => undefined);
  const restoreAttemptRef = useRef<() => Promise<void>>(async () => undefined);
  const restoredAttemptId = useRef<string | null>(null);

  const active = Boolean(attempt && !result);
  const initialPhase = result ? "result" : attempt && participant ? "runner" : participant ? "rules" : "identity";
  const [phase, setPhase] = useState<"identity" | "rules" | "runner" | "result">(initialPhase);
  const orderSeed = attempt?.id ?? "preview";

  useEffect(() => {
    let mounted = true;

    const restoreParticipant = async () => {
      try {
        await ensureAuthSession();
        const { data, error: sessionError } = await supabase.rpc("peserta_sesi");
        if (sessionError) throw sessionError;
        if (!mounted) return;

        if (!isPeserta(data)) {
          setParticipant(null);
          setPhase("identity");
          return;
        }

        const previousStoredParticipant = readStored<unknown>(PARTICIPANT_KEY);
        const previousParticipant = isPeserta(previousStoredParticipant) ? previousStoredParticipant : null;
        const storedAttempt = readStored<ExamAttempt>(attemptKey);
        const storedResult = readStored<ExamResult>(resultKey);
        if (previousParticipant && !samePeserta(previousParticipant, data)) {
          localStorage.removeItem(attemptKey);
          localStorage.removeItem(resultKey);
          localStorage.removeItem(queueKey);
          setAttempt(null);
          setResult(null);
          setSyncPending(false);
          setViolationCount(0);
        }
        localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(data));
        setParticipant(data);
        setAttempt(previousParticipant && !samePeserta(previousParticipant, data) ? null : storedAttempt);
        setResult(previousParticipant && !samePeserta(previousParticipant, data) ? null : storedResult);
        setPhase(storedResult && (!previousParticipant || samePeserta(previousParticipant, data)) ? "result" : storedAttempt && (!previousParticipant || samePeserta(previousParticipant, data)) ? "runner" : "rules");
      } catch (sessionError) {
        if (!mounted) return;
        setParticipant(null);
        setPhase("identity");
        setError(`Tidak dapat menyiapkan sesi login: ${sessionError instanceof Error ? sessionError.message : "kesalahan autentikasi"}. Pastikan Anonymous Sign-In aktif di Supabase Auth.`);
      } finally {
        if (mounted) setAuthReady(true);
      }
    };

    void restoreParticipant();
    return () => { mounted = false; };
  }, [attemptKey, queueKey, resultKey]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `Mode Ujian ${subjectLabel}`;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const previous = meta?.content;
    if (meta) meta.content = "noindex, nofollow";
    return () => {
      document.title = previousTitle;
      if (meta && previous) meta.content = previous;
    };
  }, [subjectLabel]);

  const restoreAttempt = async () => {
    if (!attempt || !participant) return;
    setRestoringAttempt(true);
    setError("");
    try {
      const clientNow = Date.now();
      const { data, error: resumeError } = await supabase.rpc("lanjutkan_ujian", {
        p_nim: participant.nim,
        p_nama: participant.nama,
        p_attempt_id: attempt.id,
      });
      if (resumeError) throw resumeError;
      if (!data || typeof data !== "object") throw rpcError("Server tidak mengembalikan sesi ujian yang valid.");
      const response = data as Record<string, unknown>;
      const startedAt = Date.parse(String(response.started_at ?? ""));
      const expiresAt = Date.parse(String(response.expires_at ?? ""));
      const serverNow = Date.parse(String(response.server_now ?? ""));
      const status = response.status;
      if (!Number.isFinite(startedAt) || !Number.isFinite(expiresAt) || !Number.isFinite(serverNow)) {
        throw rpcError("Waktu sesi ujian dari server tidak valid.");
      }
      const { data: bankData, error: bankError } = await supabase.rpc("ambil_soal_ujian", {
        p_matkul: mataKuliah,
        p_attempt_id: attempt.id,
      });
      if (bankError) throw bankError;
      if (!isQuestionBank(bankData) || bankData.mataKuliah !== mataKuliah) {
        throw rpcError("Server tidak mengembalikan bank soal ujian yang valid.");
      }
      setQuestions(bankData);
      if (status === "aktif") await startRoomMonitor();
      const restored: ExamAttempt = {
        ...attempt,
        startedAt,
        expiresAt,
        serverOffsetMs: serverNow - clientNow,
      };
      localStorage.setItem(attemptKey, JSON.stringify(restored));
      setAttempt(restored);
      setViolationCount(Number(response.jumlah_pelanggaran ?? restored.violations.length));
      if (status === "dihentikan_pelanggaran") {
        setPendingRestoreStatus("dihentikan_pelanggaran");
      }
    } catch (resumeError) {
      stopRoomMonitor();
      if (resumeError instanceof Error && resumeError.message.includes("Sesi ujian tidak dikenal")) {
        setError("Sesi ujian lama belum tercatat di server. Jawaban lama tetap tersimpan di perangkat; mulai ulang akan membuat sesi server yang baru.");
        setAttempt(null);
        setPhase("rules");
        return;
      }
      setError(`Sesi ujian belum dapat diverifikasi server: ${resumeError instanceof Error ? resumeError.message : "kesalahan server"}`);
    } finally {
      setRestoringAttempt(false);
    }
  };

  useEffect(() => {
    restoreAttemptRef.current = restoreAttempt;
  });

  useEffect(() => {
    if (!pendingRestoreStatus || !attempt || !participant || !questions) return;
    const timer = window.setTimeout(() => {
      void submitRef.current(pendingRestoreStatus);
      setPendingRestoreStatus(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [attempt, participant, pendingRestoreStatus, questions]);

  useEffect(() => {
    if (!attempt || !participant || result || restoredAttemptId.current === attempt.id) return;
    restoredAttemptId.current = attempt.id;
    void restoreAttemptRef.current();
  }, [attempt, participant, result]);

  const soalModul = questions?.moduls.find((item) => item.modul === modul);
  const seededData = useMemo(() => {
    if (!soalModul) return null;
    const pg = config.acak ? seededShuffle(soalModul.soal.pilihanGanda, `${orderSeed}-pg`) : soalModul.soal.pilihanGanda;
    const isian = config.acak ? seededShuffle(soalModul.soal.isianSingkat, `${orderSeed}-isian`) : soalModul.soal.isianSingkat;
    const essay = config.acak ? seededShuffle(soalModul.soal.essay, `${orderSeed}-essay`) : soalModul.soal.essay;
    const aplikasi = config.acak ? seededShuffle(soalModul.soal.aplikasiKonteks, `${orderSeed}-aplikasi`) : soalModul.soal.aplikasiKonteks;
    let questionNumber = 0;
    const numberedPg: QuestionWithSource<SoalPG>[] = pg.map((item) => ({ ...item, sourceNo: item.no, no: ++questionNumber }));
    const numberedIsian: QuestionWithSource<SoalIsian>[] = isian.map((item) => ({ ...item, sourceNo: item.no, no: ++questionNumber }));
    const numberedEssay: QuestionWithSource<SoalEssayType>[] = essay.map((item) => ({ ...item, sourceNo: item.no, no: ++questionNumber }));
    const numberedAplikasi: QuestionWithSource<SoalAK>[] = aplikasi.map((item) => ({ ...item, sourceNo: item.no, no: ++questionNumber }));
    return {
      pilihanGanda: numberedPg.filter((item) => item.no <= config.jumlahSoal),
      isianSingkat: numberedIsian.filter((item) => item.no <= config.jumlahSoal),
      essay: numberedEssay.filter((item) => item.no <= config.jumlahSoal),
      aplikasiKonteks: numberedAplikasi.filter((item) => item.no <= config.jumlahSoal),
    };
  }, [soalModul, config.acak, config.jumlahSoal, orderSeed]);

  useEffect(() => {
    if (!attempt || result || restoringAttempt) return;
    const updateRemaining = () => {
      const seconds = Math.max(0, Math.ceil((attempt.expiresAt - (Date.now() + attempt.serverOffsetMs)) / 1000));
      setRemainingSeconds(seconds);
      if (seconds === 0 && !submitStarted.current) void submitRef.current("waktu_habis");
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [attempt, result, restoringAttempt]);

  const shuffledData = seededData;
  const objectiveQuestions = [...(shuffledData?.pilihanGanda ?? []), ...(shuffledData?.aplikasiKonteks ?? [])];
  const totalObjective = objectiveQuestions.length;
  const correctAnswers = objectiveQuestions.filter((question) => attempt?.answers[question.no] === question.kunci).length;
  const score = totalObjective ? Math.round((correctAnswers / totalObjective) * 100) : 0;
  const totalQuestions = config.jumlahSoal;

  const toStableAnswers = (answers: Record<number, string>, data: NonNullable<typeof shuffledData>) => {
    const stableAnswers: Record<string, string> = {};
    for (const question of data.pilihanGanda) if (answers[question.no] !== undefined) stableAnswers[`pilihanGanda:${question.sourceNo}`] = answers[question.no];
    for (const question of data.isianSingkat) if (answers[question.no] !== undefined) stableAnswers[`isianSingkat:${question.sourceNo}`] = answers[question.no];
    for (const question of data.essay) if (answers[question.no] !== undefined) stableAnswers[`essay:${question.sourceNo}`] = answers[question.no];
    for (const question of data.aplikasiKonteks) if (answers[question.no] !== undefined) stableAnswers[`aplikasiKonteks:${question.sourceNo}`] = answers[question.no];
    return stableAnswers;
  };

  const submitPayload = useCallback(async (payload: ResultPayload): Promise<ServerResult> => {
    const { data, error: saveError } = await supabase.rpc("simpan_hasil", payload);
    if (saveError) throw saveError;
    if (!data || typeof data !== "object") throw rpcError("Server tidak mengembalikan hasil ujian yang valid.");
    const response = data as Record<string, unknown>;
    const serverResult: ServerResult = {
      result_id: String(response.result_id ?? ""),
      skor: Number(response.skor),
      jumlah_benar: Number(response.jumlah_benar),
      jumlah_objektif: Number(response.jumlah_objektif),
      status: response.status as ExamResult["status"],
    };
    if (!serverResult.result_id || !Number.isFinite(serverResult.skor) || !Number.isFinite(serverResult.jumlah_benar) ||
      !Number.isFinite(serverResult.jumlah_objektif) || !["selesai", "waktu_habis", "dihentikan_pelanggaran"].includes(serverResult.status)) {
      throw rpcError("Respons hasil dari server tidak lolos validasi.");
    }
    return serverResult;
  }, []);

  async function submitExam(status: ExamResult["status"], attemptOverride?: ExamAttempt) {
    const submittingAttempt = attemptOverride ?? attempt;
    if (!submittingAttempt || !participant || !shuffledData || submitStarted.current) return;
    stopRoomMonitor();
    submitStarted.current = true;
    setBusy(true);
    const finishedAt = Date.now();
    const confirmedViolations = [...submittingAttempt.violations];
    const payload: ResultPayload = {
      p_nim: participant.nim,
      p_nama: participant.nama,
      p_attempt_id: submittingAttempt.id,
      p_matkul: mataKuliah,
      p_modul: modul,
      p_jawaban: toStableAnswers(submittingAttempt.answers, shuffledData),
      p_pelanggaran: confirmedViolations,
    };
    try {
      for (let index = 0; index < confirmedViolations.length; index += 1) {
        const violation = confirmedViolations[index];
        if (violation.serverRecorded) continue;
        const { data, error: violationError } = await supabase.rpc("catat_pelanggaran", {
          p_nim: participant.nim,
          p_nama: participant.nama,
          p_attempt_id: submittingAttempt.id,
          p_matkul: mataKuliah,
          p_modul: modul,
          p_kode: violation.kode,
          p_mulai: violation.mulai,
          p_kembali: violation.kembali,
          p_durasi_detik: violation.durasiDetik,
        });
        if (violationError) throw violationError;
        const count = typeof data === "object" && data && "jumlah_pelanggaran" in data
          ? Number(data.jumlah_pelanggaran)
          : Number(data);
        if (!Number.isFinite(count)) throw rpcError("Server tidak mengembalikan jumlah pelanggaran yang valid.");
        confirmedViolations[index] = { ...violation, ke: count, serverRecorded: true };
      }
      const confirmedAttempt = { ...submittingAttempt, violations: confirmedViolations };
      setAttempt(confirmedAttempt);
      localStorage.setItem(attemptKey, JSON.stringify(confirmedAttempt));
      payload.p_pelanggaran = confirmedViolations;
      const optimisticResult: ExamResult = {
        attemptId: submittingAttempt.id,
        startedAt: submittingAttempt.startedAt,
        finishedAt,
        score,
        status,
        answers: submittingAttempt.answers,
        violations: confirmedViolations,
      };
      localStorage.setItem(resultKey, JSON.stringify(optimisticResult));
      setResult(optimisticResult);
      setPhase("result");
      const serverResult = await submitPayload(payload);
      const finalResult: ExamResult = {
        ...optimisticResult,
        score: serverResult.skor,
        correctCount: serverResult.jumlah_benar,
        objectiveCount: serverResult.jumlah_objektif,
        status: serverResult.status,
      };
      localStorage.setItem(resultKey, JSON.stringify(finalResult));
      setResult(finalResult);
      localStorage.removeItem(attemptKey);
      localStorage.removeItem(queueKey);
      setSyncPending(false);
      setError("");
    } catch (saveError) {
      const fallbackResult: ExamResult = {
        attemptId: submittingAttempt.id,
        startedAt: submittingAttempt.startedAt,
        finishedAt,
        score,
        status,
        answers: submittingAttempt.answers,
        violations: submittingAttempt.violations,
      };
      try {
        localStorage.setItem(resultKey, JSON.stringify(fallbackResult));
        localStorage.setItem(queueKey, JSON.stringify({
          p_nim: participant.nim,
          p_nama: participant.nama,
          p_attempt_id: submittingAttempt.id,
          p_matkul: mataKuliah,
          p_modul: modul,
          p_jawaban: payload.p_jawaban,
          p_pelanggaran: confirmedViolations,
        } satisfies ResultPayload));
        localStorage.removeItem(attemptKey);
        setResult(fallbackResult);
        setPhase("result");
        setSyncPending(true);
      } catch (storageError) {
        submitStarted.current = false;
        setError(`Hasil belum terkirim dan antrean lokal gagal disimpan: ${storageError instanceof Error ? storageError.message : "kesalahan penyimpanan"}`);
      }
      setError(`Hasil tersimpan di perangkat, tetapi belum tersinkron ke server: ${saveError instanceof Error ? saveError.message : "kesalahan server"}`);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    submitRef.current = submitExam;
  });

  useEffect(() => {
    if (!cooldownUntil) return;
    const updateTick = () => setCooldownTick(Date.now());
    updateTick();
    const timer = window.setInterval(updateTick, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const handleViolation = async (violation: ExamViolation) => {
    if (!attempt || !participant || submitStarted.current) return;
    setWarning("");
    try {
      const { data, error: violationError } = await supabase.rpc("catat_pelanggaran", {
        p_nim: participant.nim,
        p_nama: participant.nama,
        p_attempt_id: attempt.id,
        p_matkul: mataKuliah,
        p_modul: modul,
        p_kode: violation.kode,
        p_mulai: violation.mulai,
        p_kembali: violation.kembali,
        p_durasi_detik: violation.durasiDetik,
      });
      if (violationError) throw violationError;
      const count = typeof data === "object" && data && "jumlah_pelanggaran" in data
        ? Number(data.jumlah_pelanggaran)
        : Number(data);
      if (!Number.isFinite(count)) throw rpcError("Server tidak mengembalikan jumlah pelanggaran yang valid.");
      const recorded = { ...violation, ke: count, serverRecorded: true };
      const updatedAttempt = { ...attempt, violations: [...attempt.violations, recorded] };
      localStorage.setItem(attemptKey, JSON.stringify(updatedAttempt));
      setAttempt(updatedAttempt);
      setViolationCount(count);
      if (count >= config.maxPelanggaran) {
        setViolationModal(`Ujian dihentikan otomatis setelah pelanggaran ${count} dari ${config.maxPelanggaran}.`);
        await submitExam("dihentikan_pelanggaran", updatedAttempt);
      } else if (count === config.maxPelanggaran - 1) {
        setViolationModal(`Satu pelanggaran lagi: ujian dihentikan dan cooldown ${config.cooldownJam} jam dimulai.`);
      } else {
        setViolationModal(`Anda meninggalkan halaman ujian. Pelanggaran ${count} dari ${config.maxPelanggaran}.`);
      }
    } catch (violationError) {
      setError(`Pelanggaran gagal dicatat ke server; ujian tetap berjalan dan akan dicoba lagi saat submit: ${violationError instanceof Error ? violationError.message : "kesalahan server"}`);
      const localViolation = { ...violation, ke: attempt.violations.length + 1, serverRecorded: false };
      const updatedAttempt = { ...attempt, violations: [...attempt.violations, localViolation] };
      try {
        localStorage.setItem(attemptKey, JSON.stringify(updatedAttempt));
      } catch (storageError) {
        setError(`Pelanggaran tidak dapat disimpan lokal: ${storageError instanceof Error ? storageError.message : "kesalahan penyimpanan"}`);
      }
      setAttempt(updatedAttempt);
      setViolationCount((previous) => previous + 1);
      if (attempt.violations.length + 1 >= config.maxPelanggaran) await submitExam("dihentikan_pelanggaran", updatedAttempt);
    }
  };

  const handleWarning = useCallback((message: string) => setWarning(message), []);
  useExamGuard({ active: active && phase === "runner", onViolation: handleViolation, onWarning: handleWarning });

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const normalizedNim = nim.trim();
    const normalizedName = name.trim();
    if (!normalizedNim || !normalizedName) {
      setError("Nama dan NIM wajib diisi.");
      setBusy(false);
      return;
    }
    try {
      await ensureAuthSession();
      const { data, error: authError } = await supabase.rpc(formMode === "register" ? "daftar_peserta" : "masuk_peserta", {
        p_nim: normalizedNim,
        p_nama: normalizedName,
      });
      if (authError) throw authError;
      if (!isPeserta(data)) {
        if (formMode === "login") throw rpcError("Nama atau NIM tidak cocok, atau peserta belum terdaftar. Periksa data lalu coba lagi.");
        throw rpcError("Server tidak mengembalikan identitas peserta yang valid.");
      }
      const storedParticipant = data;
      const previousStoredParticipant = readStored<unknown>(PARTICIPANT_KEY);
      const previousParticipant = isPeserta(previousStoredParticipant) ? previousStoredParticipant : null;
      if (previousParticipant && !samePeserta(previousParticipant, storedParticipant)) {
        localStorage.removeItem(attemptKey);
        localStorage.removeItem(resultKey);
        localStorage.removeItem(queueKey);
        setAttempt(null);
        setResult(null);
        setSyncPending(false);
        setViolationCount(0);
      }
      localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(storedParticipant));
      setParticipant(storedParticipant);
      setPhase(result && (!previousParticipant || samePeserta(previousParticipant, storedParticipant)) ? "result" : attempt && (!previousParticipant || samePeserta(previousParticipant, storedParticipant)) ? "runner" : "rules");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Pendaftaran atau masuk gagal.");
    } finally {
      setBusy(false);
    }
  };

  const startExam = async () => {
    if (!participant || !agreed) return;
    setBusy(true);
    setError("");
    try {
      await startRoomMonitor();
      const { data, error: startError } = await supabase.rpc("mulai_ujian", {
        p_nim: participant.nim,
        p_nama: participant.nama,
        p_matkul: mataKuliah,
        p_modul: modul,
      });
      if (startError) throw startError;
      if (!data || typeof data !== "object") throw rpcError("Server tidak mengembalikan sesi ujian yang valid.");
      const response = data as Record<string, unknown>;
      const attemptId = String(response.attempt_id ?? "");
      const startedAt = Date.parse(String(response.started_at ?? ""));
      const expiresAt = Date.parse(String(response.expires_at ?? ""));
      const serverNow = Date.parse(String(response.server_now ?? ""));
      const clientNow = Date.now();
      if (!attemptId || !Number.isFinite(startedAt) || !Number.isFinite(expiresAt) || !Number.isFinite(serverNow) || expiresAt <= startedAt) {
        throw rpcError("Sesi ujian yang diberikan server tidak valid.");
      }
      if (!config.jumlahSoal || config.jumlahSoal > 30) throw rpcError("Konfigurasi ujian tidak valid.");
      const { data: bankData, error: bankError } = await supabase.rpc("ambil_soal_ujian", {
        p_matkul: mataKuliah,
        p_attempt_id: attemptId,
      });
      if (bankError) throw bankError;
      if (!isQuestionBank(bankData) || bankData.mataKuliah !== mataKuliah) {
        throw rpcError("Server tidak mengembalikan bank soal ujian yang valid.");
      }
      if (!bankData.moduls.some((item) => item.modul === modul)) {
        throw rpcError("Bank soal untuk mata kuliah ini tidak memiliki cakupan ujian yang diminta.");
      }
      setQuestions(bankData);
      if (document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (fullscreenError) {
          throw rpcError(`Mode layar penuh gagal diaktifkan: ${fullscreenError instanceof Error ? fullscreenError.message : "fitur tidak tersedia"}`);
        }
      }
      const newAttempt: ExamAttempt = {
        id: attemptId,
        startedAt,
        expiresAt,
        serverOffsetMs: serverNow - clientNow,
        answers: {},
        violations: [],
      };
      localStorage.removeItem(resultKey);
      localStorage.setItem(attemptKey, JSON.stringify(newAttempt));
      setResult(null);
      setAttempt(newAttempt);
      setViolationCount(0);
      submitStarted.current = false;
      setCooldownUntil(null);
      setPhase("runner");
    } catch (startError) {
      stopRoomMonitor();
      setError(startError instanceof Error ? startError.message : "Ujian gagal dimulai.");
    } finally {
      setBusy(false);
    }
  };

  const retrySync = async () => {
    if (syncStarted.current) return;
    syncStarted.current = true;
    setError("");
    setBusy(true);
    try {
      const queued = readStored<ResultPayload>(queueKey);
      if (!queued) throw rpcError("Antrean hasil lokal tidak ditemukan.");
      for (const violation of queued.p_pelanggaran) {
        const { error: violationError } = await supabase.rpc("catat_pelanggaran", {
          p_nim: queued.p_nim,
          p_nama: queued.p_nama,
          p_attempt_id: queued.p_attempt_id,
          p_matkul: queued.p_matkul,
          p_modul: queued.p_modul,
          p_kode: violation.kode,
          p_mulai: violation.mulai,
          p_kembali: violation.kembali,
          p_durasi_detik: violation.durasiDetik,
        });
        if (violationError) throw violationError;
      }
      const serverResult = await submitPayload(queued);
      const previousResult = readStored<ExamResult>(resultKey);
      if (previousResult) {
        const syncedResult = {
          ...previousResult,
          score: serverResult.skor,
          correctCount: serverResult.jumlah_benar,
          objectiveCount: serverResult.jumlah_objektif,
          status: serverResult.status,
        };
        localStorage.setItem(resultKey, JSON.stringify(syncedResult));
        setResult(syncedResult);
      }
      localStorage.removeItem(queueKey);
      setSyncPending(false);
    } catch (retryError) {
      setError(`Hasil belum tersinkron: ${retryError instanceof Error ? retryError.message : "kesalahan server"}`);
    } finally {
      setBusy(false);
      syncStarted.current = false;
    }
  };

  useEffect(() => {
    retrySyncRef.current = retrySync;
  });

  useEffect(() => {
    restoreAttemptRef.current = restoreAttempt;
  });

  useEffect(() => {
    if (phase !== "result" || !syncPending || !navigator.onLine) return;
    const retry = () => void retrySyncRef.current();
    retry();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [phase, syncPending]);

  const updateAnswer = (number: number, answer: string) => {
    if (!attempt) return;
    const updated = { ...attempt, answers: { ...attempt.answers, [number]: answer } };
    setAttempt(updated);
    try {
      localStorage.setItem(attemptKey, JSON.stringify(updated));
      setError("");
    } catch (storageError) {
      setError(storageError instanceof Error ? `Gagal menyimpan jawaban di perangkat: ${storageError.message}` : "Gagal menyimpan jawaban di perangkat.");
    }
  };

  const leaveFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
  };

  if (!authReady) {
    return <ExamShell title="Menyiapkan sesi peserta..." onBack={onBack} error={error} />;
  }

  if (error && !questions && phase !== "identity") {
    return <ExamShell title="Ujian tidak dapat dimuat" error={error} onBack={onBack} />;
  }

  if (phase === "identity") {
    return (
      <ExamShell title="Mode Ujian" onBack={onBack} error={error}>
        <p className="mb-5 text-sm leading-6 text-[var(--muted)]">Simulasi ujian {subjectLabel}, gabungan materi beberapa modul. Bank soal ujian berbeda dari Latihan Soal.</p>
        <form className="grid gap-4" onSubmit={(event) => void signIn(event)}>
          <label className="grid gap-1 text-sm font-semibold">Nama<input className="border border-[var(--line-strong)] bg-transparent px-3 py-2" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label>
          <label className="grid gap-1 text-sm font-semibold">NIM<input className="border border-[var(--line-strong)] bg-transparent px-3 py-2" value={nim} onChange={(event) => setNim(event.target.value)} autoComplete="username" required /></label>
          <p className="text-xs leading-5 text-[var(--muted)]">Nama digunakan sebagai username dan NIM sebagai password. Karena NIM dapat diketahui orang lain, login ini belum cukup aman untuk penilaian resmi.</p>
          <button className="min-h-11 bg-[var(--ink)] px-4 text-sm font-bold text-[var(--paper)] disabled:opacity-50" disabled={busy}>{busy ? "Memproses..." : formMode === "register" ? "Daftar" : "Masuk"}</button>
        </form>
        <button className="mt-4 text-sm font-semibold text-[var(--coral)] underline" type="button" onClick={() => { setError(""); setFormMode((mode) => mode === "register" ? "login" : "register"); }}>
          {formMode === "register" ? "Sudah terdaftar? Masuk" : "Belum punya akun? Daftar"}
        </button>
      </ExamShell>
    );
  }

  if (phase === "rules") {
    const cooldownSeconds = cooldownUntil ? Math.max(0, Math.ceil((new Date(cooldownUntil).getTime() - cooldownTick) / 1000)) : 0;
    return (
      <ExamShell title={`Aturan Ujian — ${subjectLabel}`} onBack={onBack} error={error}>
        <p className="mb-3 text-sm">Peserta: <strong>{participant?.nama}</strong> · NIM {participant?.nim}</p>
        {cooldownUntil && cooldownSeconds > 0 && <p className="mb-4 border border-[var(--coral)] bg-[var(--coral)]/10 p-3 text-sm font-semibold" role="status">Cooldown aktif. Sisa waktu {Math.floor(cooldownSeconds / 3600).toString().padStart(2, "0")}:{Math.floor((cooldownSeconds % 3600) / 60).toString().padStart(2, "0")}:{(cooldownSeconds % 60).toString().padStart(2, "0")}.</p>}
        <ul className="mb-6 list-disc space-y-2 pl-5 text-sm leading-6">{config.aturan.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        <div className="mb-5 border border-[var(--line)] bg-white/30 p-4 text-sm leading-6">
          <strong className="block">Pemantauan ruang (peringatan saja)</strong>
          <p className="mt-2">Kamera memantau perubahan gambar dan mikrofon mengukur tingkat suara. Sistem tidak mengenali orang, foto, kata, atau sumber suara. Gerakan, perubahan cahaya, dan suara normal dapat memicu peringatan; sensor tidak menambah hitungan pelanggaran.</p>
          <p className="mt-2">Analisis dilakukan di perangkat. Audio/video mentah tidak direkam, disimpan, atau dikirim ke server. Browser akan meminta izin kamera dan mikrofon saat ujian dimulai.</p>
          <p className="mt-2">Agar suasana lebih tenang, minta orang sekitar tidak masuk atau berbicara selama simulasi. Foto statis tidak dikenali sebagai orang; perubahan cahaya, pantulan, dan gerakan biasa tetap dapat memicu peringatan umum.</p>
        </div>
        <div className="mb-5 grid gap-2 border-y border-[var(--line)] py-4 text-sm sm:grid-cols-3">
          <span>{config.jumlahSoal} soal</span><span>{config.durasiMenit} menit</span><span>Maks. {config.maxPelanggaran} pelanggaran</span>
        </div>
        <label className="mb-5 flex items-start gap-3 text-sm leading-6">
          <input className="mt-1" type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <span>
            Saya memahami aturan dan menyetujui penyimpanan identitas simulasi, jawaban, serta log pelanggaran. Kamera dan mikrofon akan aktif selama ujian untuk analisis gerakan dan tingkat suara di perangkat ini. Media mentah tidak direkam atau diunggah. Deteksi sensor hanya memberi peringatan dan tidak menambah hitungan pelanggaran.
          </span>
        </label>
        <button className="min-h-11 w-full bg-[var(--ink)] px-4 text-sm font-bold text-[var(--paper)] disabled:opacity-50" type="button" disabled={!agreed || busy || cooldownSeconds > 0} onClick={() => void startExam()}>
          {busy ? "Memeriksa ujian..." : "Mulai Ujian"}
        </button>
        <button className="mt-4 text-sm font-semibold text-[var(--muted)] underline" type="button" disabled={busy} onClick={() => {
          setBusy(true);
          void supabase.auth.signOut().then(({ error: signOutError }) => {
            if (signOutError) throw signOutError;
            setParticipant(null);
            setPhase("identity");
          }).catch((signOutError: unknown) => {
            setError(`Gagal keluar dari sesi: ${signOutError instanceof Error ? signOutError.message : "kesalahan autentikasi"}`);
          }).finally(() => setBusy(false));
        }}>Keluar dari akun</button>
      </ExamShell>
    );
  }

  if (phase === "result" && result) {
    const resultObjectiveCount = result.objectiveCount ?? totalObjective;
    const resultCorrectCount = result.correctCount ?? correctAnswers;
    const manualCount = Math.max(0, config.jumlahSoal - resultObjectiveCount);
    const exportResult = () => {
      const report = {
        jenis: "hasil-ujian-mata-kuliah",
        peserta: participant,
        matkul: mataKuliah,
        cakupan: "gabungan-modul",
        mulai: new Date(result.startedAt).toISOString(),
        selesai: new Date(result.finishedAt).toISOString(),
        status: result.status,
        skor: result.score,
        benar: resultCorrectCount,
        totalObjektif: resultObjectiveCount,
        jawaban: result.answers,
        pelanggaran: result.violations,
        tersinkron: !syncPending,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hasil-ujian-${mataKuliah.toLowerCase()}-matkul.json`;
      link.click();
      URL.revokeObjectURL(url);
    };
    return (
      <ExamShell title="Hasil Ujian" onBack={onBack} error={error}>
        <div className="mb-6 border-l-4 border-[var(--coral)] pl-4">
          <p className="text-sm font-bold uppercase tracking-widest text-[var(--muted)]">Nilai otomatis</p>
          <p className="font-[var(--serif)] text-5xl text-[var(--coral)]">{result.score}<span className="text-xl text-[var(--muted)]">/100</span></p>
          <p className="mt-2 text-sm">Status: {result.status.replaceAll("_", " ")} · {resultCorrectCount} benar dari {resultObjectiveCount} soal objektif.</p>
          {manualCount > 0 && <p className="mt-1 text-sm text-[var(--muted)]">{manualCount} jawaban essay/isian menunggu penilaian mandiri.</p>}
          <p className="mt-1 text-sm text-[var(--muted)]">{result.violations.length} pelanggaran tercatat.</p>
        </div>
        <div className="mb-6 flex flex-wrap gap-3 print:hidden">
          <button className="min-h-10 border border-[var(--line-strong)] px-4 text-sm font-bold" type="button" onClick={exportResult}>Unduh hasil JSON</button>
          <button className="min-h-10 border border-[var(--line-strong)] px-4 text-sm font-bold" type="button" onClick={() => window.print()}>Cetak / Simpan PDF</button>
        </div>
        {syncPending && <div className="mb-6 border border-[var(--coral)]/50 p-4 text-sm"><p>Hasil tersimpan di perangkat, tetapi belum tersinkron ke Supabase.</p><button className="mt-2 font-bold text-[var(--coral)] underline" type="button" disabled={busy} onClick={() => void retrySync()}>{busy ? "Mengirim..." : "Coba kirim ulang"}</button></div>}
        <section className="grid gap-7">
          {shuffledData?.pilihanGanda.length ? <SoalPilihanGanda soal={shuffledData.pilihanGanda} showKunci jawabanUser={result.answers} onJawab={() => undefined} /> : null}
          {shuffledData?.isianSingkat.length ? <SoalIsianSingkat soal={shuffledData.isianSingkat} showKunci jawabanUser={result.answers} onJawab={() => undefined} /> : null}
          {shuffledData?.essay.length ? <SoalEssay soal={shuffledData.essay} showKunci jawabanUser={result.answers} onJawab={() => undefined} /> : null}
          {shuffledData?.aplikasiKonteks.length ? <SoalAplikasiKonteks soal={shuffledData.aplikasiKonteks} showKunci jawabanUser={result.answers} onJawab={() => undefined} /> : null}
        </section>
      </ExamShell>
    );
  }

  if (!attempt || !shuffledData || restoringAttempt) {
    return <ExamShell title={restoringAttempt ? "Memverifikasi sesi ujian..." : "Memuat ujian..."} onBack={onBack} error={error}>
      {attempt && error && <button className="mt-4 font-bold text-[var(--coral)] underline" type="button" onClick={() => void restoreAttemptRef.current()}>Coba verifikasi lagi</button>}
    </ExamShell>;
  }

  const answered = Object.keys(attempt.answers).length;
  const minutes = Math.floor(remainingSeconds / 60).toString().padStart(2, "0");
  const seconds = (remainingSeconds % 60).toString().padStart(2, "0");

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 text-[var(--ink)] sm:px-8 sm:py-12">
      <header className="sticky top-0 z-10 mb-7 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--paper)] py-4">
        <div><p className="text-xs font-bold uppercase tracking-widest text-[var(--coral)]">{subjectLabel} · Ujian Mata Kuliah</p><p className="text-sm">Pelanggaran <strong className={violationCount >= config.maxPelanggaran - 1 ? "text-red-600" : ""}>{violationCount}/{config.maxPelanggaran}</strong></p></div>
        <div className="text-right"><p className="text-xs uppercase tracking-widest text-[var(--muted)]">Sisa waktu</p><p className="font-mono text-2xl font-bold" aria-live="polite">{minutes}:{seconds}</p></div>
      </header>
      {warning && <div className="mb-5 border border-[var(--coral)] bg-[var(--coral)]/10 p-3 text-sm font-semibold" role="alert">{warning}</div>}
      {error && <div className="mb-5 border border-red-500/50 p-3 text-sm" role="alert">{error}</div>}
      {violationModal && <div className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-4" role="presentation"><section className="w-full max-w-lg border border-[var(--line)] bg-[var(--paper)] p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="violation-title"><h2 id="violation-title" className="font-[var(--serif)] text-2xl text-[var(--coral)]">Peringatan ujian</h2><p className="mt-3 text-sm leading-6">{violationModal}</p>{violationCount < config.maxPelanggaran && <button className="mt-5 min-h-10 bg-[var(--ink)] px-5 text-sm font-bold text-[var(--paper)]" type="button" onClick={() => setViolationModal("")}>Saya mengerti</button>}</section></div>}
      <div className="mb-6 flex items-center justify-between text-sm"><span>{answered} dari {totalQuestions} soal terjawab</span><button className="font-semibold text-[var(--muted)] underline" type="button" onClick={leaveFullscreen}>Keluar layar penuh</button></div>
      <section className="grid gap-8 select-none" onCopy={(event) => event.preventDefault()} onCut={(event) => event.preventDefault()} onPaste={(event) => event.preventDefault()} onContextMenu={(event) => event.preventDefault()}>
        {shuffledData.pilihanGanda.length > 0 && <div><h2 className="mb-2 border-b-2 border-[var(--ink)] pb-2 font-[var(--serif)] text-xl">Pilihan Ganda</h2><SoalPilihanGanda soal={shuffledData.pilihanGanda} showKunci={false} jawabanUser={attempt.answers} onJawab={updateAnswer} /></div>}
        {shuffledData.isianSingkat.length > 0 && <div><h2 className="mb-2 border-b-2 border-[var(--ink)] pb-2 font-[var(--serif)] text-xl">Isian Singkat</h2><SoalIsianSingkat soal={shuffledData.isianSingkat} showKunci={false} jawabanUser={attempt.answers} onJawab={updateAnswer} /></div>}
        {shuffledData.essay.length > 0 && <div><h2 className="mb-2 border-b-2 border-[var(--ink)] pb-2 font-[var(--serif)] text-xl">Essay</h2><SoalEssay soal={shuffledData.essay} showKunci={false} jawabanUser={attempt.answers} onJawab={updateAnswer} /></div>}
        {shuffledData.aplikasiKonteks.length > 0 && <div><h2 className="mb-2 border-b-2 border-[var(--ink)] pb-2 font-[var(--serif)] text-xl">Aplikasi Konteks</h2><SoalAplikasiKonteks soal={shuffledData.aplikasiKonteks} showKunci={false} jawabanUser={attempt.answers} onJawab={updateAnswer} /></div>}
      </section>
      <footer className="mt-8 flex flex-col gap-4 border-t-2 border-[var(--ink)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm">{answered} dari {totalQuestions} soal terjawab</span>
        <button className="min-h-11 bg-[var(--coral)] px-5 text-sm font-bold text-[var(--ink)] disabled:opacity-50" type="button" disabled={busy} onClick={() => {
          if (window.confirm("Kirim jawaban dan akhiri ujian?")) void submitExam("selesai");
        }}>{busy ? "Mengirim..." : "Selesaikan Ujian"}</button>
      </footer>
    </main>
  );
}

function ExamShell({ title, children, error, onBack }: { title: string; children?: React.ReactNode; error?: string; onBack: () => void }) {
  return (
    <main className="mx-auto min-h-[70vh] w-full max-w-3xl px-4 py-8 text-[var(--ink)] sm:px-8 sm:py-12">
      <button className="mb-7 text-sm font-semibold text-[var(--muted)] underline" type="button" onClick={onBack}>← Kembali</button>
      <h1 className="mb-5 font-[var(--serif)] text-4xl">{title}</h1>
      {error && <p className="mb-5 border border-red-500/50 p-3 text-sm" role="alert">{error}</p>}
      <div className="border border-[var(--line)] bg-white/20 p-5 sm:p-7">{children}</div>
    </main>
  );
}
