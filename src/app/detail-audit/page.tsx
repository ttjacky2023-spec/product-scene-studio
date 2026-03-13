import styles from "../shared.module.css";

const rows = [
  ["Logo", "Main brand mark", "Critical", "Reuse / Extract / Rebuild"],
  ["Title text", "Front display text", "Critical", "Reuse / Extract / Rebuild"],
  ["Icons", "Feature / certification icons", "Important", "Extract / Rebuild"],
  ["Fine print", "Small copy blocks", "Important/Minor", "Rebuild / Front-only"],
  ["Pattern", "Decorative texture or artwork", "Important", "Reuse / Controlled gen"],
  ["Form", "Silhouette and edges", "Critical", "Preserve geometry"],
] as const;

export default function DetailAuditPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Detail Audit</h1>
        <p>Classify each visible zone before any scene generation starts.</p>
      </div>
      <section className={styles.card}>
        <h2>Zone audit table</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Zone</th>
                <th>Contains</th>
                <th>Importance</th>
                <th>Recommended action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([zone, contains, importance, action]) => (
                <tr key={zone}>
                  <td>{zone}</td>
                  <td>{contains}</td>
                  <td>{importance}</td>
                  <td>{action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className={styles.grid}>
        <article className={styles.card}>
          <h2>Decision buckets</h2>
          <ul className={styles.list}>
            <li>Reuse directly for clean, sharp, high-confidence elements.</li>
            <li>Extract and enhance for readable but soft areas.</li>
            <li>Rebuild critical text, tiny icons, and unstable logos.</li>
          </ul>
        </article>
        <article className={styles.card}>
          <h2>Unsafe situations</h2>
          <ul className={styles.list}>
            <li>Single front view + large-angle request.</li>
            <li>Dense small copy that cannot survive generation.</li>
            <li>High-value branding zones on curved or glossy surfaces.</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
