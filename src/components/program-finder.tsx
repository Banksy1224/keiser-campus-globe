// Program finder panel — search by what you want to study. Typing or tapping a
// "field of study" chip filters the roster and (via the parent) lights up the
// matching campuses on the globe so prospects can see where a program is
// offered and fly straight in. Lives in the left rail on desktop and slides up
// as a drawer on mobile, mirroring the campus-list aside.

import { useEffect, useMemo, useRef } from "react";
import { type Campus } from "../lib/campus-data";
import { FIELDS, matchingPrograms } from "../lib/program-search";

export default function ProgramFinder({
  query,
  results,
  selectedId,
  onQuery,
  onSelect,
  onHover,
  onClose,
}: {
  query: string;
  /** Campuses matching the current query (empty query → empty list). */
  results: Campus[];
  selectedId: string | null;
  onQuery: (q: string) => void;
  onSelect: (campus: Campus) => void;
  onHover: (id: string | null) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const active = query.trim().length > 0;

  // Focus the search box when the panel opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Which quick-pick chip (if any) is currently driving the results.
  const activeField = useMemo(
    () => FIELDS.find((f) => f.label.toLowerCase() === query.trim().toLowerCase())?.label ?? null,
    [query],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-keiser-gold/30 bg-keiser-navy/90 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <SearchIcon />
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-keiser-gold">
            Find a program
          </h2>
        </div>
        <button
          onClick={onClose}
          aria-label="Close program finder"
          className="rounded-full bg-white/10 p-1.5 text-slate-200 transition hover:bg-white/20"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Search input */}
      <div className="px-4 pt-3">
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            type="search"
            placeholder="e.g. nursing, business, IT…"
            className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-8 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-keiser-gold/60 focus:bg-white/10"
          />
          {active && (
            <button
              onClick={() => onQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-1 text-slate-300 transition hover:bg-white/20"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      {/* Quick-pick fields of study */}
      <div className="px-4 pt-3">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Fields of study
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FIELDS.map((f) => {
            const on = activeField === f.label;
            return (
              <button
                key={f.label}
                onClick={() => onQuery(on ? "" : f.label)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  on
                    ? "bg-keiser-gold text-keiser-navy"
                    : "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      <div className="mt-3 flex items-center justify-between px-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-keiser-gold/80">
          {active
            ? `${results.length} ${results.length === 1 ? "campus" : "campuses"}`
            : "Search to begin"}
        </div>
      </div>

      <div className="scroll-slim mt-1.5 flex-1 space-y-1.5 overflow-y-auto px-4 pb-4">
        {!active && (
          <p className="px-1 py-6 text-center text-sm leading-relaxed text-slate-300/80">
            Type a subject or pick a field of study to see which Keiser campuses
            offer it — matches light up on the globe.
          </p>
        )}

        {active && results.length === 0 && (
          <p className="px-1 py-6 text-center text-sm leading-relaxed text-slate-300/80">
            No campuses match “{query.trim()}”. Try a broader term like
            “business” or “health”.
          </p>
        )}

        {active &&
          results.map((campus) => {
            const hits = matchingPrograms(campus, query);
            return (
              <button
                key={campus.id}
                onClick={() => onSelect(campus)}
                onMouseEnter={() => onHover(campus.id)}
                onMouseLeave={() => onHover(null)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                  selectedId === campus.id
                    ? "border-keiser-gold/70 bg-keiser-gold/15"
                    : "border-white/10 bg-white/5 hover:border-keiser-gold/40 hover:bg-white/10"
                }`}
              >
                <div className="text-sm font-semibold text-white">{campus.name}</div>
                <div className="text-[11px] text-slate-300/70">{campus.city}</div>
                {hits.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {hits.map((p) => (
                      <span
                        key={p}
                        className="rounded-full border border-keiser-gold/30 bg-keiser-gold/10 px-2 py-0.5 text-[10px] font-medium text-keiser-gold"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
