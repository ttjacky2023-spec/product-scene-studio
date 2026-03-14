"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuditRow, ImageAsset, IntakeData, Locale, QaScore } from "@/lib/types";
import type { ImageAnalysis } from "@/lib/analyze";

const defaultIntake: IntakeData = {
  imageName: "",
  imageDataUrl: "",
  sourceResolution: "",
  productCoverage: "",
  availableViews: "front only",
  aspectRatio: "1:1",
  aspectRatioCustom: "",
  outputSize: "2000 x 2000",
  outputSizeCustom: "",
  generationCount: "4",
  intendedUse: "Amazon gallery",
  sceneTypes: "",
  placementPreference: "centered",
  placementCustom: "",
  angleTolerance: "same angle only",
  angleDegrees: "0-10",
  stylePreference: "",
  styleCustom: "",
  strictness: "maximum preservation",
  mustPreserve: "logo, critical text, icons",
  draftApproval: "yes",
  maxIterations: "3",
  productFrameCoverageTarget: "55",
  useReferenceImage: false,
  referenceImageName: "",
  referenceImageDataUrl: "",
  referenceAnalysisModel: "gemini-3-flash-preview",
  sourceImages: [],
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
  referenceAnalysis: ImageAnalysis | null;
  intake: IntakeData;
  audit: AuditRow[];
  qa: QaScore[];
  setLocale: (locale: Locale) => void;
  setAnalysis: (analysis: ImageAnalysis | null) => void;
  setReferenceAnalysis: (analysis: ImageAnalysis | null) => void;
  setIntake: (data: IntakeData) => void;
  addSourceImages: (items: ImageAsset[]) => void;
  removeSourceImage: (index: number) => void;
  clearPrimaryImage: () => void;
  clearReferenceImage: () => void;
  setAuditCell: (index: number, field: keyof AuditRow, value: string) => void;
  setQaCell: (index: number, field: keyof QaScore, value: string) => void;
  resetAll: () => void;
};

export const usePipelineStore = create<PipelineState>()(
  persist(
    (set) => ({
      locale: "en",
      analysis: null,
      referenceAnalysis: null,
      intake: defaultIntake,
      audit: defaultAudit,
      qa: defaultQa,
      setLocale: (locale) => set({ locale }),
      setAnalysis: (analysis) => set({ analysis }),
      setReferenceAnalysis: (analysis) => set({ referenceAnalysis: analysis }),
      setIntake: (data) => set({ intake: data }),
      addSourceImages: (items) => set((state) => ({ intake: { ...state.intake, sourceImages: items.slice(0, 4) } })),
      removeSourceImage: (index) => set((state) => ({ intake: { ...state.intake, sourceImages: state.intake.sourceImages.filter((_, i) => i !== index) } })),
      clearPrimaryImage: () => set((state) => ({
        analysis: null,
        intake: { ...state.intake, imageName: "", imageDataUrl: "", sourceResolution: "", productCoverage: "" }
      })),
      clearReferenceImage: () => set((state) => ({
        referenceAnalysis: null,
        intake: { ...state.intake, referenceImageName: "", referenceImageDataUrl: "", useReferenceImage: false }
      })),
      setAuditCell: (index, field, value) => set((state) => ({ audit: state.audit.map((row, i) => (i === index ? { ...row, [field]: value } : row)) })),
      setQaCell: (index, field, value) => set((state) => ({ qa: state.qa.map((row, i) => (i === index ? { ...row, [field]: value } : row)) })),
      resetAll: () => set({ locale: "en", analysis: null, referenceAnalysis: null, intake: defaultIntake, audit: defaultAudit, qa: defaultQa }),
    }),
    { name: "product-scene-studio-pipeline", storage: createJSONStorage(() => localStorage) },
  ),
);
