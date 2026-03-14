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
  { zone: "Logo", contains: "品牌主标识", importance: "非常重要", action: "尽量保留", notes: "" },
  { zone: "主标题", contains: "包装正面主文字", importance: "非常重要", action: "提取增强", notes: "" },
  { zone: "图标", contains: "功能图标 / 认证图标", importance: "重要", action: "提取增强", notes: "" },
  { zone: "小字", contains: "说明小字 / 参数小字", importance: "次要", action: "必要时重建", notes: "" },
  { zone: "图案", contains: "装饰纹理 / 包装图案", importance: "重要", action: "受控生成", notes: "" },
  { zone: "外形", contains: "轮廓 / 边缘 / 结构", importance: "非常重要", action: "保持结构", notes: "" },
];

const defaultQa: QaScore[] = [
  { category: "外形一致性", score: "", notes: "" },
  { category: "Logo 一致性", score: "", notes: "" },
  { category: "文字一致性", score: "", notes: "" },
  { category: "图标一致性", score: "", notes: "" },
  { category: "图案与材质一致性", score: "", notes: "" },
  { category: "场景真实性", score: "", notes: "" },
  { category: "摆放合理性", score: "", notes: "" },
  { category: "光影一致性", score: "", notes: "" },
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
