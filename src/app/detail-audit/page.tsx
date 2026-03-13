"use client";

import styles from "../shared.module.css";
import { PipelineToolbar } from "@/components/PipelineToolbar";
import { ImagePreviewCard } from "@/components/ImagePreviewCard";
import { usePipelineStore } from "@/store/pipeline";
import pipelineStyles from "@/components/pipeline.module.css";

export default function DetailAuditPage() {
  const audit = usePipelineStore((s) => s.audit);
  const setAuditCell = usePipelineStore((s) => s.setAuditCell);

  return (
    <div className={styles.page}>
      <PipelineToolbar />
      <div className={styles.header}>
        <h1>Detail Audit</h1>
        <p>Inspect the uploaded product image and decide reuse vs extract vs rebuild.</p>
      </div>
      <section className={styles.card}><ImagePreviewCard /></section>
      <section className={styles.card}>
        <h2>Editable zone audit</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Zone</th><th>Contains</th><th>Importance</th><th>Action</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {audit.map((row, index) => (
                <tr key={row.zone}>
                  <td>{row.zone}</td>
                  <td><input className={pipelineStyles.input} value={row.contains} onChange={(e) => setAuditCell(index, "contains", e.target.value)} /></td>
                  <td><input className={pipelineStyles.input} value={row.importance} onChange={(e) => setAuditCell(index, "importance", e.target.value)} /></td>
                  <td><input className={pipelineStyles.input} value={row.action} onChange={(e) => setAuditCell(index, "action", e.target.value)} /></td>
                  <td><textarea className={pipelineStyles.textarea} value={row.notes} onChange={(e) => setAuditCell(index, "notes", e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
