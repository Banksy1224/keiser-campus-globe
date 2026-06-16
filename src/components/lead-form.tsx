// Admissions inquiry ("Request info") modal — turns the tour into a real lead
// funnel. Submits to Web3Forms (https://web3forms.com), which is built for
// static sites: the access key is public-safe and leads are emailed straight to
// the admissions inbox tied to the key. With no key configured it gracefully
// falls back to a prefilled mailto: link, so the form is never a dead end.

import { useMemo, useState } from "react";
import { CAMPUSES, type Campus } from "../lib/campus-data";

// Public Web3Forms access key (safe to ship in the client bundle).
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;
// Fallback inbox for the mailto: link when no Web3Forms key is set.
const FALLBACK_EMAIL =
  (import.meta.env.VITE_LEAD_EMAIL as string | undefined) ?? "admissions@keiseruniversity.edu";

// De-duplicated, sorted list of every program across the roster, for the
// "program of interest" dropdown.
const ALL_PROGRAMS = Array.from(new Set(CAMPUSES.flatMap((c) => c.programs))).sort();

type Status = "idle" | "submitting" | "success" | "error";

export default function LeadForm({
  campus,
  onClose,
}: {
  campus: Campus | null;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    program: "",
    campusId: campus?.id ?? "",
    message: "",
    consent: false,
    botcheck: "", // honeypot
  });

  const selectedCampusName = useMemo(() => {
    const c = CAMPUSES.find((x) => x.id === form.campusId);
    return c ? `${c.name} (${c.city})` : "No preference";
  }, [form.campusId]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const canSubmit =
    form.firstName.trim() && form.lastName.trim() && emailValid && form.consent;

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function mailtoFallback() {
    const body = [
      `Name: ${form.firstName} ${form.lastName}`,
      `Email: ${form.email}`,
      `Phone: ${form.phone || "—"}`,
      `Program of interest: ${form.program || "Not sure yet"}`,
      `Campus of interest: ${selectedCampusName}`,
      "",
      form.message,
    ].join("\n");
    window.location.href = `mailto:${FALLBACK_EMAIL}?subject=${encodeURIComponent(
      `Admissions inquiry — ${selectedCampusName}`,
    )}&body=${encodeURIComponent(body)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || form.botcheck) return;

    // No key configured → fall back to the user's email client.
    if (!WEB3FORMS_KEY) {
      mailtoFallback();
      setStatus("success");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `Admissions inquiry — ${selectedCampusName}`,
          from_name: "Keiser Campus Globe",
          name: `${form.firstName} ${form.lastName}`,
          email: form.email,
          phone: form.phone,
          program_of_interest: form.program || "Not sure yet",
          campus_of_interest: selectedCampusName,
          message: form.message,
          botcheck: form.botcheck,
        }),
      });
      const data = await res.json();
      setStatus(data.success ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md animate-fade-in overflow-hidden rounded-2xl border border-keiser-gold/30 bg-keiser-navy shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-gradient-to-br from-keiser-blue to-keiser-navy p-5">
          <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
              Request information
            </h2>
            <p className="mt-0.5 text-sm text-slate-300">
              {campus ? `About ${campus.name}` : "Tell us what you're looking for"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-black/40 p-1.5 text-slate-100 transition hover:bg-black/60"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {status === "success" ? (
          <div className="space-y-4 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-keiser-gold/20 text-keiser-gold">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">Thank you!</h3>
              <p className="mt-1 text-sm text-slate-300">
                Your request is on its way. A Keiser admissions counselor will reach out soon.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-keiser-gold py-3 text-sm font-bold text-keiser-navy transition hover:bg-keiser-flame"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="scroll-slim max-h-[70vh] space-y-3 overflow-y-auto p-5">
            {/* Honeypot (hidden from humans) */}
            <input
              type="checkbox"
              name="botcheck"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              checked={Boolean(form.botcheck)}
              onChange={(e) => set("botcheck", e.target.checked ? "1" : "")}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" required>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => set("firstName", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Last name" required>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => set("lastName", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Email" required>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="Phone (optional)">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputCls}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Program of interest">
                <select
                  value={form.program}
                  onChange={(e) => set("program", e.target.value)}
                  className={inputCls}
                >
                  <option value="">Not sure yet</option>
                  {ALL_PROGRAMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Campus of interest">
                <select
                  value={form.campusId}
                  onChange={(e) => set("campusId", e.target.value)}
                  className={inputCls}
                >
                  <option value="">No preference</option>
                  {CAMPUSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Message (optional)">
              <textarea
                rows={2}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
                className={`${inputCls} resize-none`}
                placeholder="Anything you'd like us to know?"
              />
            </Field>

            <label className="flex items-start gap-2 pt-1 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => set("consent", e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-keiser-gold"
              />
              <span>
                I agree to be contacted by Keiser University about programs and admissions.
              </span>
            </label>

            {status === "error" && (
              <p className="rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-200">
                Something went wrong sending your request. Please try again, or email{" "}
                <button type="button" onClick={mailtoFallback} className="underline">
                  {FALLBACK_EMAIL}
                </button>
                .
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || status === "submitting"}
              className="w-full rounded-xl bg-keiser-gold py-3 text-sm font-bold text-keiser-navy transition hover:bg-keiser-flame disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "submitting" ? "Sending…" : "Request information →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-keiser-gold/60 focus:bg-white/10";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
        {required && <span className="text-keiser-gold"> *</span>}
      </span>
      {children}
    </label>
  );
}
