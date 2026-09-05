"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

interface PrintToolbarProps {
  title: string;
  autoPrint?: boolean;
}

export function PrintToolbar({ title, autoPrint = true }: PrintToolbarProps) {
  useEffect(() => {
    if (autoPrint) {
      const timer = window.setTimeout(() => {
        window.print();
      }, 350);
      return () => window.clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="no-print bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <Link
          href="/pos"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour Caisse
        </Link>
        <span className="text-xs font-bold text-slate-900">{title}</span>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition shadow-sm"
      >
        <Printer className="w-3.5 h-3.5" />
        Imprimer (80mm)
      </button>
    </div>
  );
}
