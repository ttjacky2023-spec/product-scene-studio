import styles from "../shared.module.css";

const scores = [
  ["Silhouette fidelity", "4"],
  ["Logo fidelity", "5"],
  ["Text fidelity", "5 for critical text / 3 for minor text"],
  ["Icon fidelity", "4"],
  ["Pattern/material fidelity", "4"],
  ["Scene realism", "4"],
  ["Placement realism", "4"],
  ["Lighting consistency", "4"],
] as const;

export default function QaPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>QA Scorecard</h1>
        <p>Every draft must pass branding and geometry checks before approval.</p>
      </div>
      <section className={styles.card}>
        <h2>Scoring thresholds</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Category</th>
                <th>Pass threshold</th>
              </tr>
            </thead>
            <tbody>
              {scores.map(([name, threshold]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>{threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Hard fail conditions</h2>
          <ul className={styles.list}>
            <li>Hallucinated brand name or changed logo geometry.</li>
            <li>Unreadable critical text.</li>
            <li>Missing or corrupted key icon.</li>
            <li>Distorted product form.</li>
          </ul>
        </article>
        <article className={styles.card}>
          <h2>Allowed decisions</h2>
          <ul className={styles.list}>
            <li>PASS</li>
            <li>REPAIR</li>
            <li>REGENERATE</li>
            <li>REJECT ANGLE / REJECT SCENE</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
