"use client";

import styles from "../shared.module.css";
import { PipelineToolbar } from "@/components/PipelineToolbar";
import { ImagePreviewCard } from "@/components/ImagePreviewCard";
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

export default function GenerationPlanPage() {
  const intake = usePipelineStore((s) => s.intake);
  const audit = usePipelineStore((s) => s.audit);
  const executionMode = recommendExecutionMode(intake.availableViews, intake.angleTolerance, intake.strictness);
  const style = recommendStyle(intake.intendedUse, intake.sceneTypes);
  const rebuildList = audit.filter((x) => /rebuild/i.test(x.action)).map((x) => x.zone).join(", ") || "none";
  const extractList = audit.filter((x) => /extract/i.test(x.action)).map((x) => x.zone).join(", ") || "none";

  return (
    <div className={styles.page}>
      <PipelineToolbar />
      <div className={styles.header}>
        <h1>Generation Plan</h1>
        <p>Plan output strategy from saved intake + detail audit data.</p>
      </div>
      <section className={styles.card}><ImagePreviewCard /></section>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Recommended plan</h2>
          <ul className={styles.list}>
            <li><strong>Execution mode:</strong> {executionMode}</li>
            <li><strong>Style:</strong> {style}</li>
            <li><strong>Extract zones:</strong> {extractList}</li>
            <li><strong>Rebuild zones:</strong> {rebuildList}</li>
            <li><strong>Output target:</strong> {intake.generationCount || "—"} image(s) at {intake.outputSize || "—"}</li>
          </ul>
        </section>
        <section className={styles.card}>
          <h2>Model routing</h2>
          <ul className={styles.list}>
            <li><strong>gpt-5.4:</strong> reasoning, extraction vs rebuild, workflow planning.</li>
            <li><strong>Gemini flash image:</strong> quick OCR, coarse visual checks, fast ideation.</li>
            <li><strong>Gemini pro image:</strong> detailed visual analysis and strict QA.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
