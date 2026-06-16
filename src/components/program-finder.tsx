// Program finder panel — filter campuses by Keiser University's academic
// disciplines and degree types (sourced from the official all-programs catalog),
// or free-text search. Matches light up on the globe via the parent. Lives in
// the left rail on desktop and slides up as a drawer on mobile.

import { useEffect, useMemo, useRef } from "react";
import { type Campus } from "../lib/campus-data";
import {
  availableDisciplines,
  availableLevels,
  filterIsActive,
  matchingPrograms,
  type DegreeLevel,
  type ProgramFilter,
} from "../lib/program-search";

export default function ProgramFinder({
  filter,
  results,
  selectedId,
  onChange,
  onSelect,
  onHover,
  onClose,
}: {
  filter: ProgramFilter;
  /** Campuses matching the current filter (empty when no filter is active). */
  results: Campus[];
  selectedId: string | null;
  onChange: (patch: Partial<ProgramFilter>) => void;
  onSelect: (campus: Campus) => void;
  onHover: (id: string | null) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const active = filterIsActive(filter);
  const disciplines = useMemo(() => availableDisciplines(), []);
  const levels = useMemo(() => availableLevels(), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

      {/* Scrollable body: search + filters + results all scroll together so the
          long discipline list never traps the results below the fold. */}
      <div className="scroll-slim flex-1 overflow-y-auto px-4 pb-4 pt-3">
        {/* Search input */}
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            value={filter.text}
            onChange={(e) => onChange({ text: e.target.value })}
            type="search"
            placeholder="Search programs… e.g. nursing, IT"
            className="w-full rounded-xl border border-white/15 bg-white/5 py-2.5 pl-9 pr-8 text-sm text-white placeholder:text-slate-400 outline-none transition focus:border-keiser-gold/60 focus:bg-white/10"
          />
          {filter.text && (
            <button
              onClick={() => onChange({ text: "" })}
              aria-label="Clear search text"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-1 text-slate-300 transition hover:bg-white/20"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {/* Degree type */}
        <div className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Degree type
        </div>
        <div className="flex flex-wrap gap-1.5">
          {levels.map((l) => (
            <Chip
              key={l}
              on={filter.level === l}
              onClick={() => onChange({ level: filter.level === l ? null : l })}
            >
              {levelLabel(l)}
            </Chip>
          ))}
        </div>

        {/* Academic discipline */}
        <div className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Academic discipline
        </div>
        <div className="flex flex-wrap gap-1.5">
          {disciplines.map((d) => (
            <Chip
              key={d.label}
              on={filter.discipline === d.label}
              onClick={() => onChange({ discipline: filter.discipline === d.label ? null : d.label })}
            >
              {d.label} <span className="opacity-60">{d.count}</span>
            </Chip>
          ))}
        </div>

        {/* Results */}
        <div className="mb-1.5 mt-4 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-keiser-gold/80">
            {active
              ? `${results.length} ${results.length === 1 ? "campus" : "campuses"}`
              : "Pick a filter"}
          </div>
          {active && (
            <button
              onClick={() => onChange({ text: "", discipline: null, level: null })}
              className="text-[11px] font-semibold text-slate-300 underline-offset-2 hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {!active && (
            <p className="px-1 py-6 text-center text-sm leading-relaxed text-slate-300/80">
              Choose an academic discipline or degree type to see which Keiser
              campuses offer it — matches light up on the globe.
            </p>
          )}

          {active && results.length === 0 && (
            <p className="px-1 py-6 text-center text-sm leading-relaxed text-slate-300/80">
              No campuses match that combination. Try removing the degree type or
              picking a broader discipline.
            </p>
          )}

          {active &&
            results.map((campus) => {
              const hits = matchingPrograms(campus, filter);
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
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        on
          ? "bg-keiser-gold text-keiser-navy"
          : "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

function levelLabel(l: DegreeLevel): string {
  return l === "Associate" ? "Associate's" : l;
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
