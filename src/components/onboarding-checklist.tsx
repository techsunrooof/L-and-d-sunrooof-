"use client";

import { useEffect, useMemo, useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import { cn } from "@/lib/cn";

/*
  "Dawn glass" onboarding checklist (§ master prompt). The real SUNROOOF
  light-burst photo fills the area, a sky-blue→gold pastel wash sits over it, and
  frosted-glass cards float on top. Ticks are a manual, per-learner checklist,
  saved in localStorage (see report) — the checklist items are day THEMES that
  don't map 1:1 to the loaded modules, so they are plain manual ticks for now.
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
const NAVY = "#1c2b4a";

export function OnboardingChecklist() {
  const [done, setDone] = useState<Set<string>>(new Set());

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

  return (
    <div className="relative min-h-[calc(100vh-1px)] md:min-h-screen">
      {/* real SUNROOOF light-burst photo behind everything */}
      <div className="absolute inset-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/future-light.jpg" alt="" className="h-full w-full object-cover" />
        {/* sky-blue -> warm gold pastel wash, see-through */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(186,214,240,0.55) 0%, rgba(224,224,220,0.5) 45%, rgba(244,226,186,0.6) 100%)",
          }}
        />
      </div>

      {/* content */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8 md:py-12">
        {/* logo + progress pill */}
        <div className="flex items-center justify-between gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/sunrooof-black.svg" alt="SUNROOOF" className="h-[18px] w-auto md:h-5" />
          <span
            className="rounded-full border border-white/70 bg-white/50 px-3.5 py-1.5 text-sm font-medium backdrop-blur"
            style={{ color: NAVY }}
          >
            {doneCount} of {ALL_IDS.length} done
          </span>
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
            Your first three days, in order.
          </p>
        </header>

        {/* three day cards */}
        <div className="mt-8 grid grid-cols-1 gap-5 md:mt-10 md:grid-cols-3 md:gap-6">
          {DAYS.map((day) => (
            <section
              key={day.key}
              className="rounded-2xl border border-white/60 bg-white/45 p-5 backdrop-blur-md md:p-6"
              style={{ boxShadow: "0 8px 30px rgba(120,140,175,0.14)" }}
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
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
