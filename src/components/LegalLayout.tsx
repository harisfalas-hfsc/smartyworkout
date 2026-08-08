import { type ReactNode } from "react";

export function LegalLayout({
  title,
  icon,
  lastUpdated,
  children,
}: {
  title: string;
  icon: ReactNode;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-5 pb-6 pt-5">
      <div className="flex items-center gap-3">
        <span
          className="grid place-items-center text-primary-foreground"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            background: "var(--gradient-primary)",
          }}
        >
          {icon}
        </span>
        <h1 className="text-foreground" style={{ fontWeight: 700, fontSize: 26, lineHeight: 1.1, margin: 0 }}>
          {title}
        </h1>
      </div>

      <div
        className="mt-4 text-muted-foreground"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 18,
          padding: "16px 18px",
          fontSize: 13,
        }}
      >
        <strong className="text-foreground">Last updated:</strong> {lastUpdated} ·{" "}
        <strong className="text-foreground">Operator:</strong> SmartyWorkout (smartyworkout.com), part of the{" "}
        <a
          href="https://smartywellness.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-semibold hover:underline"
        >
          Smarty Wellness
        </a>{" "}
        family of brands (with{" "}
        <a
          href="https://smartygym.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-semibold hover:underline"
        >
          SmartyGym
        </a>{" "}
        and{" "}
        <a
          href="https://smartymove.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-semibold hover:underline"
        >
          SmartyMove
        </a>
        ) ·{" "}
        <strong className="text-foreground">Contact:</strong>{" "}
        <a href="mailto:smartyworkout@outlook.com" className="text-primary font-semibold hover:underline">
          smartyworkout@outlook.com
        </a>
      </div>

      <article
        className="legal-prose mt-6 text-muted-foreground"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 22,
          padding: "22px 22px 26px",
          fontSize: 15,
          lineHeight: 1.65,
        }}
      >
        {children}
      </article>

      <style>{`
        .legal-prose h2{ font-weight:700; font-size:18px; color:var(--foreground); margin:22px 0 8px; }
        .legal-prose h2:first-child{ margin-top:0; }
        .legal-prose h3{ font-weight:600; font-size:15px; color:var(--foreground); margin:16px 0 6px; }
        .legal-prose p{ margin:0 0 10px; }
        .legal-prose ul{ margin:0 0 12px; padding-left:18px; }
        .legal-prose li{ margin-bottom:6px; }
        .legal-prose strong{ color:var(--foreground); }
        .legal-prose a{ color:var(--primary); font-weight:600; text-decoration:none; }
        .legal-prose a:hover{ text-decoration:underline; }
        .legal-prose .callout{ background:#FFF4F0; border:1px solid #FFD7CB; border-radius:14px; padding:14px 16px; margin:14px 0; color:#7A2C13; }
        .legal-prose .callout strong{ color:#B23A1A; }
        .legal-prose .note{ background:var(--muted); border:1px solid var(--border); border-radius:14px; padding:12px 14px; margin:14px 0; font-size:13.5px; }
      `}</style>
    </main>
  );
}
