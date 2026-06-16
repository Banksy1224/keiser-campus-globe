// Share sheet for the current view. Offers the native share sheet where it
// exists (mobile), a one-tap copy-link, and direct links to the channels
// admissions and prospects actually use. Rendered as a small centered modal so
// it works the same on desktop and mobile.

import { useEffect, useRef, useState } from "react";

export default function ShareMenu({
  url,
  title,
  text,
  onClose,
}: {
  url: string;
  title: string;
  text: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus the close button on open and support Esc to dismiss.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — fall back to selecting the text field.
      const input = document.getElementById("share-url") as HTMLInputElement | null;
      input?.select();
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, text, url });
    } catch {
      /* user dismissed the share sheet — nothing to do */
    }
  }

  const enc = encodeURIComponent;
  const channels: Array<{ label: string; href: string; icon: JSX.Element }> = [
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`,
      icon: <XIcon />,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
      icon: <FacebookIcon />,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
      icon: <LinkedInIcon />,
    },
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${enc(`${text} ${url}`)}`,
      icon: <WhatsAppIcon />,
    },
    {
      label: "Email",
      href: `mailto:?subject=${enc(title)}&body=${enc(`${text}\n\n${url}`)}`,
      icon: <EmailIcon />,
    },
  ];

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share"
    >
      <button aria-label="Close share menu" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-[min(92vw,24rem)] animate-fade-in overflow-hidden rounded-2xl border border-keiser-gold/30 bg-keiser-navy shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-keiser-gold">
            Share
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-white/10 p-1.5 text-slate-200 transition hover:bg-white/20"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm leading-relaxed text-slate-200/90">{text}</p>

          {/* Copy link */}
          <div className="flex items-stretch gap-2">
            <input
              id="share-url"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 truncate rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-slate-200 outline-none"
            />
            <button
              onClick={copyLink}
              className="shrink-0 rounded-lg bg-keiser-gold px-3 py-2 text-xs font-bold text-keiser-navy transition hover:bg-keiser-flame"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Native share (mobile) */}
          {canNativeShare && (
            <button
              onClick={nativeShare}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-keiser-gold/50 py-2.5 text-sm font-bold text-keiser-gold transition hover:bg-keiser-gold/15"
            >
              <ShareIcon /> Share via…
            </button>
          )}

          {/* Channels */}
          <div className="grid grid-cols-5 gap-2">
            {channels.map((c) => (
              <a
                key={c.label}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                title={`Share on ${c.label}`}
                aria-label={`Share on ${c.label}`}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2.5 text-slate-200 transition hover:border-keiser-gold/40 hover:bg-white/10"
              >
                {c.icon}
                <span className="text-[10px] font-medium">{c.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Icons (brand glyphs simplified to single paths) ----------------------
function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.9 2H22l-7.3 8.3L23 22h-6.8l-5.3-6.9L4.8 22H1.7l7.8-8.9L1 2h7l4.8 6.3L18.9 2Zm-1.2 18h1.9L7.4 4H5.4l12.3 16Z" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.2c-1.2 0-1.6.8-1.6 1.5V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5ZM3 9h4v12H3V9Zm6 0h3.8v1.6h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6V21h-4v-5.3c0-1.3 0-2.9-1.8-2.9s-2 1.4-2 2.8V21H9V9Z" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.5 15.2L2 22l4.9-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.6 1 1.3 1.7.9.8 1.6 1 1.9 1.2.2.1.4.1.6-.1l.7-.8c.2-.2.4-.2.6-.1l1.8.8c.2.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
    </svg>
  );
}
function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
