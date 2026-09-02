import { Chat } from "@/components/chat";

export const metadata = { title: "AI assistant · SUNROOOF Learning" };

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-10">
      <h1 className="mb-6 font-[family-name:var(--font-sora)] text-2xl font-semibold tracking-tight text-ink">
        AI assistant
      </h1>
      <Chat />
    </div>
  );
}
