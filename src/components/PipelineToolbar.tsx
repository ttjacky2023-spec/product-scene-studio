"use client";

import { usePipelineStore } from "@/store/pipeline";
import styles from "./pipeline.module.css";

export function PipelineToolbar() {
  const intake = usePipelineStore((s) => s.intake);
  const resetAll = usePipelineStore((s) => s.resetAll);

  return (
    <div className={styles.toolbar}>
      <div className={styles.badges}>
        <span className={styles.badge}>Ratio: {intake.aspectRatio || "—"}</span>
        <span className={styles.badge}>Output: {intake.outputSize || "—"}</span>
        <span className={styles.badge}>Angle: {intake.angleTolerance || "—"}</span>
        <span className={styles.badge}>Strictness: {intake.strictness || "—"}</span>
      </div>
      <button className={`${styles.button} ${styles.secondary}`} onClick={resetAll}>Reset pipeline</button>
    </div>
  );
}
