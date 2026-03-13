import styles from "./page.module.css";

const checklist = [
  "Collect output ratio, pixel size, quantity, usage, scene types, placement, and angle tolerance.",
  "Audit logo, text, icon, pattern, and silhouette zones before generation.",
  "Choose extract vs rebuild per critical detail area.",
  "Route reasoning to gpt-5.4 and visual checks to Gemini image models.",
  "Generate only a small draft set before scaling.",
  "Reject any output that corrupts branding or product geometry.",
];

const steps = [
  ["1. Intake", "Gather image specs, scene request, strictness level, and approval mode."],
  ["2. Audit", "Measure which visible details are safe to reuse, extract, or rebuild."],
  ["3. Plan", "Choose style, execution mode, prompts, repair path, and model routing."],
  ["4. QA", "Score every draft and loop until critical branding passes."],
] as const;

export default function Home() {
  return (
    <>
      <section className={styles.hero}>
        <span className={styles.kicker}>V3 workflow</span>
        <h1>Brand-safe product scene generation, with audit and QA built in.</h1>
        <p>
          Product Scene Studio is the public control layer for a repeatable pipeline: intake,
          detail audit, generation planning, draft execution, and quality control for product
          images whose branding details must survive scene generation.
        </p>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>What this version already enforces</h2>
          <ul className={styles.list}>
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <article className={styles.card}>
          <h2>Use it as a controlled workflow</h2>
          <ul className={styles.list}>
            <li>Start in Intake Form to define the run.</li>
            <li>Move to Detail Audit before any generation happens.</li>
            <li>Use Generation Plan to lock scenes, prompts, and routing.</li>
            <li>Finish in QA Scorecard before approving any output batch.</li>
          </ul>
        </article>
      </section>

      <section className={styles.steps}>
        {steps.map(([title, text]) => (
          <article className={styles.step} key={title}>
            <strong>{title}</strong>
            <p>{text}</p>
          </article>
        ))}
      </section>
    </>
  );
}
