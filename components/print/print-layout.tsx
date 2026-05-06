export function PrintLayout({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={`mx-auto w-full max-w-[186mm] bg-white text-[11.5px] text-[#16110d] print:max-w-none ${className}`}>
      <style>{`
        @page { size: A4; margin: 6mm 8mm; }
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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
