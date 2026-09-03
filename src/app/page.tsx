import { getLearnerId } from "@/lib/learner";
import { getState } from "@/lib/state";
import { buildHomeSections } from "@/lib/view";
import { HomeBoard } from "@/components/home-board";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const learnerId = await getLearnerId();
  const state = getState(learnerId);
  const sections = buildHomeSections(state);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 md:py-20">
      <header className="max-w-2xl">
        <h1
          className="font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight md:text-[2.6rem] md:leading-[1.1]"
          style={{ color: "#5a3208", textShadow: "0 1px 10px rgba(255,255,255,0.75)" }}
        >
          Your onboarding
        </h1>
        <p className="mt-3 text-[15px] text-ink/70">
          Everyone does the first three days. Then your department track picks up from Day 4.
        </p>
      </header>

      <HomeBoard sections={sections} />
    </div>
  );
}
