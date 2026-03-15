"use client";

import { t } from "@/lib/i18n";
import { usePipelineStore } from "@/store/pipeline";
import styles from "./pipeline.module.css";

export function ImagePreviewCard() {
  const locale = usePipelineStore((s) => s.locale);
  const intake = usePipelineStore((s) => s.intake);
  const text = t(locale);
  const labels = locale === "en"
    ? { image: "Image", resolution: "Resolution", use: "Use", scene: "Scene types", placement: "Placement", preserve: "Must preserve" }
    : { image: "图片", resolution: "分辨率", use: "用途", scene: "场景类型", placement: "摆放方式", preserve: "必须保留" };

  return (
    <div className={styles.previewBox}>
      {intake.imageDataUrl ? (
        <img src={intake.imageDataUrl} alt={intake.imageName || "Uploaded product"} className={styles.preview} />
      ) : (
        <div className={styles.empty}>{text.common.imageMissing}</div>
      )}
      <div className={styles.kv}>
        <div className={styles.kvItem}><strong>{labels.image}</strong>{intake.imageName || "—"}</div>
        <div className={styles.kvItem}><strong>{labels.resolution}</strong>{intake.sourceResolution || "—"}</div>
        <div className={styles.kvItem}><strong>{labels.use}</strong>{intake.intendedUse || "—"}</div>
        <div className={styles.kvItem}><strong>{labels.scene}</strong>{intake.sceneTypes || "—"}</div>
        <div className={styles.kvItem}><strong>{labels.placement}</strong>{intake.placementPreference || "—"}</div>
        <div className={styles.kvItem}><strong>{labels.preserve}</strong>{intake.mustPreserve || "—"}</div>
      </div>
    </div>
  );
}
