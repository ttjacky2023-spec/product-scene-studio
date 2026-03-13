"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./nav.module.css";

const links = [
  ["/", "Overview"],
  ["/intake", "Intake Form"],
  ["/detail-audit", "Detail Audit"],
  ["/generation-plan", "Generation Plan"],
  ["/qa-scorecard", "QA Scorecard"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>
            Product Scene Studio
          </Link>
          <nav className={styles.links}>
            {links.map(([href, label]) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.link} ${active ? styles.active : ""}`.trim()}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
