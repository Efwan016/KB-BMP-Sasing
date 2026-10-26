import { useEffect, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import Layout from "./component/Layout";
import Footer from "./component/Footer";
import MainContent from "./component/MainContent";
import ModuleDetail from "./component/ModuleDetail";
import Navigation from "./component/Navigation";
import QuizPage from "./component/QuizPage/QuizPage";
import ExamPage from "./component/ExamPage";
import LeaderboardPage from "./component/LeaderboardPage";
import PhotoBoothPage from "./pages/PhotoBoothPage";
import type { Module, ReadingHistoryItem } from "./types";
import "./App.css";

const STORAGE_KEY = "sasing-reading-history";
const MAX_HISTORY = 20;

const fallbackData: Module[] = [{
  title: "Basic Reading",
  description: "Bangun cara membaca yang lebih tajam, terarah, dan percaya diri.",
  eyebrow: "English learning module",
  label: "Module 06",
  duration: "Self-paced",
  level: "Foundational",
  asset: "/assetMatkul/basicReading/Evan_BasicReading_Modul6.pdf",
  highlights: ["Reading strategies", "Meaning in context", "Active comprehension"],
}];

function App() {
  const [data, setData] = useState<Module[] | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<{ mataKuliah: string; modul: number; judul: string } | null>(null);
  const [selectedExam, setSelectedExam] = useState<{ mataKuliah: string } | null>(null);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<"home" | "module" | "quiz" | "exam" | "leaderboard" | "photo-booth">("home");
  const [readingHistory, setReadingHistory] = useState<ReadingHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as ReadingHistoryItem[];
      }
    } catch {
      // ignore corrupt data
    }
    return [];
  });

  const recordRead = (module: Module) => {
    setReadingHistory((prev) => {
      const entry: ReadingHistoryItem = {
        asset: module.asset,
        label: module.label,
        title: module.title,
        timestamp: Date.now(),
      };
      const updated = [entry, ...prev];
      const trimmed = updated.slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch {
        // ignore storage error
      }
      return trimmed;
    });
  };

  const clearHistory = () => {
    setReadingHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetch("/data/data-modul.json")
      .then((response) => response.json())
      .then((json: Module[]) => setData(json))
      .catch(() => setData(fallbackData));
  }, []);

  const modules = useMemo(() => data ?? fallbackData, [data]);
  const moduleData = modules[0];
  const filteredModules = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return modules;
    return modules.filter((module) =>
      [module.title, module.description, module.label, module.level, ...module.highlights]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [modules, searchTerm]);
  const moduleGroups = useMemo(() => filteredModules.reduce<Record<string, Module[]>>((groups, module) => {
    const subject = module.title.trim() || "Other modules";
    groups[subject] = [...(groups[subject] ?? []), module];
    return groups;
  }, {}), [filteredModules]);
  const examSubjects = useMemo(
    () => [...new Set(modules.filter((module) => module.exam).map((module) => module.title))],
    [modules],
  );

  useEffect(() => {
    const syncDetail = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#module-detail=")) {
        setSelectedAsset(decodeURIComponent(hash.replace("#module-detail=", "")));
        setSelectedQuiz(null);
        setSelectedExam(null);
        setSelectedLeaderboard(null);
        setActivePage("module");
      } else if (hash.startsWith("#quiz=")) {
        const payload = decodeURIComponent(hash.replace("#quiz=", ""));
        const parts = payload.split("/");
        const mataKuliahRaw = parts[0] ?? "";
        const modulRaw = parts[1];
        const modul = modulRaw ? parseInt(modulRaw.replace(/[^\d]/g, ""), 10) : NaN;
        setSelectedAsset(null);
        setSelectedQuiz({
          mataKuliah: mataKuliahRaw,
          modul: Number.isFinite(modul) ? modul : 1,
          judul: mataKuliahRaw,
        });
        setSelectedExam(null);
        setSelectedLeaderboard(null);
        setActivePage("quiz");
      } else if (hash.startsWith("#exam=")) {
        const [mataKuliah = ""] = decodeURIComponent(hash.replace("#exam=", "")).split("/");
        setSelectedAsset(null);
        setSelectedQuiz(null);
        setSelectedLeaderboard(null);
        if (modules.some((module) => module.title === mataKuliah && module.exam)) {
          setSelectedExam({ mataKuliah });
          setActivePage("exam");
        } else {
          setSelectedExam(null);
          setActivePage("home");
        }
      } else if (hash.startsWith("#leaderboard=")) {
        const mataKuliah = decodeURIComponent(hash.replace("#leaderboard=", ""));
        setSelectedAsset(null);
        setSelectedQuiz(null);
        setSelectedExam(null);
        if (modules.some((module) => module.title === mataKuliah && module.exam)) {
          setSelectedLeaderboard(mataKuliah);
          setActivePage("leaderboard");
        } else {
          setSelectedLeaderboard(null);
          setActivePage("home");
        }
      } else if (hash === "#photo-booth") {
        setSelectedAsset(null);
        setSelectedQuiz(null);
        setSelectedExam(null);
        setSelectedLeaderboard(null);
        setActivePage("photo-booth");
      } else {
        setSelectedAsset(null);
        setSelectedQuiz(null);
        setSelectedExam(null);
        setSelectedLeaderboard(null);
        setActivePage("home");
      }
    };
    syncDetail();
    window.addEventListener("hashchange", syncDetail);
    return () => window.removeEventListener("hashchange", syncDetail);
  }, [modules]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [selectedAsset, selectedQuiz, selectedExam]);

  const openModule = (module: Module) => {
    window.location.hash = `module-detail=${encodeURIComponent(module.asset)}`;
  };
  const startExam = (mataKuliah: string) => {
    window.location.hash = `exam=${encodeURIComponent(mataKuliah)}`;
  };
  const showLeaderboard = (mataKuliah: string) => {
    window.location.hash = `leaderboard=${encodeURIComponent(mataKuliah)}`;
  };
  const closeDetail = () => window.history.back();
  const selectedModule = modules.find((module) => module.asset === selectedAsset);
  const relatedModules = selectedModule ? modules.filter((module) => module.title === selectedModule.title && module.asset !== selectedModule.asset) : [];

  return (
    <Layout>
      <Navigation />
      {activePage === "photo-booth" ? (
        <PhotoBoothPage />
      ) : selectedLeaderboard ? (
        <LeaderboardPage key={selectedLeaderboard} mataKuliah={selectedLeaderboard} onBack={() => window.history.back()} />
      ) : selectedExam ? (
        (() => {
          const module = modules.find((item) => item.title === selectedExam.mataKuliah && item.exam);
          return module?.exam ? <ExamPage key={selectedExam.mataKuliah} mataKuliah={selectedExam.mataKuliah} modul={0} config={module.exam} onBack={() => window.history.back()} /> : <main className="mx-auto min-h-[70vh] max-w-3xl px-6 py-16 text-center"><h1 className="font-[var(--serif)] text-3xl text-[var(--coral)]">Ujian belum tersedia</h1><p className="mt-3 text-sm text-[var(--muted)]">Bank soal ujian untuk mata kuliah ini belum tersedia.</p></main>;
        })()
      ) : selectedQuiz ? (
        <QuizPage
          mataKuliah={selectedQuiz.mataKuliah}
          modul={selectedQuiz.modul}
          judulModul={selectedQuiz.judul}
          onBack={() => window.history.back()}
        />
      ) : selectedModule ? (
        <ModuleDetail
          module={selectedModule}
          relatedModules={relatedModules}
          onBack={closeDetail}
          onOpenModule={openModule}
          onRecordRead={recordRead}
        />
      ) : (
        <MainContent
          moduleData={moduleData}
          filteredModules={filteredModules}
          moduleGroups={moduleGroups}
          examSubjects={examSubjects}
          searchTerm={searchTerm}
          onSearchChange={(event) => setSearchTerm(event.target.value)}
          onClearSearch={() => setSearchTerm("")}
          onOpenModule={openModule}
          onStartExam={startExam}
          onShowLeaderboard={showLeaderboard}
          readingHistory={readingHistory}
          clearHistory={clearHistory}
        />
      )}
      <Footer />
      <Analytics />
    </Layout>
  );
}

export default App;