"use client";

import { useRef, useState } from "react";
import { IconSparkles, IconArrowUp } from "@tabler/icons-react";
import { cn } from "@/lib/cn";

type Msg = { role: "user" | "assistant"; content: string };

export function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setNotice(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (res.status === 503) {
        setNotice(
          "The assistant isn't switched on yet — an OpenRouter API key needs to be added on the server.",
        );
        return;
      }
      if (!res.ok) {
        setNotice("Something went wrong reaching the assistant. Please try again.");
        return;
      }
      const data: { content?: string } = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.content ?? "" }]);
      requestAnimationFrame(() =>
        scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }),
      );
    } catch {
      setNotice("Something went wrong reaching the assistant. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div ref={scroller} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warm text-sun">
              <IconSparkles size={24} stroke={1.75} />
            </div>
            <p className="mt-4 max-w-sm text-[15px] text-grey">
              Ask me anything about your first days. I&apos;m here to help you settle in.
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4 py-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                    m.role === "user"
                      ? "bg-ink text-paper"
                      : "border border-hairline bg-paper text-ink",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-hairline bg-paper px-4 py-2.5 text-sm text-grey">
                  Thinking…
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {notice && (
        <div className="mx-auto mb-3 max-w-2xl rounded-lg border border-hairline bg-warm/60 px-4 py-2.5 text-sm text-ink">
          {notice}
        </div>
      )}

      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-end gap-2 rounded-2xl border border-hairline bg-paper p-2">
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
            placeholder="Ask the assistant…"
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-ink outline-none placeholder:text-grey"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sun text-ink transition disabled:opacity-30"
          >
            <IconArrowUp size={18} stroke={2.5} />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-grey">
          General purpose for now — not connected to your training content yet.
        </p>
      </div>
    </div>
  );
}
