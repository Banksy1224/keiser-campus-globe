import { useEffect, useRef, useState } from "react";
import { CAMPUSES } from "../lib/campus-data";

const ENDPOINT = (import.meta.env.VITE_AI_ENDPOINT as string | undefined)?.replace(/\/$/, "");

/** True when an AI backend endpoint is configured at build time. */
export const AI_ENABLED = Boolean(ENDPOINT);

type ChatMessage = { role: "user" | "assistant"; content: string };

// Compact campus roster sent with each request so the backend stays data-agnostic.
const ROSTER = CAMPUSES.map((c) => ({
  id: c.id,
  name: c.name,
  city: c.city,
  region: c.region,
  programs: c.programs,
}));

const GREETING =
  "Hi! I'm your Keiser admissions guide. Tell me what you're looking for — a program, a city, online vs. on-campus — and I'll fly you there. 🌎";

export default function AIConcierge({
  onFocus,
  onClose,
}: {
  onFocus: (campusIds: string[]) => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy || !ENDPOINT) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch(`${ENDPOINT}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next, campuses: ROSTER }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { reply: string; campusIds?: string[] };
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      if (data.campusIds?.length) onFocus(data.campusIds);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry — I couldn't reach the guide just now. Please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="absolute inset-x-3 bottom-3 z-40 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[22rem]">
      <div className="flex h-[26rem] max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-keiser-gold/30 bg-keiser-navy/95 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-keiser-blue to-keiser-navy px-4 py-3">
          <div className="flex items-center gap-2">
            <SparkleIcon />
            <span className="font-display text-sm font-bold uppercase tracking-wide text-keiser-gold">
              Ask the Guide
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-white/10 p-1.5 text-slate-200 transition hover:bg-white/20"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="scroll-slim flex-1 space-y-3 overflow-y-auto p-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-sm bg-keiser-gold text-keiser-navy"
                    : "rounded-bl-sm bg-white/10 text-slate-100"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2 text-sm text-slate-300">
                <span className="inline-flex gap-1">
                  <Dot /> <Dot /> <Dot />
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-2.5">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="e.g. nursing near the coast"
              className="max-h-24 flex-1 resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:border-keiser-gold/60 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={busy || !input.trim()}
              className="shrink-0 rounded-xl bg-keiser-gold px-3 py-2 text-sm font-bold text-keiser-navy transition hover:bg-keiser-flame disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#E8BC58">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z" />
      <path d="M19 14l.9 2.6L22 17.5l-2.1.9L19 21l-.9-2.6L16 17.5l2.1-.9z" />
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
function Dot() {
  return <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-keiser-gold/70" />;
}
