"use client";

import { t } from "@/lib/i18n";
import { usePipelineStore } from "@/store/pipeline";
import styles from "./pipeline.module.css";

export function PipelineToolbar() {
  const locale = usePipelineStore((s) => s.locale);
  const intake = usePipelineStore((s) => s.intake);
  const resetAll = usePipelineStore((s) => s.resetAll);
  const text = t(locale);
  const labels = locale === "en"
    ? { ratio: "Ratio", output: "Output", angle: "Angle", strictness: "Strictness" }
    : { ratio: "比例", output: "输出", angle: "角度", strictness: "保真严格度" };

  return (
    <div className={styles.toolbar}>
      <div className={styles.badges}>
        <span className={styles.badge}>{labels.ratio}: {intake.aspectRatio || "—"}</span>
        <span className={styles.badge}>{labels.output}: {intake.outputSize || "—"}</span>
        <span className={styles.badge}>{labels.angle}: {intake.angleTolerance || "—"}</span>
        <span className={styles.badge}>{labels.strictness}: {intake.strictness || "—"}</span>
      </div>
      <button className={`${styles.button} ${styles.secondary}`} onClick={resetAll}>{text.common.reset}</button>
    </div>
  );
}
