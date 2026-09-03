"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconSparkles,
  IconArrowUp,
  IconMicrophone,
  IconPlayerStopFilled,
  IconVolume,
  IconLoader2,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());

export function Chat({
  starters = [],
  knowledgeLoaded = false,
}: {
  starters?: string[];
  knowledgeLoaded?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // voice in (press-to-talk)
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // voice out (on request)
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scroller = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  function scrollDown() {
    requestAnimationFrame(() =>
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }),
    );
  }

  async function sendText(text: string) {
    const clean = text.trim();
    if (!clean || busy) return;
    const next = [...messagesRef.current, { id: uid(), role: "user" as const, content: clean }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setNotice(null);
    scrollDown();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      if (res.status === 503) {
        setNotice("The assistant isn't switched on yet — an OpenRouter API key needs to be added on the server.");
        return;
      }
      if (!res.ok) {
        setNotice("Something went wrong reaching the assistant. Please try again.");
        return;
      }
      const data: { content?: string } = await res.json();
      setMessages((m) => [...m, { id: uid(), role: "assistant", content: data.content ?? "" }]);
      scrollDown();
    } catch {
      setNotice("Something went wrong reaching the assistant. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------- voice in: press to talk ---------------- */

  async function startRecording() {
    setNotice(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setNotice("This browser can't record audio. You can still type your question.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setNotice(
        "I couldn't use a microphone. Check that one is connected and that you've allowed microphone access, then try again — or just type your question.",
      );
      return;
    }
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setNotice("This browser can't record audio. You can still type your question.");
      return;
    }
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      const type = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      if (blob.size < 1200) {
        setNotice("That recording was too short to hear. Press the mic, speak, then press stop.");
        return;
      }
      void transcribeAndSend(blob);
    };
    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  async function transcribeAndSend(blob: Blob) {
    setTranscribing(true);
    setNotice(null);
    try {
      const ext = blob.type.includes("ogg")
        ? "ogg"
        : blob.type.includes("mp4")
          ? "mp4"
          : blob.type.includes("wav")
            ? "wav"
            : "webm";
      const form = new FormData();
      form.append("audio", blob, `speech.${ext}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data: { text?: string; message?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(data.message ?? "Couldn't transcribe that just now. Please try again, or type instead.");
        return;
      }
      const text = (data.text ?? "").trim();
      if (!text) {
        setNotice("I couldn't make out any speech there. Please try again.");
        return;
      }
      await sendText(text);
    } catch {
      setNotice("Couldn't transcribe that just now. Please try again, or type instead.");
    } finally {
      setTranscribing(false);
    }
  }

  /* ---------------- voice out: speak an answer (on request) ---------------- */

  async function speak(msg: Msg) {
    if (speakingId === msg.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setSpeakingId(null);
      return;
    }
    audioRef.current?.pause();
    setNotice(null);
    setSpeakingId(msg.id);
    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg.content }),
      });
      if (!res.ok) {
        const data: { message?: string } = await res.json().catch(() => ({}));
        setNotice(data.message ?? "Couldn't read that out just now.");
        setSpeakingId(null);
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeakingId(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setNotice("Couldn't play the audio on this device.");
        setSpeakingId(null);
        URL.revokeObjectURL(url);
      };
      await audio.play();
    } catch {
      setNotice("Couldn't play the audio just now.");
      setSpeakingId(null);
    }
  }

  const canSend = !busy && !transcribing;

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col">
      <div ref={scroller} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warm text-sun">
              <IconSparkles size={24} stroke={1.75} />
            </div>
            <p className="mt-4 max-w-sm text-[15px] text-grey">
              {knowledgeLoaded
                ? "Ask me anything about your first days — I answer from SUNROOOF's own onboarding material."
                : "Ask me about your first days. Company material isn't loaded yet, so answers are limited for now."}
            </p>
            {starters.length > 0 && (
              <div className="mt-6 flex max-w-lg flex-wrap justify-center gap-2">
                {starters.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendText(q)}
                    disabled={!canSend}
                    className="rounded-full border border-hairline bg-paper px-3.5 py-2 text-sm text-ink transition hover:border-grey/40 disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4 py-2">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("flex max-w-[85%] flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                      m.role === "user"
                        ? "bg-ink text-paper"
                        : "border border-hairline bg-paper text-ink",
                    )}
                  >
                    {m.content}
                  </div>
                  {m.role === "assistant" && m.content && (
                    <button
                      type="button"
                      onClick={() => speak(m)}
                      aria-label={speakingId === m.id ? "Stop reading aloud" : "Read this answer aloud"}
                      className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-grey transition hover:text-ink"
                    >
                      {speakingId === m.id ? (
                        <IconPlayerStopFilled size={14} className="text-sun" />
                      ) : (
                        <IconVolume size={15} />
                      )}
                      {speakingId === m.id ? "Stop" : "Listen"}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(busy || transcribing) && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-hairline bg-paper px-4 py-2.5 text-sm text-grey">
                  {transcribing ? "Listening…" : "Thinking…"}
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
          {/* press-to-talk mic */}
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={busy || transcribing}
            aria-label={recording ? "Stop recording" : "Ask by voice"}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-30",
              recording ? "animate-pulse border-sun bg-sun text-ink" : "border-hairline text-grey hover:text-ink",
            )}
          >
            {transcribing ? (
              <IconLoader2 size={18} className="animate-spin" />
            ) : recording ? (
              <IconPlayerStopFilled size={16} />
            ) : (
              <IconMicrophone size={18} stroke={1.75} />
            )}
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText(input);
              }
            }}
            rows={1}
            placeholder={recording ? "Listening… press stop when you're done" : "Ask the assistant…"}
            className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] text-ink outline-none placeholder:text-grey"
          />
          <button
            type="button"
            onClick={() => sendText(input)}
            disabled={!canSend || !input.trim()}
            aria-label="Send"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sun text-ink transition disabled:opacity-30"
          >
            <IconArrowUp size={18} stroke={2.5} />
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-grey">
          Answers come from SUNROOOF&apos;s onboarding material. It won&apos;t give assessment answers, and it says when
          something isn&apos;t in the material.
        </p>
      </div>
    </div>
  );
}
