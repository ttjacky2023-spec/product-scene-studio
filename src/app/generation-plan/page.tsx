"use client";

import styles from "../shared.module.css";
import pipelineStyles from "@/components/pipeline.module.css";
import { PipelineToolbar } from "@/components/PipelineToolbar";
import { ImagePreviewCard } from "@/components/ImagePreviewCard";
import { t } from "@/lib/i18n";
import { usePipelineStore } from "@/store/pipeline";

function recommendExecutionMode(views: string, angle: string, strictness: string) {
  if (strictness === "maximum preservation" && views.includes("front only")) return "Mode A — same-angle composited scene";
  if (angle === "significant angle change") return "Mode C — reconstruction-first";
  return "Mode B — slight-angle assisted generation";
}
function recommendStyle(intendedUse: string, sceneTypes: string) {
  if (/Amazon|gallery/i.test(intendedUse)) return "clean ecommerce lifestyle with bright controllable lighting";
  if (/ads|social/i.test(intendedUse)) return "high-contrast marketing lifestyle scene";
  if (/kitchen|home/i.test(sceneTypes)) return "natural home-use lifestyle scene";
  return "minimal premium product scene";
}
function buildReport(intake: ReturnType<typeof usePipelineStore.getState>["intake"], extractList: string, rebuildList: string, executionMode: string, style: string) {
  return `# Product Scene Generation Report\n\n## Intake\n- Image: ${intake.imageName || "—"}\n- Resolution: ${intake.sourceResolution || "—"}\n- Ratio: ${intake.aspectRatio || "—"}\n- Output: ${intake.outputSize || "—"}\n- Count: ${intake.generationCount || "—"}\n- Use: ${intake.intendedUse || "—"}\n- Scene types: ${intake.sceneTypes || "—"}\n- Placement: ${intake.placementPreference || "—"}\n- Angle tolerance: ${intake.angleTolerance || "—"}\n- Strictness: ${intake.strictness || "—"}\n\n## Plan\n- Execution mode: ${executionMode}\n- Style: ${style}\n- Extract zones: ${extractList}\n- Rebuild zones: ${rebuildList}\n\n## Model routing\n- gpt-5.4: workflow reasoning, extraction vs rebuild, planning\n- Gemini flash image: quick OCR, coarse checks\n- Gemini pro image: detailed visual analysis and strict QA\n\n## API placeholder\nPOST /api/analyze-image\nPOST /api/generate-plan\nPOST /api/run-qa\n`;
}

export default function GenerationPlanPage() {
  const locale = usePipelineStore((s) => s.locale);
  const text = t(locale);
  const intake = usePipelineStore((s) => s.intake);
  const audit = usePipelineStore((s) => s.audit);
  const executionMode = recommendExecutionMode(intake.availableViews, intake.angleTolerance, intake.strictness);
  const style = recommendStyle(intake.intendedUse, intake.sceneTypes);
  const rebuildList = audit.filter((x) => /rebuild/i.test(x.action)).map((x) => x.zone).join(", ") || "none";
  const extractList = audit.filter((x) => /extract/i.test(x.action)).map((x) => x.zone).join(", ") || "none";
  const report = buildReport(intake, extractList, rebuildList, executionMode, style);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ intake, audit, executionMode, style, extractList, rebuildList }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "product-scene-plan.json"; a.click(); URL.revokeObjectURL(url);
  };
  const exportReport = () => {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "product-scene-report.md"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <PipelineToolbar />
      <div className={styles.header}><h1>{locale === "en" ? "Generation Plan" : "生成计划"}</h1><p>{locale === "en" ? "Plan output strategy from saved intake + detail audit data." : "根据已保存的 intake 和 detail audit 数据生成执行计划。"}</p></div>
      <section className={styles.card}><ImagePreviewCard /></section>
      <div className={styles.grid}>
        <section className={styles.card}><h2>{locale === "en" ? "Recommended plan" : "推荐计划"}</h2><ul className={styles.list}>
          <li><strong>Execution mode:</strong> {executionMode}</li>
          <li><strong>Style:</strong> {style}</li>
          <li><strong>Extract zones:</strong> {extractList}</li>
          <li><strong>Rebuild zones:</strong> {rebuildList}</li>
          <li><strong>Output target:</strong> {intake.generationCount || "—"} image(s) at {intake.outputSize || "—"}</li>
        </ul></section>
        <section className={styles.card}><h2>{locale === "en" ? "Model routing" : "模型路由"}</h2><ul className={styles.list}>
          <li><strong>gpt-5.4:</strong> workflow reasoning, extraction vs rebuild, workflow planning.</li>
          <li><strong>Gemini flash image:</strong> quick OCR, coarse visual checks, fast ideation.</li>
          <li><strong>Gemini pro image:</strong> detailed visual analysis and strict QA.</li>
        </ul></section>
      </div>
      <section className={styles.card}>
        <div className={pipelineStyles.actions}>
          <button className={pipelineStyles.button} onClick={exportJson}>{text.common.exportJson}</button>
          <button className={`${pipelineStyles.button} ${pipelineStyles.secondary}`} onClick={exportReport}>{text.common.exportReport}</button>
        </div>
      </section>
      <section className={styles.card}><h2>{text.common.apiPlaceholder}</h2><pre className={pipelineStyles.code}>{`POST /api/analyze-image\nPOST /api/generate-plan\nPOST /api/run-qa\n\nCurrent deployment keeps these as frontend placeholders for the next backend/API step.`}</pre></section>
    </div>
  );
}
