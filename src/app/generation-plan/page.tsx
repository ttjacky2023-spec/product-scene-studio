import styles from "../shared.module.css";

export default function GenerationPlanPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Generation Plan</h1>
        <p>Lock style, routing, prompts, and repair logic before drafts are produced.</p>
      </div>
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2>Model routing</h2>
          <ul className={styles.list}>
            <li><strong>gpt-5.4</strong>: workflow reasoning, extraction vs rebuild, prompt strategy.</li>
            <li><strong>Gemini flash image</strong>: quick OCR, coarse visual checks, fast ideation.</li>
            <li><strong>Gemini pro image</strong>: detailed visual analysis and stricter QA.</li>
          </ul>
        </section>
        <section className={styles.card}>
          <h2>Execution mode</h2>
          <ul className={styles.list}>
            <li><strong>Mode A</strong>: same-angle composited scene for maximum preservation.</li>
            <li><strong>Mode B</strong>: slight-angle assisted generation for simple products.</li>
            <li><strong>Mode C</strong>: reconstruction-first for significant angle changes.</li>
          </ul>
        </section>
        <section className={styles.card}>
          <h2>Prompt constraints</h2>
          <textarea readOnly value={'preserve product identity\npreserve visible branding\nno extra text\nno altered logo\nno warped geometry\nkeep material finish consistent\nphysically plausible placement'} />
        </section>
        <section className={styles.card}>
          <h2>Repair path</h2>
          <ul className={styles.list}>
            <li>Replace logo layer</li>
            <li>Replace rebuilt text layer</li>
            <li>Re-composite front face</li>
            <li>Regenerate background or props only</li>
            <li>Reduce angle variance if fidelity keeps failing</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
