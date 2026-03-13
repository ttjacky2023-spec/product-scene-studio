"use client";

import styles from "../shared.module.css";
import { PipelineToolbar } from "@/components/PipelineToolbar";
import { ImagePreviewCard } from "@/components/ImagePreviewCard";
import { usePipelineStore } from "@/store/pipeline";
import pipelineStyles from "@/components/pipeline.module.css";

export default function QaPage() {
  const qa = usePipelineStore((s) => s.qa);
  const setQaCell = usePipelineStore((s) => s.setQaCell);
  const hardFail = qa.some((row) => {
    const score = Number(row.score || 0);
    return (row.category === "Logo fidelity" || row.category === "Text fidelity") && score > 0 && score < 5;
  });

  return (
    <div className={styles.page}>
      <PipelineToolbar />
      <div className={styles.header}>
        <h1>QA Scorecard</h1>
        <p>Score each category and decide pass, repair, or regenerate.</p>
      </div>
      <section className={styles.card}><ImagePreviewCard /></section>
      <section className={styles.card}>
        <h2>Editable QA table</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Category</th><th>Score (0-5)</th><th>Notes</th></tr></thead>
            <tbody>
              {qa.map((row, index) => (
                <tr key={row.category}>
                  <td>{row.category}</td>
                  <td><input className={pipelineStyles.input} value={row.score} onChange={(e) => setQaCell(index, "score", e.target.value)} placeholder="0-5" /></td>
                  <td><textarea className={pipelineStyles.textarea} value={row.notes} onChange={(e) => setQaCell(index, "notes", e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={styles.card}>
        <h2>Current decision</h2>
        <p>{hardFail ? "Hard fail triggered: logo/text critical categories are below pass threshold." : "No hard fail detected from current QA entries."}</p>
      </section>
    </div>
  );
}
