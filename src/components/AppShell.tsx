"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";
import { usePipelineStore } from "@/store/pipeline";
import styles from "./nav.module.css";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const locale = usePipelineStore((s) => s.locale);
  const setLocale = usePipelineStore((s) => s.setLocale);
  const text = t(locale);
  const links = [
    ["/", text.nav.overview],
    ["/intake", text.nav.intake],
    ["/detail-audit", text.nav.audit],
    ["/generation-plan", text.nav.plan],
    ["/qa-scorecard", text.nav.qa],
  ] as const;

  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.brand}>{text.brand}</Link>
          <div className={styles.right}>
            <nav className={styles.links}>
              {links.map(([href, label]) => {
                const active = pathname === href;
                return <Link key={href} href={href} className={`${styles.link} ${active ? styles.active : ""}`.trim()}>{label}</Link>;
              })}
            </nav>
            <select className={styles.select} value={locale} onChange={(e) => setLocale(e.target.value as "en" | "zh")}> 
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
