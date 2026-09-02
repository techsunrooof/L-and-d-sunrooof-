import { getLearnerId } from "@/lib/learner";
import { getState } from "@/lib/state";
import { DAYS } from "@/lib/content";
import { buildHomeDays } from "@/lib/view";
import { HomeBoard } from "@/components/home-board";

export const dynamic = "force-dynamic";

// Small-number words so the heading reads naturally as the programme grows.
// Nothing here hard-codes "three" (§0.6).
const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
];

export default async function HomePage() {
  const learnerId = await getLearnerId();
  const state = getState(learnerId);
  const days = buildHomeDays(state);

  const count = DAYS.length;
  const word = WORDS[count] ?? String(count);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:py-20">
      <header className="max-w-2xl">
        <h1 className="font-[family-name:var(--font-sora)] text-3xl font-semibold tracking-tight text-ink md:text-[2.6rem] md:leading-[1.1]">
          Your first {word} days
        </h1>
        <p className="mt-3 text-[15px] text-ink/70">
          Finish every video and its assessment to unlock the next day.
        </p>
      </header>

      <HomeBoard days={days} currentDay={state.currentDay} allComplete={state.allComplete} />
    </div>
  );
}
