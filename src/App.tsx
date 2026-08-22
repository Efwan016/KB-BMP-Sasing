import { useEffect, useMemo, useState } from "react";
import Layout from "./component/Layout";
import Footer from "./component/Footer";
import MainContent from "./component/MainContent";
import ModuleDetail from "./component/ModuleDetail";
import Navigation from "./component/Navigation";
import type { Module } from "./types";
import "./App.css";

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
    const syncDetail = () => setSelectedAsset(window.location.hash.startsWith("#module-detail=") ? decodeURIComponent(window.location.hash.replace("#module-detail=", "")) : null);
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
      {selectedModule ? (
        <ModuleDetail module={selectedModule} relatedModules={relatedModules} onBack={closeDetail} onOpenModule={openModule} />
      ) : (
        <MainContent
          moduleData={moduleData}
          filteredModules={filteredModules}
          moduleGroups={moduleGroups}
          searchTerm={searchTerm}
          onSearchChange={(event) => setSearchTerm(event.target.value)}
          onClearSearch={() => setSearchTerm("")}
          onOpenModule={openModule}
        />
      )}
      <Footer />
    </Layout>
  );
}

export default App;