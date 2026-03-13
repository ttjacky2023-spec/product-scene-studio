"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuditRow, IntakeData, Locale, QaScore } from "@/lib/types";
import type { ImageAnalysis } from "@/lib/analyze";

const defaultIntake: IntakeData = {
  imageName: "",
  imageDataUrl: "",
  sourceResolution: "",
  productCoverage: "",
  availableViews: "front only",
  aspectRatio: "1:1",
  outputSize: "2000 x 2000",
  generationCount: "4",
  intendedUse: "Amazon gallery",
  sceneTypes: "",
  placementPreference: "",
  angleTolerance: "same angle only",
  stylePreference: "",
  strictness: "maximum preservation",
  mustPreserve: "logo, critical text, icons",
  draftApproval: "yes",
  maxIterations: "3",
};

const defaultAudit: AuditRow[] = [
  { zone: "Logo", contains: "Main brand mark", importance: "Critical", action: "Reuse", notes: "" },
  { zone: "Title text", contains: "Front display text", importance: "Critical", action: "Extract", notes: "" },
  { zone: "Icons", contains: "Feature / certification icons", importance: "Important", action: "Extract", notes: "" },
  { zone: "Fine print", contains: "Small copy blocks", importance: "Minor", action: "Rebuild", notes: "" },
  { zone: "Pattern", contains: "Decorative texture", importance: "Important", action: "Controlled gen", notes: "" },
  { zone: "Form", contains: "Silhouette / edges", importance: "Critical", action: "Preserve geometry", notes: "" },
];

const defaultQa: QaScore[] = [
  { category: "Silhouette fidelity", score: "", notes: "" },
  { category: "Logo fidelity", score: "", notes: "" },
  { category: "Text fidelity", score: "", notes: "" },
  { category: "Icon fidelity", score: "", notes: "" },
  { category: "Pattern/material fidelity", score: "", notes: "" },
  { category: "Scene realism", score: "", notes: "" },
  { category: "Placement realism", score: "", notes: "" },
  { category: "Lighting consistency", score: "", notes: "" },
];

type PipelineState = {
  locale: Locale;
  analysis: ImageAnalysis | null;
  intake: IntakeData;
  audit: AuditRow[];
  qa: QaScore[];
  setLocale: (locale: Locale) => void;
  setAnalysis: (analysis: ImageAnalysis | null) => void;
  setIntake: (data: IntakeData) => void;
  setAuditCell: (index: number, field: keyof AuditRow, value: string) => void;
  setQaCell: (index: number, field: keyof QaScore, value: string) => void;
  resetAll: () => void;
};

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set) => ({
      locale: "en",
      analysis: null,
      intake: defaultIntake,
      audit: defaultAudit,
      qa: defaultQa,
      setLocale: (locale) => set({ locale }),
      setAnalysis: (analysis) => set({ analysis }),
      setIntake: (data) => set({ intake: data }),
      setAuditCell: (index, field, value) =>
        set((state) => ({ audit: state.audit.map((row, i) => (i === index ? { ...row, [field]: value } : row)) })),
      setQaCell: (index, field, value) =>
        set((state) => ({ qa: state.qa.map((row, i) => (i === index ? { ...row, [field]: value } : row)) })),
      resetAll: () => set({ locale: "en", analysis: null, intake: defaultIntake, audit: defaultAudit, qa: defaultQa }),
    }),
    { name: "product-scene-studio-pipeline", storage: createJSONStorage(() => localStorage) },
  ),
);
