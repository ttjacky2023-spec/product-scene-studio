import type { Locale } from "./types";

export const copy = {
  en: {
    brand: "Product Scene Studio",
    nav: {
      overview: "Overview",
      intake: "Intake Form",
      audit: "Detail Audit",
      plan: "Generation Plan",
      qa: "QA Scorecard",
    },
    common: {
      currentStatus: "Current pipeline status",
      reset: "Reset pipeline",
      save: "Save intake",
      saved: "Saved to pipeline state.",
      imageMissing: "No image uploaded yet. Add a source image in Intake Form first.",
      exportJson: "Export JSON",
      exportReport: "Export Report",
      apiPlaceholder: "API Placeholder",
      language: "Language",
    },
  },
  zh: {
    brand: "产品场景工作台",
    nav: {
      overview: "总览",
      intake: "信息填写",
      audit: "细节审计",
      plan: "生成计划",
      qa: "质检评分",
    },
    common: {
      currentStatus: "当前工作流状态",
      reset: "重置流程",
      save: "保存信息",
      saved: "已保存到流程状态。",
      imageMissing: "还没有上传图片，请先到 Intake Form 页面上传源图。",
      exportJson: "导出 JSON",
      exportReport: "导出报告",
      apiPlaceholder: "API 占位",
      language: "语言",
    },
  },
} as const;

export function t(locale: Locale) {
  return copy[locale];
}
