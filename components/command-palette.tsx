"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState, startTransition } from "react";

import { Input } from "@/components/ui/input";
import { type SearchResult } from "@/lib/types";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        startTransition(() => setOpen((current) => !current));
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || !deferredQuery.trim()) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(deferredQuery)}`, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as { results: SearchResult[] };
      startTransition(() => setResults(payload.results));
    }, 150);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [deferredQuery, open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden min-h-9 rounded-xl border bg-[var(--card)] px-3 text-[13px] text-[var(--muted)] shadow-sm md:inline-flex md:min-w-56 md:items-center md:justify-between"
      >
        <span>Recherche globale</span>
        <span className="rounded-full bg-[var(--background-alt)] px-2 py-1 text-xs">Ctrl+K</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[rgba(55,35,18,0.24)] px-4 pt-16 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[20px] border bg-[var(--card)] p-3 shadow-[var(--shadow-lg)]">
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un document, un produit, un client..."
        />
        <div className="mt-4 grid gap-2">
          {results.length === 0 ? (
            <p className="rounded-xl bg-[var(--background-alt)] px-3 py-4 text-[13px] text-[var(--muted)]">
              {query.trim() ? "Aucun résultat." : "Commencez à taper pour lancer la recherche."}
            </p>
          ) : (
            results.map((result) => (
              <Link
                key={`${result.type}-${result.id}`}
                href={result.href}
                onClick={() => setOpen(false)}
                className="rounded-xl border bg-[var(--background)] px-3 py-2.5 transition duration-200 hover:border-[var(--accent)] hover:bg-[var(--background-alt)]"
              >
                <div className="font-semibold">{result.label}</div>
                <div className="text-xs text-[var(--muted)]">{result.meta}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
