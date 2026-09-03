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
        <div
          className="inline-block rounded-2xl px-6 py-5 md:px-8 md:py-6"
          style={{ backgroundColor: "#38240f", boxShadow: "0 10px 34px rgba(56,36,15,0.28)" }}
        >
          <h1
            className="font-[family-name:var(--font-sora)] text-3xl font-bold tracking-tight md:text-[2.6rem] md:leading-[1.05]"
            style={{ color: "#f3e7d2" }}
          >
            Your onboarding
          </h1>
          <p className="mt-2.5 max-w-xl text-[15px]" style={{ color: "rgba(243,231,210,0.8)" }}>
            Everyone does the first three days. Then your department track picks up from Day 4.
          </p>
        </div>
      </header>

      <HomeBoard sections={sections} />
    </div>
  );
}
