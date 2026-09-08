"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCheck, IconCalendarStar } from "@tabler/icons-react";
import { cn } from "@/lib/cn";
import { HolidayList } from "@/components/holiday-list";

/*
  "Dawn glass" onboarding checklist (§ master prompt). The real SUNROOOF skylight
  video fills the area (moving/3D, no person), a sky-blue→gold pastel wash sits
  over it, and frosted-glass cards float on top. One bold idea carries the page:
  a soft sun that breathes and warms as the learner completes their induction,
  with a light rail tying the three days into one journey and a calm finish
  moment. Ticks are a manual, per-learner checklist saved in localStorage — the
  items are day THEMES that don't map 1:1 to the loaded modules (see report).
*/

type Item = { id: string; label: string };
type Day = { key: string; badge: string; title: string; badgeBg: string; badgeText: string; items: Item[] };

const DAYS: Day[] = [
  {
    key: "d1",
    badge: "Day 1",
    title: "Welcome & induction",
    badgeBg: "#dbeafe",
    badgeText: "#1d4ed8",
    items: [
      { id: "d1-1", label: "Welcome kit and welcome video" },
      { id: "d1-2", label: "Experience Centre tour" },
      { id: "d1-3", label: "Vision video, founder intro and journey so far" },
      { id: "d1-4", label: "HR policies and attire policy" },
      { id: "d1-5", label: "Team introduction and joining forms" },
    ],
  },
  {
    key: "d2",
    badge: "Day 2",
    title: "Culture & the brand",
    badgeBg: "#fbeecb",
    badgeText: "#a06a12",
    items: [
      { id: "d2-1", label: "Articulation assessment" },
      { id: "d2-2", label: "Magppie introduction" },
      { id: "d2-3", label: "Culture code and code of conduct" },
      { id: "d2-4", label: "Hiring and leadership video" },
    ],
  },
  {
    key: "d3",
    badge: "Day 3",
    title: "Product & customer",
    badgeBg: "#ede9fe",
    badgeText: "#6d28d9",
    items: [
      { id: "d3-1", label: "SUNROOOF as a wellness lighting product" },
      { id: "d3-2", label: "The customer journey" },
      { id: "d3-3", label: "Testimonials and industry jargon" },
      { id: "d3-4", label: "Team buddy-up" },
    ],
  },
];

const ALL_IDS = DAYS.flatMap((d) => d.items.map((i) => i.id));
const STORAGE_KEY = "sunrooof-onboarding-checklist";
const BG_CLIPS = ["/brand/hero.mp4", "/brand/hero-2.mp4"];
const NAVY = "#1c2b4a";

function DrawnCheck({ reduced }: { reduced: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden>
      <path
        className={reduced ? undefined : "check-draw"}
        d="M5 13l4 4L19 7"
        fill="none"
        stroke="#2f7d55"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OnboardingChecklist() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [bgIndex, setBgIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [showHolidays, setShowHolidays] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setBgIndex((x) => (x + 1) % BG_CLIPS.length), 4000);
    return () => clearInterval(id);
  }, [reduced]);

  // Restore ticks (per learner, this browser).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ids = JSON.parse(raw) as string[];
        setDone(new Set(ids.filter((id) => ALL_IDS.includes(id))));
      }
    } catch {
      /* localStorage unavailable — start empty */
    }
  }, []);

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  const doneCount = useMemo(() => ALL_IDS.filter((id) => done.has(id)).length, [done]);
  const warmth = doneCount / ALL_IDS.length; // 0 → 1, drives the sun + rail
  const dayComplete = DAYS.map((d) => d.items.every((i) => done.has(i.id)));
  const allComplete = dayComplete.every(Boolean);
  const railPct = Math.round(warmth * 100);

  return (
    <div className="relative min-h-[calc(100vh-1px)] md:min-h-screen">
      {/* moving 3D SUNROOOF skylight video behind everything — no person */}
      <div className="absolute inset-0 overflow-hidden">
        {reduced ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/brand/hero-poster.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          BG_CLIPS.map((src, i) => (
            <video
              key={src}
              src={src}
              poster="/brand/hero-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out"
              style={{ opacity: i === bgIndex ? 1 : 0 }}
            />
          ))
        )}
        {/* sky-blue -> warm gold pastel wash, see-through */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(186,214,240,0.55) 0%, rgba(224,224,220,0.5) 45%, rgba(244,226,186,0.6) 100%)",
          }}
        />
      </div>

      {/* the soft sun — breathes, and grows brighter/warmer with progress */}
      <div
        aria-hidden
        className={cn("pointer-events-none absolute right-6 top-6 z-[1] md:right-20 md:top-10", !reduced && "sun-breathe")}
        style={{
          width: 150 + warmth * 120,
          height: 150 + warmth * 120,
          borderRadius: "9999px",
          background: `radial-gradient(circle, rgba(255,214,130,${0.5 + warmth * 0.42}) 0%, rgba(255,198,96,${0.24 + warmth * 0.34}) 34%, rgba(255,198,96,0) 70%)`,
          filter: `blur(${8 - warmth * 3}px)`,
          transition: "width 900ms ease, height 900ms ease, filter 900ms ease, background 900ms ease",
        }}
      />

      {/* content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8 md:py-12">
        {/* logo + holiday button + progress pill */}
        <div className="flex items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sunrooof-black.svg" alt="SUNROOOF" className="h-[18px] w-auto md:h-5" />
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowHolidays(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/50 px-3 py-1.5 text-sm font-medium backdrop-blur transition hover:bg-white/70"
              style={{ color: NAVY }}
            >
              <IconCalendarStar size={15} />
              Holiday list
            </button>
            <span
              className="rounded-full border border-white/70 bg-white/50 px-3.5 py-1.5 text-sm font-medium backdrop-blur"
              style={{ color: NAVY }}
            >
              {doneCount} of {ALL_IDS.length} done
            </span>
          </div>
        </div>

        {/* heading */}
        <header className="mt-8 md:mt-10">
          <h1
            className="font-[family-name:var(--font-sora)] text-3xl font-semibold tracking-tight md:text-4xl"
            style={{ color: NAVY }}
          >
            Onboarding
          </h1>
          <p className="mt-2 text-[15px]" style={{ color: "rgba(28,43,74,0.72)" }}>
            {allComplete ? "Your induction is complete — welcome to SUNROOOF. ☀" : "Your first three days, in order."}
          </p>
        </header>

        {/* three day cards, with the light rail behind them */}
        <div className="relative mt-8 md:mt-12">
          {/* horizontal rail (desktop) */}
          <div aria-hidden className="pointer-events-none absolute inset-x-[12%] top-[54px] z-0 hidden md:block">
            <div className="relative h-[3px] rounded-full" style={{ background: "rgba(28,43,74,0.14)" }}>
              <div
                className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-700"
                style={{ width: `${railPct}%`, background: "linear-gradient(90deg,#f2c95a,#e0a72c)" }}
              />
              <div
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700"
                style={{ left: `${railPct}%` }}
              >
                <div className="h-3.5 w-3.5 rounded-full" style={{ background: "#f0b83a", boxShadow: "0 0 12px 3px rgba(240,184,58,0.7)" }} />
              </div>
            </div>
          </div>
          {/* vertical rail (mobile) */}
          <div aria-hidden className="pointer-events-none absolute bottom-6 left-[18px] top-6 z-0 w-[3px] rounded-full md:hidden" style={{ background: "rgba(28,43,74,0.14)" }}>
            <div className="absolute left-0 top-0 w-full rounded-full transition-[height] duration-700" style={{ height: `${railPct}%`, background: "linear-gradient(180deg,#f2c95a,#e0a72c)" }} />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6">
            {DAYS.map((day, di) => {
              const complete = dayComplete[di];
              return (
                <section
                  key={day.key}
                  className="relative z-10 rounded-2xl border p-5 backdrop-blur-md transition-colors duration-500 md:p-6"
                  style={{
                    backgroundColor: complete ? "rgba(255,251,238,0.55)" : "rgba(255,255,255,0.45)",
                    borderColor: complete ? "rgba(224,167,44,0.55)" : "rgba(255,255,255,0.6)",
                    boxShadow: "0 8px 30px rgba(120,140,175,0.14)",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ backgroundColor: day.badgeBg, color: day.badgeText }}
                    >
                      {day.badge}
                    </span>
                    <h2 className="text-[15px] font-semibold" style={{ color: NAVY }}>
                      {day.title}
                    </h2>
                  </div>

                  <ul className="mt-4 flex flex-col gap-1">
                    {day.items.map((item) => {
                      const checked = done.has(item.id);
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => toggle(item.id)}
                            aria-pressed={checked}
                            className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-white/40"
                          >
                            <span
                              className={cn(
                                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                                checked ? "border-transparent" : "border-[#9fb0cc] bg-white/60",
                              )}
                              style={checked ? { backgroundColor: NAVY } : undefined}
                            >
                              {checked && <IconCheck size={14} stroke={3} className="text-white" />}
                            </span>
                            <span
                              className={cn("text-sm leading-snug transition", checked && "line-through")}
                              style={{ color: checked ? NAVY : "rgba(28,43,74,0.82)", fontWeight: checked ? 600 : 400 }}
                            >
                              {item.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {/* quiet finish moment for the day */}
                  {complete && (
                    <div
                      className="mt-4 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold"
                      style={{ color: "#2f7d55" }}
                    >
                      <DrawnCheck reduced={reduced} />
                      Day complete
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        {/* the one orchestrated finish */}
        {allComplete && (
          <p className="mt-8 text-center text-[15px] font-medium" style={{ color: "#a06a12" }}>
            All three days done — you&apos;re ready. Welcome aboard. ☀
          </p>
        )}
      </div>

      {showHolidays && <HolidayList onClose={() => setShowHolidays(false)} />}
    </div>
  );
}
