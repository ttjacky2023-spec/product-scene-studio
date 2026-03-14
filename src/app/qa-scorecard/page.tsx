"use client";

import styles from "../shared.module.css";
import { PipelineToolbar } from "@/components/PipelineToolbar";
import { ImagePreviewCard } from "@/components/ImagePreviewCard";
import { usePipelineStore } from "@/store/pipeline";
import pipelineStyles from "@/components/pipeline.module.css";

export default function QaPage() {
  const locale = usePipelineStore((s) => s.locale);
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
        <h1>{locale === 'en' ? 'QA Scorecard' : '质量评分表'}</h1>
        <p>{locale === 'en' ? 'Score each category and decide pass, repair, or regenerate.' : '给每项质量打分，判断是通过、修复，还是重新生成。'}</p>
      </div>
      <section className={styles.card}><ImagePreviewCard /></section>
      <section className={styles.card}>
        <h2>{locale === 'en' ? 'Editable QA table' : '可编辑质量评分表'}</h2>
        <p className={styles.tip}>这张表不是给你填专业术语，而是帮助你判断：这次生成图到底能不能用，哪里出了问题。</p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>检查项</th><th>分数（0-5）</th><th>备注</th></tr></thead>
            <tbody>
              {qa.map((row, index) => (
                <tr key={row.category}>
                  <td>{row.category}</td>
                  <td><input className={pipelineStyles.input} value={row.score} onChange={(e) => setQaCell(index, 'score', e.target.value)} placeholder="0-5" /></td>
                  <td><textarea className={pipelineStyles.textarea} value={row.notes} onChange={(e) => setQaCell(index, 'notes', e.target.value)} placeholder="例如：logo 轻微变形；文字有错；角度不对；产品太小" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={styles.card}>
        <h2>{locale === 'en' ? 'Current decision' : '当前判断'}</h2>
        <p>{hardFail ? '当前结果触发了严重问题：logo / 文字这类关键项目分数过低。' : '当前还没有检测到严重问题，或你还没有填分。'}</p>
      </section>
    </div>
  );
}
