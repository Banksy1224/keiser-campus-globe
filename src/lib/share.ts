// Shareable deep links. The app's whole state that's worth sharing — which
// campus is open, whether you're inside the 3D tour, and any active program
// search — round-trips through the URL query string, so a link like
// `?campus=tampa` or `?program=nursing` reopens exactly that view. Used both to
// read the initial URL on load and to keep the address bar in sync as the
// prospect explores (via history.replaceState, so it never spams back-history).

export interface ShareState {
  campusId?: string | null;
  program?: string | null;
  tour?: boolean;
}

/** Parse the current URL into a ShareState. */
export function readShareParams(): ShareState {
  const p = new URLSearchParams(window.location.search);
  const tour = p.get("tour");
  return {
    campusId: p.get("campus"),
    program: p.get("program"),
    tour: tour === "1" || tour === "3d",
  };
}

/** Build an absolute, shareable URL for a given state (base path preserved). */
export function shareUrlFor(state: ShareState): string {
  const base = window.location.origin + window.location.pathname;
  const p = new URLSearchParams();
  if (state.campusId) p.set("campus", state.campusId);
  if (state.program && state.program.trim()) p.set("program", state.program.trim());
  if (state.tour && state.campusId) p.set("tour", "1");
  const qs = p.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Keep the address bar in sync without adding history entries. */
export function syncShareUrl(state: ShareState): void {
  const next = shareUrlFor(state);
  if (next !== window.location.href) {
    window.history.replaceState(null, "", next);
  }
}
