"use client";

import { useEffect } from "react";
import { IconX, IconStarFilled } from "@tabler/icons-react";

/*
  Holiday list — the single, easy-to-edit source of holidays (§ holiday list).

  ⚠️ HR NOTE: these dates were copied from the Magppie L&D portal as a starting
  point. SUNROOOF HR must confirm the real SUNROOOF holiday calendar — both the
  dates and the Fixed/Reserved split may differ — before this goes live.
  To edit later, just change this one array.
*/
export type Holiday = { name: string; date: string; day: string; type: "Fixed" | "Reserved" };

export const HOLIDAYS: Holiday[] = [
  { name: "New Year's Day", date: "January 1", day: "Thursday", type: "Fixed" },
  { name: "Republic Day", date: "January 26", day: "Monday", type: "Fixed" },
  { name: "Holi", date: "March 4", day: "Wednesday", type: "Fixed" },
  { name: "Eid", date: "March 21", day: "Saturday", type: "Reserved" },
  { name: "Independence Day", date: "August 15", day: "Saturday", type: "Fixed" },
  { name: "Raksha Bandhan", date: "August 28", day: "Friday", type: "Fixed" },
  { name: "Janmashtami", date: "September 4", day: "Friday", type: "Fixed" },
  { name: "Gandhi Jayanti", date: "October 2", day: "Friday", type: "Fixed" },
  { name: "Dussehra", date: "October 20", day: "", type: "Fixed" },
  { name: "Diwali", date: "November 8", day: "Sunday", type: "Fixed" },
  { name: "Govardhan Puja", date: "November 9", day: "Monday", type: "Fixed" },
  { name: "Vishwakarma Day", date: "November 10", day: "Tuesday", type: "Fixed" },
  { name: "Bhaiya Dooj", date: "November 11", day: "Wednesday", type: "Reserved" },
  { name: "Guru Nanak Jayanti", date: "November 21", day: "Tuesday", type: "Reserved" },
  { name: "Christmas", date: "December 25", day: "Friday", type: "Reserved" },
];

const NAVY = "#1c2b4a";

function TypePill({ type }: { type: Holiday["type"] }) {
  const fixed = type === "Fixed";
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={
        fixed
          ? { backgroundColor: "#dcf1e3", color: "#2f7d55" }
          : { backgroundColor: "#fbeecb", color: "#a06a12" }
      }
    >
      {type}
    </span>
  );
}

export function HolidayList({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Holiday list">
      <div className="absolute inset-0 bg-[#1c2b4a]/35 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 flex max-h-[86vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/90 backdrop-blur-md"
        style={{ boxShadow: "0 20px 60px rgba(28,43,74,0.22)" }}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div>
            <h2 className="font-[family-name:var(--font-sora)] text-xl font-semibold" style={{ color: NAVY }}>
              Holiday list
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm" style={{ color: "rgba(28,43,74,0.66)" }}>
              Holidays marked with a
              <IconStarFilled size={12} style={{ color: "#d9a326" }} />
              are reserved (floating) holidays.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-full p-1.5 text-grey transition hover:bg-black/5 hover:text-ink"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="mt-4 overflow-auto px-6 pb-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "rgba(28,43,74,0.5)" }}>
                <th className="pb-2 pr-3 font-medium">#</th>
                <th className="pb-2 pr-3 font-medium">Holiday</th>
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Day</th>
                <th className="pb-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {HOLIDAYS.map((h, i) => (
                <tr key={h.name} className="border-t border-black/5" style={{ color: NAVY }}>
                  <td className="py-3 pr-3 tabular-nums" style={{ color: "rgba(28,43,74,0.5)" }}>
                    {i + 1}
                  </td>
                  <td className="py-3 pr-3 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {h.name}
                      {h.type === "Reserved" && <IconStarFilled size={12} style={{ color: "#d9a326" }} />}
                    </span>
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap" style={{ color: "rgba(28,43,74,0.8)" }}>
                    {h.date}
                  </td>
                  <td className="py-3 pr-3" style={{ color: "rgba(28,43,74,0.8)" }}>
                    {h.day || "—"}
                  </td>
                  <td className="py-3">
                    <TypePill type={h.type} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
