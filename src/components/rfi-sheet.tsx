// Two-step TCPA request-for-information sheet.
// Campus and modality are locked from the selected pin.
// Static-friendly: POST Web3Forms when VITE_WEB3FORMS_KEY is set (GitHub Pages),
// and ALSO POST /api/rfi when a backend is present (Railway, or VITE_AI_ENDPOINT).

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { APPLY_URL, campusPhones, telHref, type Campus } from "../lib/campus-data";
import {
  EDUCATION_LEVELS,
  EDUCATION_LEVEL_LABELS,
  OTHER_PROGRAM,
  RFI_SOURCE,
  RFI_UTM_SOURCE,
  defaultEducationLevel,
  defaultRfiLanguage,
  lockedModality,
  rfiContactStepSchema,
  rfiInquirySchema,
  rfiShowsLanguageToggle,
  upcomingStartTerms,
  type EducationLevel,
  type RfiLanguage,
  type RfiSubmitResponse,
} from "../../shared/rfi";

const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY as string | undefined;
const API_BASE = (import.meta.env.VITE_AI_ENDPOINT as string | undefined)?.replace(/\/$/, "");
const FALLBACK_EMAIL =
  (import.meta.env.VITE_LEAD_EMAIL as string | undefined) ?? "admissions@keiseruniversity.edu";

const COPY = {
  en: {
    title: "Request information",
    step1: "Your contact",
    step2: "Your program",
    firstName: "First name",
    lastName: "Last name",
    email: "Email",
    phone: "Phone",
    tcpa:
      "By providing my phone number, I agree that Keiser University and its admissions representatives may call or text me at this number, including with an autodialer or prerecorded/artificial voice, about educational programs. Message and data rates may apply. I can opt out anytime by replying STOP or asking to be placed on a do-not-call list. Consent is not a condition of enrollment.",
    tcpaShort: "I agree to be contacted as described above (required).",
    continue: "Continue",
    back: "Back",
    submit: "Submit request",
    submitting: "Sending…",
    program: "Program of interest",
    otherProgram: OTHER_PROGRAM,
    otherPlaceholder: "Program you’re considering",
    startTerm: "Start term",
    education: "Highest education level",
    campus: "Campus",
    modality: "Modality",
    locked: "From your selected pin",
    successTitle: "Request received",
    successBody: "Thank you. {campus} admissions will follow up using the contact you provided.",
    apply: "Apply now",
    call: "Call admissions",
    error: "We couldn’t send that. Check the highlighted fields and try again.",
    close: "Close",
  },
  es: {
    title: "Solicitar información",
    step1: "Tus datos",
    step2: "Tu programa",
    firstName: "Nombre",
    lastName: "Apellido",
    email: "Correo electrónico",
    phone: "Teléfono",
    tcpa:
      "Al proporcionar mi número de teléfono, acepto que Keiser University y sus representantes de admisiones puedan llamarme o enviarme mensajes de texto a este número, incluso mediante un marcador automático o voz pregrabada/artificial, sobre programas educativos. Pueden aplicar tarifas de mensajes y datos. Puedo cancelar en cualquier momento respondiendo STOP o pidiendo que me incluyan en una lista de no llamar. El consentimiento no es una condición de inscripción.",
    tcpaShort: "Acepto que me contacten según lo descrito (obligatorio).",
    continue: "Continuar",
    back: "Atrás",
    submit: "Enviar solicitud",
    submitting: "Enviando…",
    program: "Programa de interés",
    otherProgram: "No estoy seguro / otro",
    otherPlaceholder: "Programa que estás considerando",
    startTerm: "Periodo de inicio",
    education: "Nivel educativo más alto",
    campus: "Campus",
    modality: "Modalidad",
    locked: "Según el pin seleccionado",
    successTitle: "Solicitud recibida",
    successBody: "Gracias. Admisiones de {campus} te contactará con los datos que proporcionaste.",
    apply: "Aplicar ahora",
    call: "Llamar a admisiones",
    error: "No pudimos enviar eso. Revisa los campos marcados e inténtalo de nuevo.",
    close: "Cerrar",
  },
} as const;

const inputCls =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-keiser-gold/60 focus:bg-white/10";

function readUtms(): { utmMedium?: string; utmCampaign?: string } {
  if (typeof window === "undefined") return {};
  try {
    const params = new URLSearchParams(window.location.search || window.location.hash.split("?")[1] || "");
    return {
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
    };
  } catch {
    return {};
  }
}

function rfiEndpoints(): string[] {
  const urls = new Set<string>();
  urls.add("/api/rfi");
  if (API_BASE) urls.add(`${API_BASE}/api/rfi`);
  return [...urls];
}

async function postJson(url: string, body: unknown): Promise<boolean> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return false;
  const json = (await res.json().catch(() => null)) as RfiSubmitResponse | { success?: boolean } | null;
  if (!json) return false;
  if ("ok" in json && json.ok) return true;
  if ("success" in json && json.success) return true;
  return false;
}

async function submitRfi(payload: Record<string, unknown>, campus: Campus): Promise<boolean> {
  const results = await Promise.allSettled(rfiEndpoints().map((url) => postJson(url, payload)));
  const backendOk = results.some((r) => r.status === "fulfilled" && r.value);

  let web3Ok = false;
  if (WEB3FORMS_KEY) {
    try {
      web3Ok = await postJson("https://api.web3forms.com/submit", {
        access_key: WEB3FORMS_KEY,
        subject: `Campus tour RFI · ${campus.name} · ${payload.program}`,
        from_name: "Keiser Campus Globe",
        name: `${payload.firstName} ${payload.lastName}`,
        email: payload.email,
        phone: payload.phone,
        campus: campus.name,
        campus_id: campus.id,
        program: payload.program,
        start_term: payload.startTerm,
        education_level: payload.educationLevel,
        modality: payload.modality,
        language: payload.language,
        source: RFI_SOURCE,
        utm_source: RFI_UTM_SOURCE,
        tcpa_consent: "yes",
      });
    } catch {
      web3Ok = false;
    }
  }

  return backendOk || web3Ok;
}

export default function RfiSheet({
  campus,
  searchQuery,
  language,
  onClose,
}: {
  campus: Campus;
  searchQuery?: string;
  language?: RfiLanguage;
  onClose: () => void;
}) {
  const terms = useMemo(() => upcomingStartTerms(), []);
  const modality = lockedModality(campus);
  const showLangToggle = rfiShowsLanguageToggle(campus);

  const [lang, setLang] = useState<RfiLanguage>(
    () => language ?? defaultRfiLanguage(campus, searchQuery),
  );
  const [step, setStep] = useState<1 | 2>(1);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tcpaConsent, setTcpaConsent] = useState(false);
  const [hpWebsite, setHpWebsite] = useState("");
  const [program, setProgram] = useState("");
  const [otherProgram, setOtherProgram] = useState("");
  const [startTerm, setStartTerm] = useState(terms[0] ?? "");
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(() =>
    defaultEducationLevel(campus.id),
  );

  const t = COPY[lang];

  useEffect(() => {
    setLang(language ?? defaultRfiLanguage(campus, searchQuery));
    setStep(1);
    setSuccess(false);
    setSubmitting(false);
    setFormError(null);
    setFieldErrors({});
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setTcpaConsent(false);
    setHpWebsite("");
    setProgram("");
    setOtherProgram("");
    setStartTerm(upcomingStartTerms()[0] ?? "");
    setEducationLevel(defaultEducationLevel(campus.id));
  }, [campus.id, searchQuery, campus, language]);

  const programValue =
    program === OTHER_PROGRAM && otherProgram.trim()
      ? `${OTHER_PROGRAM}: ${otherProgram.trim()}`
      : program;

  const goStep2 = () => {
    const result = rfiContactStepSchema.safeParse({
      firstName,
      lastName,
      email,
      phone,
      tcpaConsent: tcpaConsent ? true : undefined,
    });
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      setFormError(t.error);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setStep(2);
  };

  const submit = async () => {
    const utms = readUtms();
    const payload = {
      firstName,
      lastName,
      email,
      phone,
      tcpaConsent: tcpaConsent ? true : undefined,
      campusId: campus.id,
      campusName: campus.name,
      program: programValue,
      startTerm,
      educationLevel,
      modality,
      language: lang,
      source: RFI_SOURCE,
      utmSource: RFI_UTM_SOURCE,
      utmMedium: utms.utmMedium,
      utmCampaign: utms.utmCampaign,
      campusIdUtm: campus.id,
      submittedAt: new Date().toISOString(),
      hpWebsite,
    };
    const result = rfiInquirySchema.safeParse(payload);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      setFormError(t.error);
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const ok = await submitRfi(result.data as unknown as Record<string, unknown>, campus);
      if (ok) {
        setSuccess(true);
        return;
      }
      if (!WEB3FORMS_KEY && !API_BASE) {
        const body = [
          `Name: ${firstName} ${lastName}`,
          `Email: ${email}`,
          `Phone: ${phone}`,
          `Campus: ${campus.name}`,
          `Program: ${programValue}`,
          `Start term: ${startTerm}`,
          `Education: ${educationLevel}`,
          `Modality: ${modality}`,
          `source=${RFI_SOURCE}`,
        ].join("\n");
        window.location.href = `mailto:${FALLBACK_EMAIL}?subject=${encodeURIComponent(
          `Campus tour RFI · ${campus.name}`,
        )}&body=${encodeURIComponent(body)}`;
        setSuccess(true);
        return;
      }
      setFormError(t.error);
    } catch {
      setFormError(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  const phones = campusPhones(campus);

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button aria-label={t.close} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md animate-fade-in overflow-hidden rounded-t-2xl border border-keiser-gold/30 bg-keiser-navy shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-gradient-to-br from-keiser-blue to-keiser-navy p-5">
          <div>
            <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
              {success ? t.successTitle : t.title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-300">{success ? t.successBody.replace("{campus}", campus.name) : t.locked}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {showLangToggle && !success && (
              <div className="flex rounded-lg bg-white/10 p-0.5 ring-1 ring-white/15">
                {(["en", "es"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${
                      lang === code ? "bg-keiser-gold text-keiser-navy" : "text-white/70"
                    }`}
                  >
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-full bg-black/40 p-1.5 text-slate-100 transition hover:bg-black/60"
              aria-label={t.close}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="scroll-slim max-h-[70vh] overflow-y-auto p-5">
          <div className="mb-3 flex flex-wrap gap-1.5">
            <LockChip label={t.campus} value={campus.name} />
            <LockChip label={t.modality} value={modality} />
          </div>

          {success ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-keiser-gold/20 text-keiser-gold">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-sm text-slate-300">{t.successBody.replace("{campus}", campus.name)}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={APPLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl bg-keiser-gold py-3 text-sm font-bold text-keiser-navy transition hover:bg-keiser-flame"
                >
                  {t.apply}
                </a>
                {phones[0] && (
                  <a
                    href={telHref(phones[0])}
                    className="rounded-xl border border-keiser-gold/50 px-4 py-3 text-sm font-bold text-keiser-gold transition hover:bg-keiser-gold/15"
                  >
                    {t.call}
                  </a>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-full rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10"
              >
                {t.close}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-white/45">
                <StepDot n={1} active={step === 1} done={step === 2} />
                {t.step1}
                <span className="text-white/20">/</span>
                <StepDot n={2} active={step === 2} done={false} />
                {t.step2}
              </div>

              {step === 1 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t.firstName} error={fieldErrors.firstName}>
                      <input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        autoComplete="given-name"
                        className={inputCls}
                      />
                    </Field>
                    <Field label={t.lastName} error={fieldErrors.lastName}>
                      <input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        autoComplete="family-name"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <Field label={t.email} error={fieldErrors.email}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t.phone} error={fieldErrors.phone}>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      className={inputCls}
                    />
                  </Field>
                  <label className="sr-only" aria-hidden="true">
                    Website
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={hpWebsite}
                      onChange={(e) => setHpWebsite(e.target.value)}
                      className="absolute -left-[9999px] h-0 w-0 opacity-0"
                    />
                  </label>
                  <label className="flex items-start gap-2.5 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                    <input
                      type="checkbox"
                      checked={tcpaConsent}
                      onChange={(e) => setTcpaConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-keiser-gold"
                    />
                    <span className="text-[11.5px] leading-relaxed text-slate-300">
                      {t.tcpa} <span className="font-semibold text-white">{t.tcpaShort}</span>
                    </span>
                  </label>
                  {fieldErrors.tcpaConsent && (
                    <p className="text-[11px] text-red-300">{fieldErrors.tcpaConsent}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Field label={t.program} error={fieldErrors.program}>
                    <select value={program} onChange={(e) => setProgram(e.target.value)} className={inputCls}>
                      <option value="">—</option>
                      {campus.programs.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                      <option value={OTHER_PROGRAM}>{t.otherProgram}</option>
                    </select>
                  </Field>
                  {program === OTHER_PROGRAM && (
                    <input
                      value={otherProgram}
                      onChange={(e) => setOtherProgram(e.target.value)}
                      placeholder={t.otherPlaceholder}
                      className={inputCls}
                    />
                  )}
                  <Field label={t.startTerm} error={fieldErrors.startTerm}>
                    <select value={startTerm} onChange={(e) => setStartTerm(e.target.value)} className={inputCls}>
                      {terms.map((term) => (
                        <option key={term} value={term}>
                          {term}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t.education} error={fieldErrors.educationLevel}>
                    <select
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value as EducationLevel)}
                      className={inputCls}
                    >
                      {EDUCATION_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {EDUCATION_LEVEL_LABELS[level][lang]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              {formError && <p className="mt-3 text-[12px] text-red-300">{formError}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                {step === 2 && (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-white/15 px-3 py-2.5 text-sm font-bold text-white hover:bg-white/10"
                  >
                    ← {t.back}
                  </button>
                )}
                {step === 1 ? (
                  <button
                    type="button"
                    onClick={goStep2}
                    className="flex-1 rounded-xl bg-keiser-gold py-3 text-sm font-bold text-keiser-navy transition hover:bg-keiser-flame"
                  >
                    {t.continue}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="flex-1 rounded-xl bg-keiser-gold py-3 text-sm font-bold text-keiser-navy transition hover:bg-keiser-flame disabled:opacity-60"
                  >
                    {submitting ? t.submitting : t.submit}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function LockChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-1.5 ring-1 ring-white/10">
      <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">{label}</div>
      <div className="text-[12px] font-semibold text-white/90">{value}</div>
    </div>
  );
}

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
        active || done ? "bg-keiser-gold text-keiser-navy" : "bg-white/10 text-white/50"
      }`}
    >
      {n}
    </span>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-red-300">{error}</span>}
    </label>
  );
}
