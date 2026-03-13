"use client";

import { t } from "@/lib/i18n";
import { usePipelineStore } from "@/store/pipeline";
import styles from "./pipeline.module.css";

export function PipelineToolbar() {
  const locale = usePipelineStore((s) => s.locale);
  const intake = usePipelineStore((s) => s.intake);
  const resetAll = usePipelineStore((s) => s.resetAll);
  const text = t(locale);

  return (
    <div className={styles.toolbar}>
      <div className={styles.badges}>
        <span className={styles.badge}>Ratio: {intake.aspectRatio || "—"}</span>
        <span className={styles.badge}>Output: {intake.outputSize || "—"}</span>
        <span className={styles.badge}>Angle: {intake.angleTolerance || "—"}</span>
        <span className={styles.badge}>Strictness: {intake.strictness || "—"}</span>
      </div>
      <button className={`${styles.button} ${styles.secondary}`} onClick={resetAll}>{text.common.reset}</button>
    </div>
  );
}
