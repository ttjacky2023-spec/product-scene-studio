"use client";

import { t } from "@/lib/i18n";
import { usePipelineStore } from "@/store/pipeline";
import styles from "./pipeline.module.css";

export function ImagePreviewCard() {
  const locale = usePipelineStore((s) => s.locale);
  const intake = usePipelineStore((s) => s.intake);
  const text = t(locale);

  return (
    <div className={styles.previewBox}>
      {intake.imageDataUrl ? (
        <img src={intake.imageDataUrl} alt={intake.imageName || "Uploaded product"} className={styles.preview} />
      ) : (
        <div className={styles.empty}>{text.common.imageMissing}</div>
      )}
      <div className={styles.kv}>
        <div className={styles.kvItem}><strong>Image</strong>{intake.imageName || "—"}</div>
        <div className={styles.kvItem}><strong>Resolution</strong>{intake.sourceResolution || "—"}</div>
        <div className={styles.kvItem}><strong>Use</strong>{intake.intendedUse || "—"}</div>
        <div className={styles.kvItem}><strong>Scene types</strong>{intake.sceneTypes || "—"}</div>
        <div className={styles.kvItem}><strong>Placement</strong>{intake.placementPreference || "—"}</div>
        <div className={styles.kvItem}><strong>Must preserve</strong>{intake.mustPreserve || "—"}</div>
      </div>
    </div>
  );
}
