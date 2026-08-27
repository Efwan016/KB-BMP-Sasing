import { useEffect, useMemo, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import Layout from "./component/Layout";
import Footer from "./component/Footer";
import MainContent from "./component/MainContent";
import ModuleDetail from "./component/ModuleDetail";
import Navigation from "./component/Navigation";
import QuizPage from "./component/QuizPage/QuizPage";
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

  useEffect(() => {
    const syncDetail = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#module-detail=")) {
        setSelectedAsset(decodeURIComponent(hash.replace("#module-detail=", "")));
        setSelectedQuiz(null);
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
      } else {
        setSelectedAsset(null);
        setSelectedQuiz(null);
      }
    };
    syncDetail();
    window.addEventListener("hashchange", syncDetail);
    return () => window.removeEventListener("hashchange", syncDetail);
  }, []);

  const openModule = (module: Module) => {
    window.location.hash = `module-detail=${encodeURIComponent(module.asset)}`;
  };
  const closeDetail = () => window.history.back();
  const selectedModule = modules.find((module) => module.asset === selectedAsset);
  const relatedModules = selectedModule ? modules.filter((module) => module.title === selectedModule.title && module.asset !== selectedModule.asset) : [];

  return (
    <Layout>
      <Navigation />
      {selectedQuiz ? (
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
          searchTerm={searchTerm}
          onSearchChange={(event) => setSearchTerm(event.target.value)}
          onClearSearch={() => setSearchTerm("")}
          onOpenModule={openModule}
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