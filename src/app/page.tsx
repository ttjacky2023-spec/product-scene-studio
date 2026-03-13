import styles from "./page.module.css";

const checklist = [
  "Upload one high-resolution product image",
  "Choose ratio, output size, and generation count",
  "Set scene type, placement preference, and angle tolerance",
  "Audit logo, icon, text, and pattern zones before generation",
  "Route work by task: planning, visual analysis, QA, and iteration",
  "Reject any output that corrupts critical branding details",
];

const outputs = [
  "Intake form",
  "Detail audit",
  "Generation plan",
  "QA scorecard",
  "Iteration log",
];

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.kicker}>Product Scene Generation Pipeline</span>
          <h1>Turn a product image into brand-safe scene images.</h1>
          <p>
            This public web version is being prepared as the control surface for a repeatable
            workflow: collect specs, audit details, decide extract vs rebuild, generate drafts,
            and quality-check every output before approval.
          </p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>What the pipeline enforces</h2>
            <ul>
              {checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className={styles.card}>
            <h2>Core run artifacts</h2>
            <ul>
              {outputs.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className={styles.note}>
          <h3>Current status</h3>
          <p>
            Local app scaffold is ready. Next deployment steps require GitHub and Vercel access,
            which should be configured with secure auth methods rather than pasted into chat.
          </p>
        </section>
      </main>
    </div>
  );
}
