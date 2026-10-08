"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  FileText,
  Menu,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  Send,
  Settings2,
  X,
} from "lucide-react";
import { BowField } from "@/components/bow-pattern";
import { DiagramView } from "@/components/diagram-view";
import { LoadingDots } from "@/components/loading-dots";
import { SlideDeckView } from "@/components/slide-deck";
import { SunLogo } from "@/components/sun-logo";
import { SurpriseOverlay } from "@/components/surprise-overlay";
import { WaterReminder } from "@/components/water-reminder";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import { Textarea } from "@/components/ui/textarea";
import { parseAssistantReply } from "@/lib/parse-reply";
import {
  addBacklogWishes,
  loadActiveChatId,
  loadChats,
  loadNotes,
  loadSettings,
  saveActiveChatId,
  saveChats,
  saveNotes,
} from "@/lib/storage";
import {
  AttachmentMeta,
  ChatMessage,
  ChatThread,
  EMPTY_NOTES,
  NourieNotes,
  notesToDocument,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type PendingFile = {
  name: string;
  mimeType: string;
  size: number;
  dataBase64: string;
};

function newId() {
  return crypto.randomUUID();
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function createThread(seed?: ChatMessage[]): ChatThread {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: "New chat",
    messages: seed ?? [],
    updatedAt: now,
    archived: false,
  };
}

const DEMO_SEED: ChatMessage[] = [
  {
    id: "demo-1",
    role: "assistant",
    content:
      "Hi Nourie — I’m Maria. What would you like to learn or work on today?",
    createdAt: new Date().toISOString(),
    status: "Ready",
  },
];

export function SunshineApp() {
  const [ready, setReady] = useState(false);
  const [chats, setChats] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [notes, setNotes] = useState<NourieNotes>(EMPTY_NOTES);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [listening, setListening] = useState(false);
  const [waterShowing, setWaterShowing] = useState(false);
  const [previewSurprise, setPreviewSurprise] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    const stored = loadChats();
    if (stored.length) {
      setChats(stored);
      setActiveId(loadActiveChatId() ?? stored[0]?.id ?? null);
    } else {
      const first = createThread(DEMO_SEED);
      setChats([first]);
      setActiveId(first.id);
      saveChats([first]);
      saveActiveChatId(first.id);
    }
    setNotes(loadNotes());
    setReady(true);

    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("previewSurprise");
    if (fromQuery) {
      setPreviewSurprise(fromQuery);
      window.history.replaceState({}, "", "/");
    }

    const onPreview = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setPreviewSurprise(detail);
    };
    window.addEventListener("sunshine:preview-surprise", onPreview);
    return () =>
      window.removeEventListener("sunshine:preview-surprise", onPreview);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveChats(chats);
  }, [chats, ready]);

  useEffect(() => {
    if (!ready) return;
    saveActiveChatId(activeId);
  }, [activeId, ready]);

  useEffect(() => {
    if (!ready) return;
    saveNotes(notes);
  }, [notes, ready]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeId, sending]);

  const active = useMemo(
    () => chats.find((c) => c.id === activeId) ?? null,
    [chats, activeId]
  );

  const activeChats = chats.filter((c) => !c.archived);
  const archivedChats = chats.filter((c) => c.archived);

  const updateActive = useCallback(
    (updater: (thread: ChatThread) => ChatThread) => {
      setChats((prev) =>
        prev.map((c) => (c.id === activeId ? updater(c) : c))
      );
    },
    [activeId]
  );

  const startNewChat = () => {
    const thread = createThread();
    setChats((prev) => [thread, ...prev]);
    setActiveId(thread.id);
    setSidebarOpen(false);
    setError(null);
  };

  const archiveChat = (id: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived: true } : c))
    );
  };

  const onPickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: PendingFile[] = [];
    for (const file of Array.from(files)) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((b) => {
        binary += String.fromCharCode(b);
      });
      next.push({
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataBase64: btoa(binary),
      });
    }
    setPendingFiles((prev) => [...prev, ...next]);
  };

  const toggleMic = () => {
    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event: {
      results: { [index: number]: { 0: { transcript: string } } };
    }) => {
      const text = event.results[0]?.[0]?.transcript ?? "";
      setDraft((d) => (d ? `${d} ${text}` : text));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const sendMessage = async () => {
    if (!active || sending) return;
    const text = draft.trim();
    if (!text && !pendingFiles.length) return;

    const settings = loadSettings();
    const now = new Date().toISOString();
    const attachmentMeta: AttachmentMeta[] = pendingFiles.map((f) => ({
      name: f.name,
      mimeType: f.mimeType,
      size: f.size,
    }));

    const userMessage: ChatMessage = {
      id: newId(),
      role: "user",
      content: text || "(attached files)",
      createdAt: now,
      attachments: attachmentMeta.length ? attachmentMeta : undefined,
    };

    const assistantId = newId();
    const title =
      active.messages.length === 0 || active.title === "New chat"
        ? (text || attachmentMeta[0]?.name || "New chat").slice(0, 48)
        : active.title;

    updateActive((thread) => ({
      ...thread,
      title,
      updatedAt: now,
      messages: [
        ...thread.messages,
        userMessage,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: now,
          status: "Writing…",
        },
      ],
    }));

    setDraft("");
    const filesForRequest = pendingFiles;
    setPendingFiles([]);
    setSending(true);
    setError(null);

    try {
      const history = [...(active.messages), userMessage].map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          systemPrompt: settings.systemPrompt,
          notesDocument: notesToDocument(notes),
          apiKey: settings.mistralApiKey || undefined,
          attachments: filesForRequest,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || `Request failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream.");

      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        const live = full;
        updateActive((thread) => ({
          ...thread,
          updatedAt: new Date().toISOString(),
          messages: thread.messages.map((m) =>
            m.id === assistantId
              ? { ...m, content: live, status: "Writing…" }
              : m
          ),
        }));
      }

      const parsed = parseAssistantReply(full);
      if (parsed.backlogItems?.length) {
        addBacklogWishes(parsed.backlogItems, "chat");
      }

      updateActive((thread) => ({
        ...thread,
        updatedAt: new Date().toISOString(),
        messages: thread.messages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: parsed.text || full,
                deck: parsed.deck,
                diagram: parsed.diagram,
                status: "Done",
              }
            : m
        ),
      }));

      // Continue memory about Nourie
      const transcript = [
        `Nourie: ${userMessage.content}`,
        `Maria: ${parsed.text || full}`,
      ].join("\n");
      void fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          recentTranscript: transcript,
          apiKey: settings.mistralApiKey || undefined,
        }),
      })
        .then(async (r) => {
          if (!r.ok) return;
          const data = (await r.json()) as { notes?: NourieNotes };
          if (data.notes) setNotes(data.notes);
        })
        .catch(() => undefined);

      // Safety net: catch upgrade wishes even if Maria forgot the backlog fence
      if (!parsed.backlogItems?.length) {
        void fetch("/api/backlog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recentTranscript: transcript,
            apiKey: settings.mistralApiKey || undefined,
          }),
        })
          .then(async (r) => {
            if (!r.ok) return;
            const data = (await r.json()) as { items?: string[] };
            if (data.items?.length) addBacklogWishes(data.items, "chat");
          })
          .catch(() => undefined);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      updateActive((thread) => ({
        ...thread,
        messages: thread.messages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: m.content || `I hit a snag: ${message}`,
                status: "Error",
              }
            : m
        ),
      }));
    } finally {
      setSending(false);
    }
  };

  if (!ready) {
    return (
      <div className="sunshine-shell relative flex min-h-screen items-center justify-center text-[#3D2463]">
        <BowField />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <SunLogo className="size-16" />
          <p>Opening Sunshine…</p>
        </div>
      </div>
    );
  }

  const Sidebar = (
    <aside className="relative flex h-full w-72 flex-col overflow-hidden border-r border-[#D4B8E8] bg-[#E8D5F5]/95 text-[#3D2463]">
      <BowField className="opacity-80" />
      <div className="relative z-10 flex items-center gap-3 px-4 py-5">
        <SunLogo className="size-10" />
        <div>
          <p className="text-lg font-semibold tracking-wide text-[#7B4B9A]">
            Sunshine
          </p>
          <p className="text-xs text-[#7B4B9A]/80">Maria & Nourie</p>
        </div>
      </div>
      <div className="relative z-10 px-3">
        <Button
          type="button"
          onClick={startNewChat}
          className="w-full rounded-2xl bg-[#F2C14E] text-[#3D2463] hover:bg-[#E8B84A]"
        >
          <Plus className="size-4" />
          New chat
        </Button>
      </div>
      <div className="relative z-10 mt-4 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        <p className="px-2 text-[10px] uppercase tracking-widest text-[#7B4B9A]/70">
          Chats
        </p>
        {activeChats.map((chat) => (
          <button
            key={chat.id}
            type="button"
            onClick={() => {
              setActiveId(chat.id);
              setSidebarOpen(false);
            }}
            className={cn(
              "group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm",
              chat.id === activeId
                ? "bg-[#9B6BC0] text-[#FFFDF8] shadow-sm"
                : "text-[#3D2463] hover:bg-white/50"
            )}
          >
            <span className="truncate">{chat.title}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                archiveChat(chat.id);
              }}
              className="opacity-0 group-hover:opacity-100"
              title="Put away"
            >
              <Archive className="size-3.5" />
            </span>
          </button>
        ))}
        {archivedChats.length > 0 && (
          <>
            <p className="mt-4 px-2 text-[10px] uppercase tracking-widest text-[#7B4B9A]/70">
              Put away
            </p>
            {archivedChats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => {
                  setActiveId(chat.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "w-full truncate rounded-xl px-3 py-2 text-left text-sm text-[#7B4B9A]/85 hover:bg-white/40",
                  chat.id === activeId && "bg-[#9B6BC0]/80 text-[#FFFDF8]"
                )}
              >
                {chat.title}
              </button>
            ))}
          </>
        )}
      </div>
      <div className="relative z-10 space-y-1 border-t border-[#D4B8E8] p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start text-[#3D2463] hover:bg-white/50"
          onClick={() => {
            setShowNotes((v) => !v);
            setSidebarOpen(false);
          }}
        >
          About Nourie
        </Button>
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#3D2463] hover:bg-white/50"
        >
          <Settings2 className="size-4 text-[#F2C14E]" />
          Admin
        </Link>
        <Link
          href="/study-sheet"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#3D2463] hover:bg-white/50"
        >
          <FileText className="size-4 text-[#F2C14E]" />
          Study sheet
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="sunshine-shell relative flex min-h-screen text-[#3D2463]">
      <BowField />
      <div className="relative z-10 hidden md:block">{Sidebar}</div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[#7B4B9A]/35"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full">{Sidebar}</div>
        </div>
      )}

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sunshine-panel flex items-center justify-between border-b border-[#D4B8E8] px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <SunLogo className="size-8 md:hidden" />
            <div>
              <p className="font-semibold text-[#7B4B9A]">
                {active?.title ?? "Sunshine"}
              </p>
              <p className="text-xs text-[#3D2463]/60">Chat with Maria</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-[#F2C14E] bg-[#F2C14E]/25 text-[#3D2463] hover:bg-[#F2C14E]/40"
            onClick={() => setShowNotes((v) => !v)}
          >
            {showNotes ? "Hide notes" : "About Nourie"}
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex-1 space-y-6 overflow-y-auto px-4 py-6 md:px-8">
              {!active?.messages.length && (
                <div className="mx-auto mt-16 max-w-md text-center">
                  <SunLogo className="mx-auto size-16" />
                  <h1 className="mt-4 text-2xl font-semibold text-[#7B4B9A]">
                    Sunshine
                  </h1>
                  <p className="mt-2 text-sm text-[#3D2463]/70">
                    Say hello to Maria. She is ready when you are.
                  </p>
                </div>
              )}

              {active?.messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <Message key={message.id} align={isUser ? "start" : "end"}>
                    <MessageContent>
                      {isUser ? (
                        <MessageHeader className="gap-1.5">
                          Nourie
                          <span
                            aria-hidden
                            className="size-1 shrink-0 rounded-full bg-[#F2C14E]"
                          />
                          <span className="tabular-nums">
                            {formatTime(message.createdAt)}
                          </span>
                        </MessageHeader>
                      ) : null}
                      <Bubble variant={isUser ? "muted" : "default"}>
                        <BubbleContent>
                          {message.content ||
                            (sending && !isUser ? <LoadingDots /> : "")}
                          {message.attachments?.length ? (
                            <ul className="mt-2 space-y-1 text-xs opacity-90">
                              {message.attachments.map((a) => (
                                <li key={a.name}>📎 {a.name}</li>
                              ))}
                            </ul>
                          ) : null}
                        </BubbleContent>
                      </Bubble>
                      {message.deck ? (
                        <SlideDeckView deck={message.deck} />
                      ) : null}
                      {message.diagram ? (
                        <DiagramView diagram={message.diagram} />
                      ) : null}
                      {!isUser && message.status ? (
                        <MessageFooter>{message.status}</MessageFooter>
                      ) : null}
                    </MessageContent>
                  </Message>
                );
              })}

              <div ref={bottomRef} />
            </div>

            {error ? (
              <p className="px-4 text-sm text-red-600 md:px-8">{error}</p>
            ) : null}

            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pb-2 md:px-8">
                {pendingFiles.map((f) => (
                  <span
                    key={f.name + f.size}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E8D5F5] px-3 py-1 text-xs"
                  >
                    {f.name}
                    <button
                      type="button"
                      onClick={() =>
                        setPendingFiles((prev) =>
                          prev.filter((p) => p.name !== f.name)
                        )
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="sunshine-panel border-t border-[#D4B8E8] p-4 md:px-8">
              <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-3xl border border-[#D4B8E8] bg-[#FAF4FF]/90 p-2 shadow-sm">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.txt,.md,.docx,image/*,.doc"
                  onChange={(e) => void onPickFiles(e.target.files)}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full text-[#7B4B9A]"
                  onClick={() => fileRef.current?.click()}
                  title="Attach"
                >
                  <Paperclip className="size-5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "rounded-full",
                    listening ? "text-[#C41E3A]" : "text-[#7B4B9A]"
                  )}
                  onClick={toggleMic}
                  title="Voice to text"
                >
                  {listening ? (
                    <MicOff className="size-5" />
                  ) : (
                    <Mic className="size-5" />
                  )}
                </Button>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message Maria…"
                  rows={1}
                  className="min-h-11 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  disabled={sending}
                  onClick={() => void sendMessage()}
                  className="rounded-full bg-[#F2C14E] text-[#3D2463] hover:bg-[#E8B84A]"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </section>

          {showNotes && (
            <aside className="sunshine-panel w-full max-w-sm border-l border-[#D4B8E8] p-4 md:block">
              <h2 className="mb-3 text-lg font-semibold text-[#7B4B9A]">
                About Nourie
              </h2>
              <NotesEditor notes={notes} onChange={setNotes} />
            </aside>
          )}
        </div>
      </main>

      <WaterReminder onShowingChange={setWaterShowing} />
      <SurpriseOverlay
        waterShowing={waterShowing}
        previewLine={previewSurprise}
        onPreviewConsumed={() => setPreviewSurprise(null)}
      />
    </div>
  );
}

function NotesEditor({
  notes,
  onChange,
}: {
  notes: NourieNotes;
  onChange: (n: NourieNotes) => void;
}) {
  const field = (
    key: keyof Omit<NourieNotes, "lastUpdated">,
    label: string
  ) => (
    <label className="mb-3 block text-xs font-medium text-[#7B4B9A]">
      {label}
      <Textarea
        value={notes[key]}
        onChange={(e) => onChange({ ...notes, [key]: e.target.value })}
        className="mt-1 min-h-16 rounded-xl border-[#D4B8E8] bg-[#FAF4FF]/90 text-sm"
      />
    </label>
  );

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-1">
      {notes.lastUpdated ? (
        <p className="mb-3 text-[11px] text-[#3D2463]/50">
          Last updated: {new Date(notes.lastUpdated).toLocaleString()}
        </p>
      ) : null}
      {field("whoSheIs", "Who she is")}
      {field("howSheLikesToLearn", "How she likes to learn")}
      {field("goals", "Goals")}
      {field("inProgress", "In progress")}
      {field("alreadyUnderstands", "Already understands")}
      {field("getsStuckOn", "Gets stuck on")}
      {field("littleThings", "Little things to remember")}
    </div>
  );
}
