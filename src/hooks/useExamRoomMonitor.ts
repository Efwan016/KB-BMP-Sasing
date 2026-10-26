import { useCallback, useEffect, useRef } from "react";

type UseExamRoomMonitorOptions = {
  onWarning: (message: string) => void;
};

type MonitorResources = {
  stream: MediaStream;
  audioContext: AudioContext;
  analyser: AnalyserNode;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  previousFrame: Uint8ClampedArray | null;
  soundStartedAt: number | null;
  motionStartedAt: number | null;
  lastSoundWarningAt: number;
  lastMotionWarningAt: number;
  intervalId: number;
};

const SAMPLE_WIDTH = 80;
const SAMPLE_HEIGHT = 45;
const SAMPLE_INTERVAL_MS = 500;
const WARNING_COOLDOWN_MS = 30_000;
const SOUND_THRESHOLD = 0.08;
const SIGNAL_DURATION_MS = 2_000;

export default function useExamRoomMonitor({ onWarning }: UseExamRoomMonitorOptions) {
  const resourcesRef = useRef<MonitorResources | null>(null);
  const onWarningRef = useRef(onWarning);

  useEffect(() => {
    onWarningRef.current = onWarning;
  }, [onWarning]);

  const stop = useCallback(() => {
    const resources = resourcesRef.current;
    if (!resources) return;
    resourcesRef.current = null;
    window.clearInterval(resources.intervalId);
    resources.stream.getTracks().forEach((track) => track.stop());
    resources.video.srcObject = null;
    void resources.audioContext.close().catch((error: unknown) => {
      console.error("Failed to close exam audio monitor:", error);
    });
  }, []);

  useEffect(() => () => stop(), [stop]);

  const start = useCallback(async () => {
    stop();
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Browser ini tidak mendukung akses kamera dan mikrofon. Gunakan browser modern melalui HTTPS.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
    });
    let audioContext: AudioContext | null = null;

    try {
      audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      audioContext.createMediaStreamSource(stream).connect(analyser);

      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = SAMPLE_WIDTH;
      canvas.height = SAMPLE_HEIGHT;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Pemantauan kamera tidak dapat dimulai pada browser ini.");

      const resources: MonitorResources = {
        stream,
        audioContext,
        analyser,
        video,
        canvas,
        previousFrame: null,
        soundStartedAt: null,
        motionStartedAt: null,
        lastSoundWarningAt: 0,
        lastMotionWarningAt: 0,
        intervalId: 0,
      };
      const audioSamples = new Uint8Array(analyser.fftSize);
      resources.intervalId = window.setInterval(() => {
        const now = Date.now();

        analyser.getByteTimeDomainData(audioSamples);
        const amplitude = Math.sqrt(
          audioSamples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / audioSamples.length,
        );
        resources.soundStartedAt = amplitude >= SOUND_THRESHOLD
          ? resources.soundStartedAt ?? now
          : null;
        if (
          resources.soundStartedAt !== null &&
          now - resources.soundStartedAt >= SIGNAL_DURATION_MS &&
          now - resources.lastSoundWarningAt >= WARNING_COOLDOWN_MS
        ) {
          resources.lastSoundWarningAt = now;
          onWarningRef.current("Mikrofon menangkap suara cukup keras selama beberapa saat. Ini hanya peringatan—suara sekitar tidak otomatis dihitung sebagai pelanggaran.");
        }

        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) return;
        context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
        const frame = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data;
        let changedPixels = 0;
        const previousFrame = resources.previousFrame;
        if (previousFrame) {
          for (let pixel = 0; pixel < SAMPLE_WIDTH * SAMPLE_HEIGHT; pixel += 1) {
            const offset = pixel * 4;
            const currentLuma = (frame[offset] * 3 + frame[offset + 1] * 6 + frame[offset + 2]) / 10;
            const previousLuma = (previousFrame[offset] * 3 + previousFrame[offset + 1] * 6 + previousFrame[offset + 2]) / 10;
            if (Math.abs(currentLuma - previousLuma) > 35) changedPixels += 1;
          }
          const motionRatio = changedPixels / (SAMPLE_WIDTH * SAMPLE_HEIGHT);
          resources.motionStartedAt = motionRatio >= 0.16
            ? resources.motionStartedAt ?? now
            : null;
          if (
            resources.motionStartedAt !== null &&
            now - resources.motionStartedAt >= SIGNAL_DURATION_MS &&
            now - resources.lastMotionWarningAt >= WARNING_COOLDOWN_MS
          ) {
            resources.lastMotionWarningAt = now;
            onWarningRef.current("Kamera mendeteksi perubahan gerakan pada gambar. Perubahan cahaya atau gerakan biasa juga bisa memicu ini; tidak ada foto/video yang disimpan dan peringatan ini bukan pelanggaran.");
          }
        }
        resources.previousFrame = new Uint8ClampedArray(frame);
      }, SAMPLE_INTERVAL_MS);
      resourcesRef.current = resources;
    } catch (error) {
      stream.getTracks().forEach((track) => track.stop());
      if (audioContext) {
        void audioContext.close().catch((closeError: unknown) => {
          console.error("Failed to close exam audio monitor:", closeError);
        });
      }
      throw error;
    }
  }, [stop]);

  return { start, stop };
}
