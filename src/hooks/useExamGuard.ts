import { useEffect, useRef } from "react";
import type { ExamViolation, ViolationCode } from "../types";

type UseExamGuardOptions = {
  active: boolean;
  onViolation: (violation: ExamViolation) => void;
  onWarning: (message: string) => void;
};

export default function useExamGuard({ active, onViolation, onWarning }: UseExamGuardOptions) {
  const pending = useRef<{ code: ViolationCode; startedAt: number } | null>(null);
  const onViolationRef = useRef(onViolation);
  const onWarningRef = useRef(onWarning);

  useEffect(() => {
    onViolationRef.current = onViolation;
    onWarningRef.current = onWarning;
  }, [onViolation, onWarning]);

  useEffect(() => {
    if (!active) return;

    const begin = (code: ViolationCode) => {
      if (!pending.current) pending.current = { code, startedAt: Date.now() };
    };
    const finish = () => {
      const current = pending.current;
      if (!current) return;
      pending.current = null;
      const endedAt = Date.now();
      const durationSeconds = Math.floor((endedAt - current.startedAt) / 1000);
      if (durationSeconds < 2) return;
      onViolationRef.current({
        kode: current.code,
        mulai: new Date(current.startedAt).toISOString(),
        kembali: new Date(endedAt).toISOString(),
        durasiDetik: durationSeconds,
        ke: 0,
      });
    };
    const onVisibilityChange = () => {
      if (document.hidden) begin("L-01");
      else finish();
    };
    const onBlur = () => begin("L-01");
    const onFocus = () => {
      if (!document.hidden) finish();
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) begin("L-02");
      else finish();
    };
    const warnAndPrevent = (event: Event) => {
      event.preventDefault();
      onWarningRef.current("Menyalin, menempel, klik kanan, dan pemilihan teks tidak diperbolehkan selama ujian.");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "F12" || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(event.key.toLowerCase())) || (event.ctrlKey && event.key.toLowerCase() === "u")) {
        event.preventDefault();
        onWarningRef.current("Membuka DevTools atau sumber halaman tidak diperbolehkan selama ujian.");
      }
      if (event.ctrlKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        onWarningRef.current("Mencetak halaman ujian tidak diperbolehkan.");
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("copy", warnAndPrevent);
    document.addEventListener("cut", warnAndPrevent);
    document.addEventListener("paste", warnAndPrevent);
    document.addEventListener("contextmenu", warnAndPrevent);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("copy", warnAndPrevent);
      document.removeEventListener("cut", warnAndPrevent);
      document.removeEventListener("paste", warnAndPrevent);
      document.removeEventListener("contextmenu", warnAndPrevent);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("keydown", onKeyDown);
      pending.current = null;
    };
  }, [active]);
}
