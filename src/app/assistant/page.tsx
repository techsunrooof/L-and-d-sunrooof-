import { Chat } from "@/components/chat";
import { getActiveKnowledge, starterQuestions } from "@/lib/knowledge";

export const metadata = { title: "AI assistant · SUNROOOF Learning" };
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  // Starters + the "what I know" line are derived from what is actually loaded.
  const entries = await getActiveKnowledge();
  const starters = starterQuestions(entries);
  const knowledgeLoaded = entries.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-10">
      <header className="mb-6">
        <h1 className="font-[family-name:var(--font-sora)] text-2xl font-semibold tracking-tight text-ink">
          AI assistant
        </h1>
        <p className="mt-1.5 text-[15px] text-ink/70">
          {knowledgeLoaded
            ? "Ask about your onboarding — the days and modules, the dress code, jargon, and the material you're going through. Answers come from SUNROOOF's own content."
            : "Ask about your onboarding. The company material isn't loaded yet, so answers are limited for now."}
        </p>
      </header>

      <Chat starters={starters} knowledgeLoaded={knowledgeLoaded} />
    </div>
  );
}
