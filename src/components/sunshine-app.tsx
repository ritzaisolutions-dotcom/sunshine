"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
} from "react";
import {
  Archive,
  ListTodo,
  Menu,
  Mic,
  MicOff,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Volume2,
  X,
} from "lucide-react";
import { BowField } from "@/components/bow-pattern";
import { DiagramView } from "@/components/diagram-view";
import { LoadingDots } from "@/components/loading-dots";
import { SlideDeckView } from "@/components/slide-deck";
import { SunLogo } from "@/components/sun-logo";
import { SurpriseOverlay } from "@/components/surprise-overlay";
import { AppInstall } from "@/components/app-install";
import { TodoReminder } from "@/components/todo-reminder";
import { WaterReminder } from "@/components/water-reminder";
import { WhatsNewOverlay } from "@/components/whats-new-overlay";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import {
  Message,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@/components/ui/message";
import { Textarea } from "@/components/ui/textarea";
import { pullCloudVault, pushCloudVault } from "@/lib/cloud-sync";
import {
  browserReplyLanguage,
  canReplaceChatTitle,
  chatActivityLabel,
  chatCopy,
  detectReplyLanguage,
  isOpeningGreeting,
  isNewChatTitle,
  newChatTitle,
  openingGreeting,
  provisionalChatTitle,
  resolveReplyLanguage,
  speechLocale,
  type NotesFieldKey,
  type ReplyLanguage,
} from "@/lib/language";
import { needsWebLookup } from "@/lib/model-pick";
import { parseAssistantReply } from "@/lib/parse-reply";
import {
  applyTodoActions,
  fetchTodos,
  formatTodosForPrompt,
  type SunshineTodo,
} from "@/lib/todos";
import {
  addBacklogWishes,
  loadActiveChatId,
  loadChats,
  loadNotes,
  loadSettings,
  loadVoiceLang,
  saveActiveChatId,
  saveChats,
  saveNotes,
  saveVoiceLang,
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

function createThread(
  seed?: ChatMessage[],
  lang: ReplyLanguage = browserReplyLanguage()
): ChatThread {
  const now = new Date().toISOString();
  return {
    id: newId(),
    title: newChatTitle(lang),
    messages: seed ?? [],
    updatedAt: now,
    archived: false,
  };
}

function userSamples(messages: ChatMessage[]): string[] {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content);
}

function withOpeningGreeting(
  messages: ChatMessage[],
  lang: ReplyLanguage
): ChatMessage[] {
  if (messages.length !== 1) return messages;
  const only = messages[0];
  if (!only || only.role !== "assistant" || !isOpeningGreeting(only.content)) {
    return messages;
  }
  const next = openingGreeting(lang);
  if (only.content === next) return messages;
  return [{ ...only, content: next }];
}

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
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<ReplyLanguage | null>(null);
  const [waterShowing, setWaterShowing] = useState(false);
  const [todoReminderShowing, setTodoReminderShowing] = useState(false);
  const [whatsNewShowing, setWhatsNewShowing] = useState(false);
  const [previewSurprise, setPreviewSurprise] = useState<string | null>(null);
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [todos, setTodos] = useState<SunshineTodo[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const skipNextPushRef = useRef(false);
  const cloudEnabledRef = useRef(false);

  useEffect(() => {
    const stored = loadChats();
    const bootLang = browserReplyLanguage();
    if (stored.length) {
      setChats(stored);
      setActiveId(loadActiveChatId() ?? stored[0]?.id ?? null);
    } else {
      const first = createThread(
        [
          {
            id: "demo-1",
            role: "assistant",
            content: openingGreeting(bootLang),
            createdAt: new Date().toISOString(),
            status: "Ready",
          },
        ],
        bootLang
      );
      setChats([first]);
      setActiveId(first.id);
      saveChats([first]);
      saveActiveChatId(first.id);
    }
    setNotes(loadNotes());
    setVoiceLang(loadVoiceLang());
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
    let cancelled = false;
    void (async () => {
      try {
        const result = await pullCloudVault();
        if (cancelled) return;
        if (!result.configured) {
          cloudEnabledRef.current = false;
          setCloudHydrated(true);
          return;
        }
        cloudEnabledRef.current = true;
        if (result.found) {
          skipNextPushRef.current = true;
          setNotes(result.notes);
          if (result.chats.length) {
            setChats(result.chats);
            const preferred = loadActiveChatId();
            const nextActive =
              (preferred &&
                result.chats.some((chat) => chat.id === preferred) &&
                preferred) ||
              result.chats[0]?.id ||
              null;
            setActiveId(nextActive);
          }
        }
        setCloudHydrated(true);
      } catch {
        if (cancelled) return;
        cloudEnabledRef.current = true;
        setCloudHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

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
    if (!ready || !cloudHydrated || !cloudEnabledRef.current) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void pushCloudVault(chats, notes).catch(() => {
        /* keep chatting; next edit retries */
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [chats, notes, ready, cloudHydrated]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, activeId, sending]);

  useEffect(() => {
    if (!ready) return;
    void fetchTodos()
      .then(setTodos)
      .catch(() => setTodos([]));
  }, [ready]);

  const active = useMemo(
    () => chats.find((c) => c.id === activeId) ?? null,
    [chats, activeId]
  );
  const activeLanguage = useMemo(
    () => resolveReplyLanguage(userSamples(active?.messages ?? [])),
    [active]
  );
  const copy = chatCopy(activeLanguage);

  const hasUserMessage = Boolean(
    active?.messages.some((m) => m.role === "user")
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
    const thread = createThread(undefined, activeLanguage);
    setChats((prev) => [thread, ...prev]);
    setActiveId(thread.id);
    setSidebarOpen(false);
    setError(null);
  };

  const pickVoiceLang = (lang: ReplyLanguage) => {
    setVoiceLang(lang);
    saveVoiceLang(lang);
  };

  const archiveChat = (id: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, archived: true } : c))
    );
  };

  const onPickFiles = async (files: FileList | File[] | null) => {
    const list = files ? Array.from(files) : [];
    if (!list.length) return;
    const next: PendingFile[] = [];
    for (const [index, file] of list.entries()) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach((b) => {
        binary += String.fromCharCode(b);
      });
      const fallbackExt = file.type.startsWith("image/")
        ? file.type.split("/")[1] || "png"
        : "bin";
      next.push({
        name: file.name?.trim() || `paste-${index + 1}.${fallbackExt}`,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataBase64: btoa(binary),
      });
    }
    setPendingFiles((prev) => [...prev, ...next]);
  };

  const onPasteIntoChat = (event: ClipboardEvent<HTMLElement>) => {
    const items = event.clipboardData?.items;
    if (!items?.length) return;

    const files: File[] = [];
    for (const item of Array.from(items)) {
      if (item.kind !== "file") continue;
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    if (!files.length) return;

    event.preventDefault();
    void onPickFiles(files);
  };

  const toggleMic = () => {
    const SpeechRecognition =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError(copy.voiceUnsupported);
      return;
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const listenLanguage =
      voiceLang ??
      resolveReplyLanguage([
        ...userSamples(active?.messages ?? []),
        draft,
      ]);
    const recognition = new SpeechRecognition();
    recognition.lang = speechLocale(listenLanguage);
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

  const speakMessage = (messageId: string, text: string) => {
    const spokenLanguage =
      detectReplyLanguage([text]) ??
      resolveReplyLanguage(userSamples(active?.messages ?? []));
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setError(chatCopy(spokenLanguage).speakUnsupported);
      return;
    }
    const clean = text.trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    if (speakingId === messageId) {
      setSpeakingId(null);
      return;
    }
    const locale = speechLocale(spokenLanguage);
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = locale;
    const voice = window.speechSynthesis
      .getVoices()
      .find((item) => item.lang.toLowerCase().startsWith(locale.slice(0, 2)));
    if (voice) utter.voice = voice;
    utter.rate = 0.95;
    utter.onend = () => setSpeakingId(null);
    utter.onerror = () => setSpeakingId(null);
    setSpeakingId(messageId);
    window.speechSynthesis.speak(utter);
  };

  const runAssistantTurn = async (opts: {
    history: ChatMessage[];
    assistantId: string;
    filesForRequest: PendingFile[];
    userContentForMemory: string;
  }) => {
    const settings = loadSettings();
    const { history, assistantId, filesForRequest, userContentForMemory } =
      opts;
    const replyLanguage = resolveReplyLanguage(userSamples(history));
    const turnCopy = chatCopy(replyLanguage);

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          systemPrompt: settings.systemPrompt,
          notesDocument: notesToDocument(notes),
          todosDocument: formatTodosForPrompt(todos),
          apiKey: settings.mistralApiKey || undefined,
          attachments: filesForRequest,
          lang: replyLanguage,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || `${turnCopy.snag} (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error(turnCopy.streamFailed);

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
              ? { ...m, content: live, status: chatActivityLabel(replyLanguage, "writing") }
              : m
          ),
        }));
      }

      const parsed = parseAssistantReply(full);
      if (parsed.backlogItems?.length) {
        addBacklogWishes(parsed.backlogItems, "chat");
      }
      if (parsed.todoActions?.length) {
        try {
          const nextTodos = await applyTodoActions(parsed.todoActions);
          setTodos(nextTodos);
        } catch {
          /* keep chatting if todo sync fails */
        }
      }

      let replyText = parsed.text || full;
      let sources: Array<{ title: string; url: string }> | undefined;
      const lookupQuery =
        parsed.searchQuery ||
        (needsWebLookup(userContentForMemory)
          ? userContentForMemory.slice(0, 200)
          : undefined);

      if (lookupQuery) {
        updateActive((thread) => ({
          ...thread,
          messages: thread.messages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: replyText || turnCopy.looking,
                  deck: parsed.deck,
                  diagram: parsed.diagram,
                  status: chatActivityLabel(replyLanguage, "looking"),
                }
              : m
          ),
        }));
        const searchRes = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: lookupQuery,
            apiKey: settings.mistralApiKey || undefined,
            lang: replyLanguage,
          }),
        });
        const searchData = (await searchRes.json().catch(() => null)) as {
          text?: string;
          sources?: Array<{ title: string; url: string }>;
          error?: string;
        } | null;
        if (!searchRes.ok || !searchData?.text) {
          throw new Error(searchData?.error || turnCopy.searchFailed);
        }
        const warm = parsed.text?.trim();
        replyText = warm
          ? `${warm}\n\n${searchData.text.trim()}`
          : searchData.text.trim();
        sources = searchData.sources?.length ? searchData.sources : undefined;
      }

      let drawn: { src: string; alt: string } | undefined;
      if (parsed.imagePrompt) {
        updateActive((thread) => ({
          ...thread,
          messages: thread.messages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: replyText,
                  deck: parsed.deck,
                  diagram: parsed.diagram,
                  sources,
                  status: chatActivityLabel(replyLanguage, "drawing"),
                }
              : m
          ),
        }));
        const imageRes = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: parsed.imagePrompt,
            apiKey: settings.mistralApiKey || undefined,
          }),
        });
        const imageData = (await imageRes.json().catch(() => null)) as {
          src?: string;
          alt?: string;
          error?: string;
        } | null;
        if (!imageRes.ok || !imageData?.src) {
          throw new Error(imageData?.error || turnCopy.pictureFailed);
        }
        drawn = { src: imageData.src, alt: imageData.alt || parsed.imagePrompt };
      }

      updateActive((thread) => {
        const provisional = provisionalChatTitle(
          userContentForMemory,
          replyLanguage
        );
        const nextTitle =
          parsed.title && canReplaceChatTitle(thread.title, provisional)
            ? parsed.title
            : thread.title;
        return {
          ...thread,
          title: nextTitle,
          updatedAt: new Date().toISOString(),
          messages: thread.messages.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: replyText,
                  deck: parsed.deck,
                  diagram: parsed.diagram,
                  image: drawn,
                  sources,
                  status: "Done",
                }
              : m
          ),
        };
      });

      const transcript = [
        `Noorie: ${userContentForMemory}`,
        `Maria Sunshine: ${replyText}`,
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
        err instanceof Error ? err.message : turnCopy.somethingWrong;
      setError(message);
      updateActive((thread) => ({
        ...thread,
        messages: thread.messages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: m.content || `${turnCopy.snag}: ${message}`,
                status: chatActivityLabel(replyLanguage, "error"),
              }
            : m
        ),
      }));
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (overrideText?: string) => {
    if (!active || sending) return;
    const fromDraft = overrideText === undefined;
    const text = (overrideText ?? draft).trim();
    const filesForRequest = fromDraft ? pendingFiles : [];
    if (!text && !filesForRequest.length) return;

    const now = new Date().toISOString();
    const attachmentMeta: AttachmentMeta[] = filesForRequest.map((f) => ({
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
    const replyLanguage = resolveReplyLanguage([
      ...userSamples(active.messages),
      text,
    ]);
    const provisional = provisionalChatTitle(
      text,
      replyLanguage,
      attachmentMeta[0]?.name
    );
    const title =
      isNewChatTitle(active.title) || active.messages.every((m) => m.role !== "user")
        ? provisional
        : active.title;

    const baseMessages = withOpeningGreeting(active.messages, replyLanguage);
    const history = [...baseMessages, userMessage];

    updateActive((thread) => ({
      ...thread,
      title,
      updatedAt: now,
      messages: [
        ...baseMessages,
        userMessage,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: now,
          status: chatActivityLabel(replyLanguage, "writing"),
        },
      ],
    }));

    if (fromDraft) {
      setDraft("");
      setPendingFiles([]);
    }

    await runAssistantTurn({
      history,
      assistantId,
      filesForRequest,
      userContentForMemory: userMessage.content,
    });
  };

  const regenerateLast = async () => {
    if (!active || sending) return;
    const messages = active.messages;
    let lastAssistantIndex = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "assistant") {
        lastAssistantIndex = i;
        break;
      }
    }
    if (lastAssistantIndex < 0) return;

    let lastUserIndex = -1;
    for (let i = lastAssistantIndex - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex < 0) return;

    const userMessage = messages[lastUserIndex]!;
    const assistantId = newId();
    const now = new Date().toISOString();
    const history = messages.slice(0, lastAssistantIndex);
    const replyLanguage = resolveReplyLanguage(userSamples(history));

    updateActive((thread) => ({
      ...thread,
      updatedAt: now,
      messages: [
        ...thread.messages.slice(0, lastAssistantIndex),
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: now,
          status: chatActivityLabel(replyLanguage, "writing"),
        },
      ],
    }));

    await runAssistantTurn({
      history,
      assistantId,
      filesForRequest: [],
      userContentForMemory: userMessage.content,
    });
  };

  const editLastUser = () => {
    if (!active || sending) return;
    const messages = active.messages;
    let lastUserIndex = -1;
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "user") {
        lastUserIndex = i;
        break;
      }
    }
    if (lastUserIndex < 0) return;
    const userMessage = messages[lastUserIndex]!;
    setDraft(userMessage.content === "(attached files)" ? "" : userMessage.content);
    setPendingFiles([]);
    setError(null);
    updateActive((thread) => ({
      ...thread,
      updatedAt: new Date().toISOString(),
      messages: thread.messages.slice(0, lastUserIndex),
    }));
  };

  if (!ready) {
    return (
      <div className="sunshine-shell relative flex min-h-screen items-center justify-center text-rapunzel-ink">
        <BowField />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <SunLogo className="size-16" />
          <p>Opening Sunshine…</p>
        </div>
      </div>
    );
  }

  const Sidebar = (
    <aside className="relative flex h-full w-72 flex-col overflow-hidden border-r border-input bg-rapunzel-soft text-rapunzel-ink">
      <div className="relative z-10 flex items-center gap-3 px-5 py-6">
        <SunLogo className="size-11" />
        <div>
          <p className="font-[family-name:var(--font-fraunces)] text-2xl font-medium tracking-tight text-rapunzel-plum">
            Sunshine
          </p>
          <p className="text-xs text-rapunzel-plum/75">{copy.tagline}</p>
        </div>
      </div>
      <div className="relative z-10 px-3">
        <Button
          type="button"
          onClick={startNewChat}
          className="w-full rounded-2xl bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
        >
          <Plus className="size-4" />
          {copy.newChat}
        </Button>
      </div>
      <div className="relative z-10 mt-4 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        <p className="px-2 text-[10px] uppercase tracking-widest text-rapunzel-plum/70">
          {copy.chats}
        </p>
        {activeChats.map((chat) => (
          <div
            key={chat.id}
            className={cn(
              "flex items-center gap-1 rounded-xl pr-1",
              chat.id === activeId ? "bg-rapunzel-gold/70" : "hover:bg-white"
            )}
          >
            <button
              type="button"
              onClick={() => {
                setActiveId(chat.id);
                setSidebarOpen(false);
              }}
              className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm text-rapunzel-ink"
            >
              {chat.title}
            </button>
            <button
              type="button"
              aria-label={copy.putAwayAria(chat.title)}
              onClick={() => archiveChat(chat.id)}
              className="grid size-8 place-items-center rounded-lg text-rapunzel-plum hover:bg-white/70"
            >
              <Archive className="size-3.5" />
            </button>
          </div>
        ))}
        {archivedChats.length > 0 && (
          <>
            <p className="mt-4 px-2 text-[10px] uppercase tracking-widest text-rapunzel-plum/70">
              {copy.putAway}
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
                  "w-full truncate rounded-xl px-3 py-2 text-left text-sm text-rapunzel-plum/85 hover:bg-white/40",
                  chat.id === activeId && "bg-rapunzel-gold/50 text-rapunzel-ink"
                )}
              >
                {chat.title}
              </button>
            ))}
          </>
        )}
      </div>
      <div className="relative z-10 space-y-1 border-t border-border p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start text-rapunzel-ink hover:bg-white/50"
          onClick={() => {
            setShowNotes((v) => !v);
            setSidebarOpen(false);
          }}
        >
          {copy.aboutNoorie}
        </Button>
        <Link
          href="/todos"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-rapunzel-ink hover:bg-white/50"
          onClick={() => setSidebarOpen(false)}
        >
          <ListTodo className="size-4 text-rapunzel-gold" />
          {copy.todosNav}
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-rapunzel-ink hover:bg-white/50"
          onClick={() => setSidebarOpen(false)}
        >
          <Settings className="size-4 text-rapunzel-gold" />
          {copy.settingsNav}
        </Link>
      </div>
    </aside>
  );

  return (
    <div className="sunshine-shell relative flex min-h-screen text-rapunzel-ink">
      <BowField />
      <div className="relative z-10 hidden md:block">{Sidebar}</div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-rapunzel-plum/35"
            aria-label={copy.closeMenu}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full">{Sidebar}</div>
        </div>
      )}

      <main className="relative z-10 m-3 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-card/72 shadow-[0_20px_60px_-36px_color-mix(in_srgb,var(--primary)_55%,transparent)]">
        <header className="flex items-center justify-between border-b border-input px-4 py-3">
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
              <p className="font-[family-name:var(--font-fraunces)] text-lg font-medium text-rapunzel-plum">
                {active?.title ?? "Sunshine"}
              </p>
              <p className="text-xs text-rapunzel-ink/60">{copy.header}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-rapunzel-gold bg-rapunzel-gold/25 text-rapunzel-ink hover:bg-rapunzel-gold/40"
            onClick={() => setShowNotes((v) => !v)}
          >
            {showNotes ? copy.hideNotes : copy.aboutNoorie}
          </Button>
        </header>

        <div className="flex min-h-0 flex-1">
          <section className="flex min-w-0 flex-1 flex-col">
            <div
              className={cn(
                "mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 overflow-y-auto px-4 py-8 md:px-6",
                !hasUserMessage && "justify-center"
              )}
            >
              {!hasUserMessage ? (
                <div className="mx-auto max-w-md text-center">
                  <SunLogo className="mx-auto size-16" />
                  <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-4xl font-medium text-rapunzel-plum">
                    Sunshine
                  </h1>
                  <p className="mt-3 text-base leading-relaxed text-rapunzel-ink">
                    {copy.greeting}
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {copy.ideas.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => setDraft(idea)}
                        className="rounded-full border border-input bg-white/70 px-3 py-1.5 text-xs text-rapunzel-plum hover:bg-rapunzel-gold/40"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {active?.messages.map((message, index) => {
                    const isUser = message.role === "user";
                    const lastUserIndex = active.messages.reduce(
                      (acc, m, i) => (m.role === "user" ? i : acc),
                      -1
                    );
                    const lastAssistantIndex = active.messages.reduce(
                      (acc, m, i) => (m.role === "assistant" ? i : acc),
                      -1
                    );
                    const isLastUser = isUser && index === lastUserIndex;
                    const isLastAssistant =
                      !isUser && index === lastAssistantIndex;
                    const spokenCopy = chatCopy(
                      detectReplyLanguage([message.content]) ?? activeLanguage
                    );
                    return (
                      <Message key={message.id} align={isUser ? "start" : "end"}>
                        <MessageContent>
                          {isUser ? (
                            <MessageHeader className="gap-1.5">
                              Noorie
                              <span
                                aria-hidden
                                className="size-1 shrink-0 rounded-full bg-rapunzel-gold"
                              />
                              <span className="tabular-nums">
                                {formatTime(message.createdAt)}
                              </span>
                            </MessageHeader>
                          ) : (
                            <MessageHeader className="gap-1.5 self-end">
                              <SunLogo className="size-4" />
                              Maria Sunshine
                              <span className="tabular-nums font-normal">
                                {formatTime(message.createdAt)}
                              </span>
                            </MessageHeader>
                          )}
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
                          {message.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={message.image.src}
                              alt={message.image.alt}
                              className="mt-2 max-w-md rounded-2xl border border-border"
                            />
                          ) : null}
                          {message.deck ? (
                            <SlideDeckView deck={message.deck} />
                          ) : null}
                          {message.diagram ? (
                            <DiagramView diagram={message.diagram} />
                          ) : null}
                          {message.sources?.length ? (
                            <p className="mt-1.5 max-w-md text-[11px] leading-snug text-rapunzel-plum/75">
                              Sources:{" "}
                              {message.sources.map((source, i) => (
                                <span key={source.url}>
                                  {i > 0 ? " · " : null}
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="underline decoration-rapunzel-gold/60 underline-offset-2 hover:text-rapunzel-plum"
                                  >
                                    {source.title}
                                  </a>
                                </span>
                              ))}
                            </p>
                          ) : null}
                          {isLastUser && !sending ? (
                            <MessageFooter className="gap-2">
                              <button
                                type="button"
                                onClick={editLastUser}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-rapunzel-plum hover:bg-white/70"
                              >
                                <Pencil className="size-3" />
                                {copy.edit}
                              </button>
                            </MessageFooter>
                          ) : null}
                          {isLastAssistant &&
                          message.content &&
                          !sending ? (
                            <MessageFooter className="flex-col items-start gap-2">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void regenerateLast()}
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-rapunzel-plum hover:bg-white/70"
                                >
                                  <RefreshCw className="size-3" />
                                  {copy.tryAgain}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    speakMessage(message.id, message.content)
                                  }
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-rapunzel-plum hover:bg-white/70"
                                >
                                  <Volume2 className="size-3" />
                                  {speakingId === message.id
                                    ? spokenCopy.stop
                                    : spokenCopy.speak}
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {copy.followUps.map((followUp) => (
                                  <button
                                    key={followUp.kind}
                                    type="button"
                                    onClick={() =>
                                      void sendMessage(followUp.prompt)
                                    }
                                    className="rounded-full border border-rapunzel-gold/60 bg-rapunzel-gold/25 px-2.5 py-1 text-[11px] text-rapunzel-ink hover:bg-rapunzel-gold/45"
                                  >
                                    {followUp.label}
                                  </button>
                                ))}
                              </div>
                            </MessageFooter>
                          ) : null}
                          {!isUser &&
                          message.status &&
                          message.status !== "Ready" &&
                          message.status !== "Done" ? (
                            <MessageFooter>{message.status}</MessageFooter>
                          ) : null}
                        </MessageContent>
                      </Message>
                    );
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {error ? (
              <p className="px-4 text-sm text-red-600 md:px-8">{error}</p>
            ) : null}

            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pb-2 md:px-8">
                {pendingFiles.map((f) => (
                  <span
                    key={f.name + f.size}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"
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

            <div className="px-4 pb-5 pt-2 md:px-6">
              <div
                className="mx-auto flex w-full max-w-2xl items-end gap-2 rounded-[1.75rem] border border-input bg-card p-2 shadow-[0_12px_40px_-24px_color-mix(in_srgb,var(--primary)_45%,transparent)]"
                onPaste={onPasteIntoChat}
              >
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
                  className="rounded-full text-rapunzel-plum"
                  onClick={() => fileRef.current?.click()}
                  title={copy.attach}
                >
                  <Paperclip className="size-5" />
                </Button>
                <div className="flex items-center gap-0.5 rounded-full border border-border/70 bg-white/50 p-0.5">
                  {(["de", "en"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => pickVoiceLang(code)}
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        (voiceLang ?? activeLanguage) === code
                          ? "bg-rapunzel-gold text-rapunzel-ink"
                          : "text-rapunzel-plum/70 hover:bg-white"
                      )}
                      title={copy.voiceTitle}
                    >
                      {code}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "rounded-full",
                    listening ? "text-destructive" : "text-rapunzel-plum"
                  )}
                  onClick={toggleMic}
                  title={copy.voiceTitle}
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
                  placeholder={copy.placeholder}
                  rows={1}
                  className="min-h-11 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                  onPaste={onPasteIntoChat}
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
                  aria-label="Send message"
                  disabled={sending}
                  onClick={() => void sendMessage()}
                  className="rounded-full bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>
          </section>

          {showNotes && (
            <aside className="sunshine-panel w-full max-w-sm border-l border-border p-4 md:block">
              <h2 className="mb-3 text-lg font-semibold text-rapunzel-plum">
                {copy.aboutNoorie}
              </h2>
              <NotesEditor
                notes={notes}
                lang={activeLanguage}
                onChange={setNotes}
              />
            </aside>
          )}
        </div>
      </main>

      <WhatsNewOverlay onShowingChange={setWhatsNewShowing} />
      <AppInstall lang={activeLanguage} />
      <WaterReminder
        lang={activeLanguage}
        paused={whatsNewShowing || todoReminderShowing}
        onShowingChange={setWaterShowing}
      />
      <TodoReminder
        lang={activeLanguage}
        paused={whatsNewShowing || waterShowing}
        onShowingChange={setTodoReminderShowing}
      />
      <SurpriseOverlay
        waterShowing={waterShowing || whatsNewShowing || todoReminderShowing}
        previewLine={previewSurprise}
        onPreviewConsumed={() => setPreviewSurprise(null)}
      />
    </div>
  );
}

function NotesEditor({
  notes,
  lang,
  onChange,
}: {
  notes: NourieNotes;
  lang: ReplyLanguage;
  onChange: (n: NourieNotes) => void;
}) {
  const copy = chatCopy(lang);
  const field = (key: NotesFieldKey) => (
    <label className="mb-3 block text-xs font-medium text-rapunzel-plum">
      {copy.notesLabels[key]}
      <Textarea
        value={notes[key]}
        onChange={(e) => onChange({ ...notes, [key]: e.target.value })}
        className="mt-1 min-h-16 rounded-xl border-border bg-card/90 text-sm"
      />
    </label>
  );

  return (
    <div className="max-h-[70vh] overflow-y-auto pr-1">
      {notes.lastUpdated ? (
        <p className="mb-3 text-[11px] text-rapunzel-ink/50">
          {copy.lastUpdated(new Date(notes.lastUpdated).toLocaleString())}
        </p>
      ) : null}
      {field("whoSheIs")}
      {field("howSheLikesToLearn")}
      {field("goals")}
      {field("inProgress")}
      {field("alreadyUnderstands")}
      {field("getsStuckOn")}
      {field("littleThings")}
    </div>
  );
}
