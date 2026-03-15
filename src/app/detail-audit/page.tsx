"use client";

import styles from "../shared.module.css";
import { PipelineToolbar } from "@/components/PipelineToolbar";
import { ImagePreviewCard } from "@/components/ImagePreviewCard";
import { usePipelineStore } from "@/store/pipeline";
import pipelineStyles from "@/components/pipeline.module.css";

export default function DetailAuditPage() {
  const locale = usePipelineStore((s) => s.locale);
  const audit = usePipelineStore((s) => s.audit);
  const setAuditCell = usePipelineStore((s) => s.setAuditCell);

  return (
    <div className={styles.page}>
      <PipelineToolbar />
      <div className={styles.header}>
        <h1>{locale === 'en' ? 'Detail Audit' : '细节审核'}</h1>
        <p>{locale === 'en' ? 'Review which parts of the product are most important before generation.' : '生成前先判断产品哪些区域最重要，哪些地方绝不能乱。'}</p>
      </div>
      <section className={styles.card}><ImagePreviewCard /></section>
      <section className={styles.card}>
        <h2>{locale === 'en' ? 'Editable zone audit' : '可编辑区域审核'}</h2>
        <p className={styles.tip}>{locale === "en" ? "Use this table to mark which product zones are critical, what each zone contains, commercial risk if it fails, and the recommended handling strategy." : "这张表的作用是：告诉系统“产品的哪些区域最重要、里面有什么内容、如果出错会不会影响商用，以及生成时建议怎么处理”。如果你不确定怎么填，可以先从 logo、主标题、图标、小字、图案、外形这几类开始。"}</p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{locale === "en" ? "Zone" : "区域"}</th>
                <th>{locale === "en" ? "Contains" : "区域内容"}</th>
                <th>{locale === "en" ? "Importance" : "重要程度"}</th>
                <th>{locale === "en" ? "Action" : "处理方式"}</th>
                <th>{locale === "en" ? "Notes" : "备注"}</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((row, index) => (
                <tr key={row.zone}>
                  <td>{row.zone}</td>
                  <td><input className={pipelineStyles.input} value={row.contains} onChange={(e) => setAuditCell(index, 'contains', e.target.value)} placeholder={locale === "en" ? "e.g. logo, title text, icons, small text" : "例如：logo、主标题、icon、小字"} /></td>
                  <td><input className={pipelineStyles.input} value={row.importance} onChange={(e) => setAuditCell(index, 'importance', e.target.value)} placeholder={locale === "en" ? "e.g. critical / important / optional" : "例如：非常重要 / 一般重要 / 可忽略"} /></td>
                  <td><input className={pipelineStyles.input} value={row.action} onChange={(e) => setAuditCell(index, 'action', e.target.value)} placeholder={locale === "en" ? "e.g. preserve / extract / rebuild" : "例如：尽量保留 / 提取增强 / 必须重建"} /></td>
                  <td><textarea className={pipelineStyles.textarea} value={row.notes} onChange={(e) => setAuditCell(index, 'notes', e.target.value)} placeholder={locale === "en" ? "e.g. logo deformation is a hard fail" : "例如：这块 logo 一旦变形就不能用；这块小字可以弱化"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
