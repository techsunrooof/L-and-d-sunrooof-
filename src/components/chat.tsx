"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconSparkles,
  IconArrowUp,
  IconMicrophone,
  IconPlayerStopFilled,
  IconVolume,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/cn";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random());

// Mic input runs on Groq Whisper (free) — on. The Listen (read-aloud) button is
// still on OpenRouter, which needs audio credits, so it stays off until those
// are added; flip it on then (the /api/speak route + voice.ts are ready).
const VOICE_INPUT_ENABLED = true;
const VOICE_OUTPUT_ENABLED = false;

const MIN_MS = 500; // discard accidental taps
const MAX_MS = 60_000; // auto-stop cap

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return undefined;
}

function extFor(mime: string): string {
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

function mmss(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

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
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  function releaseMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  async function startRecording() {
    setNotice(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setNotice("This browser can't record audio — please type your question.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setNotice("Microphone access is blocked. Allow it in your browser settings, then try again — or just type.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setNotice("No microphone found. Connect one, or type your question instead.");
      } else if (name === "NotReadableError" || name === "AbortError") {
        setNotice("Your microphone is in use by another app. Close it and try again — or type your question.");
      } else {
        setNotice("Couldn't start the microphone. Please type your question instead.");
      }
      return;
    }

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setNotice("This browser can't record audio — please type your question.");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];
    cancelledRef.current = false;
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const ms = Date.now() - startedAtRef.current;
      releaseMic();
      setRecording(false);
      setElapsed(0);
      if (cancelledRef.current) return; // thrown away on purpose
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      if (ms < MIN_MS || blob.size < 1500) {
        setNotice("That was too short to hear. Hold the mic, speak, then stop.");
        return;
      }
      void transcribeAndSend(blob, type);
    };

    recorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    setElapsed(0);
    tickRef.current = setInterval(() => {
      const ms = Date.now() - startedAtRef.current;
      setElapsed(ms);
      if (ms >= MAX_MS) recorder.stop(); // auto-stop at the cap
    }, 200);
  }

  function stopRecording() {
    cancelledRef.current = false;
    recorderRef.current?.stop();
  }

  function cancelRecording() {
    cancelledRef.current = true;
    recorderRef.current?.stop();
    setNotice(null);
  }

  async function transcribeAndSend(blob: Blob, mime: string) {
    setTranscribing(true);
    setNotice(null);
    try {
      const form = new FormData();
      form.append("audio", blob, `speech.${extFor(mime)}`);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data: { text?: string; message?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice(data.message ?? "Voice isn't available right now — please type your question instead.");
        return;
      }
      const text = (data.text ?? "").trim();
      if (!text) {
        setNotice("I couldn't make out any speech there. Please try again.");
        return;
      }
      await sendText(text); // never send an empty question
    } catch {
      setNotice("Voice isn't available right now — please type your question instead.");
    } finally {
      setTranscribing(false);
    }
  }

  useEffect(() => () => releaseMic(), []); // release the mic if the page unmounts mid-recording

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

  const canSend = !busy && !transcribing && !recording;

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
                <div className={cn("flex max-w-[80%] flex-col gap-1", m.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                      m.role === "user" ? "bg-ink text-paper" : "border border-hairline bg-paper text-ink",
                    )}
                  >
                    {m.content}
                  </div>
                  {VOICE_OUTPUT_ENABLED && m.role === "assistant" && m.content && (
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
                  {transcribing ? "Transcribing…" : "Thinking…"}
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
        {recording ? (
          /* ---- recording bar (live) ---- */
          <div className="flex items-center gap-3 rounded-2xl border border-sun bg-paper p-2 pl-4">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sun opacity-70" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-sun" />
            </span>
            <span className="flex-1 text-sm text-ink">
              Recording… <span className="font-[family-name:var(--font-mono)] text-grey">{mmss(elapsed)}</span>
            </span>
            <button
              type="button"
              onClick={cancelRecording}
              className="flex items-center gap-1 rounded-full border border-hairline px-3 py-1.5 text-sm text-grey transition hover:text-ink"
            >
              <IconX size={15} /> Cancel
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 rounded-full bg-sun px-3.5 py-1.5 text-sm font-medium text-ink transition"
            >
              <IconPlayerStopFilled size={14} /> Stop
            </button>
          </div>
        ) : (
          /* ---- normal input row ---- */
          <div className="flex items-end gap-2 rounded-2xl border border-hairline bg-paper p-2">
            {VOICE_INPUT_ENABLED && (
              <button
                type="button"
                onClick={startRecording}
                disabled={busy || transcribing}
                aria-label="Ask by voice"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-hairline text-grey transition hover:text-ink disabled:opacity-30"
              >
                {transcribing ? (
                  <IconLoader2 size={18} className="animate-spin" />
                ) : (
                  <IconMicrophone size={18} stroke={1.75} />
                )}
              </button>
            )}

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
              placeholder={transcribing ? "Transcribing your question…" : "Ask the assistant…"}
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
        )}
        <p className="mt-2 text-center text-xs text-grey">
          {VOICE_INPUT_ENABLED ? "Type or use the mic. " : ""}Answers come from SUNROOOF&apos;s onboarding material —
          it won&apos;t give assessment answers, and it says when something isn&apos;t in the material.
        </p>
      </div>
    </div>
  );
}
