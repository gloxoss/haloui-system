export function PrintLayout({
  children,
  className = "",
  theme = "slate-minimal",
}: {
  children: React.ReactNode;
  className?: string;
  theme?: string;
}) {
  return (
    <main
      data-ui-theme={theme}
      className={`print-root ${className}`}
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }

        .print-root {
          --print-bg: #ffffff;
          --print-text: #0f172a;
          --print-text-muted: #475569;
          --print-border-strong: #0f172a;
          --print-border-medium: #64748b;
          --print-border-light: #cbd5e1;
          --print-accent-dark: #1e3a8a;
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: var(--print-text) !important;
          font-family: var(--font-ui), system-ui, -apple-system, sans-serif;
        }

        .print-root[data-ui-theme="corporate-navy"] {
          --print-text: #0f172a;
          --print-text-muted: #1e3a8a;
          --print-border-strong: #1e3a8a;
          --print-border-medium: #1e40af;
          --print-border-light: #cbd5e1;
          --print-accent-dark: #1e3a8a;
        }

        .print-root[data-ui-theme="monochrome-black"] {
          --print-text: #000000;
          --print-text-muted: #27272a;
          --print-border-strong: #000000;
          --print-border-medium: #27272a;
          --print-border-light: #a1a1aa;
          --print-accent-dark: #000000;
        }

        .print-root[data-ui-theme="haloui-classic"] {
          --print-text: #1c1917;
          --print-text-muted: #573212;
          --print-border-strong: #451a03;
          --print-border-medium: #78350f;
          --print-border-light: #d6d3d1;
          --print-accent-dark: #451a03;
        }

        .print-root[data-ui-theme="olive-ledger"] {
          --print-text: #142316;
          --print-text-muted: #283618;
          --print-border-strong: #1e3321;
          --print-border-medium: #3a5a40;
          --print-border-light: #c5ccb8;
          --print-accent-dark: #1e3321;
        }

        .print-root[data-ui-theme="emerald-luxe"] {
          --print-text: #064e3b;
          --print-text-muted: #047857;
          --print-border-strong: #065f46;
          --print-border-medium: #059669;
          --print-border-light: #a7f3d0;
          --print-accent-dark: #064e3b;
        }

        .print-root[data-ui-theme="indigo-royal"] {
          --print-text: #1e1b4b;
          --print-text-muted: #4338ca;
          --print-border-strong: #3730a3;
          --print-border-medium: #4f46e5;
          --print-border-light: #c7d2fe;
          --print-accent-dark: #312e81;
        }

        .print-root[data-ui-theme="crimson-executive"] {
          --print-text: #450a0a;
          --print-text-muted: #991b1b;
          --print-border-strong: #7f1d1d;
          --print-border-medium: #b91c1c;
          --print-border-light: #fecaca;
          --print-accent-dark: #7f1d1d;
        }

        .print-root[data-ui-theme="ocean-cyan"] {
          --print-text: #083344;
          --print-text-muted: #0e7490;
          --print-border-strong: #155e75;
          --print-border-medium: #0891b2;
          --print-border-light: #a5f3fc;
          --print-accent-dark: #164e63;
        }

        .print-root[data-ui-theme="sunset-amber"] {
          --print-text: #431407;
          --print-text-muted: #9a3412;
          --print-border-strong: #7c2d12;
          --print-border-medium: #c2410c;
          --print-border-light: #fed7aa;
          --print-accent-dark: #7c2d12;
        }

        .print-root[data-ui-theme="violet-plum"] {
          --print-text: #3b0764;
          --print-text-muted: #6b21a8;
          --print-border-strong: #581c87;
          --print-border-medium: #7c3aed;
          --print-border-light: #e9d5ff;
          --print-accent-dark: #581c87;
        }

        @media screen {
          body {
            background-color: #cbd5e1;
            padding: 24px 0;
            margin: 0;
          }
          .print-root {
            background: #ffffff;
            width: 210mm;
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 8mm 12mm;
            box-sizing: border-box;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.18);
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        }

        @media print {
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-root {
            width: 210mm !important;
            max-width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 8mm 12mm !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          table { page-break-inside: auto; }
          tr, td, th { page-break-inside: avoid; }
          .totals-box { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
      {children}
    </main>
  );
}
