"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SunLogo } from "@/components/sun-logo";
import { Button } from "@/components/ui/button";
import {
  loadActiveChatId,
  loadChats,
  loadGoodnotesConnected,
  loadNotes,
  saveGoodnotesConnected,
} from "@/lib/storage";
import { ChatThread, NourieNotes, notesToDocument } from "@/lib/types";

export default function StudySheetPage() {
  const [notes, setNotes] = useState<NourieNotes | null>(null);
  const [active, setActive] = useState<ChatThread | null>(null);
  const [goodnotes, setGoodnotes] = useState(false);
  const [connectMsg, setConnectMsg] = useState<string | null>(null);

  useEffect(() => {
    setNotes(loadNotes());
    setGoodnotes(loadGoodnotesConnected());
    const chats = loadChats();
    const id = loadActiveChatId();
    setActive(chats.find((c) => c.id === id) ?? chats[0] ?? null);
  }, []);

  const connectGoodNotes = async () => {
    setConnectMsg("Connecting to GoodNotes…");
    try {
      const res = await fetch("/api/goodnotes", { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setConnectMsg(
          data.error ||
            "GoodNotes could not finish in-app auth. Use Print / Save as PDF and import the sheet into GoodNotes."
        );
        saveGoodnotesConnected(false);
        setGoodnotes(false);
        return;
      }
      saveGoodnotesConnected(true);
      setGoodnotes(true);
      setConnectMsg(data.message || "Connected. You can send a new document.");
    } catch {
      setConnectMsg(
        "GoodNotes connection failed. Print this page to PDF and import it into GoodNotes."
      );
      saveGoodnotesConnected(false);
      setGoodnotes(false);
    }
  };

  const sendToGoodNotes = async () => {
    if (!notes) return;
    setConnectMsg("Sending to GoodNotes…");
    try {
      const res = await fetch("/api/goodnotes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Sunshine study sheet",
          markdown: buildMarkdown(notes, active),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      setConnectMsg(
        data.ok
          ? data.message || "Sent a new GoodNotes document."
          : data.error ||
              "Could not push to GoodNotes. Print this page instead."
      );
    } catch {
      setConnectMsg("Could not push to GoodNotes. Print this page instead.");
    }
  };

  if (!notes) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFF8EF]">
        <SunLogo className="size-12" />
      </div>
    );
  }

  const deck = [...(active?.messages ?? [])]
    .reverse()
    .find((m) => m.deck)?.deck;
  const diagram = [...(active?.messages ?? [])]
    .reverse()
    .find((m) => m.diagram)?.diagram;

  return (
    <div className="min-h-screen bg-[#FFF8EF] text-[#1B1028] print:bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#CDB4E8]/50 px-6 py-4 print:hidden">
        <div className="flex items-center gap-3">
          <SunLogo className="size-10" />
          <h1 className="text-xl font-semibold text-[#5C2D91]">Study sheet</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#CDB4E8]"
            onClick={() => window.print()}
          >
            Print / Save PDF
          </Button>
          <Button
            type="button"
            className="rounded-full bg-[#5C2D91] text-[#FFF8EF]"
            onClick={() => void connectGoodNotes()}
          >
            {goodnotes ? "Reconnect GoodNotes" : "Connect GoodNotes"}
          </Button>
          {goodnotes ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#F3B6C8]"
              onClick={() => void sendToGoodNotes()}
            >
              Send to GoodNotes
            </Button>
          ) : null}
          <Link
            href="/"
            className="rounded-full bg-[#F3B6C8] px-4 py-2 text-sm text-[#1B1028]"
          >
            Back to chat
          </Link>
        </div>
      </header>

      {connectMsg ? (
        <p className="px-6 pt-4 text-sm text-[#5C2D91] print:hidden">
          {connectMsg}
        </p>
      ) : null}

      <article className="mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div className="flex items-center gap-3">
          <SunLogo className="size-12" />
          <div>
            <h2 className="text-2xl font-semibold text-[#5C2D91]">Sunshine</h2>
            <p className="text-sm text-[#1B1028]/70">
              Study sheet for Nourie · Maria
            </p>
          </div>
        </div>

        <pre className="whitespace-pre-wrap rounded-3xl border border-[#CDB4E8] bg-white/80 p-5 text-sm leading-relaxed">
          {notesToDocument(notes)}
        </pre>

        {deck ? (
          <section className="rounded-3xl border border-[#F2C14E]/50 bg-white/80 p-5">
            <h3 className="mb-3 font-semibold text-[#5C2D91]">
              Slides · {deck.title}
            </h3>
            <ol className="list-decimal space-y-3 pl-5 text-sm">
              {deck.slides.map((s, i) => (
                <li key={`${s.title}-${i}`}>
                  <strong>{s.title}</strong>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {diagram ? (
          <section className="rounded-3xl border border-[#CDB4E8] bg-white/80 p-5">
            <h3 className="mb-2 font-semibold text-[#5C2D91]">
              Visual · {diagram.title}
            </h3>
            <pre className="whitespace-pre-wrap text-xs text-[#1B1028]/80">
              {diagram.mermaid}
            </pre>
          </section>
        ) : null}
      </article>
    </div>
  );
}

function buildMarkdown(notes: NourieNotes, active: ChatThread | null) {
  const parts = [notesToDocument(notes)];
  const deck = [...(active?.messages ?? [])].reverse().find((m) => m.deck)?.deck;
  const diagram = [...(active?.messages ?? [])]
    .reverse()
    .find((m) => m.diagram)?.diagram;
  if (deck) {
    parts.push(`\n# Slides: ${deck.title}`);
    deck.slides.forEach((s, i) => {
      parts.push(`\n## ${i + 1}. ${s.title}\n${s.body}`);
    });
  }
  if (diagram) {
    parts.push(`\n# Visual: ${diagram.title}\n\`\`\`\n${diagram.mermaid}\n\`\`\``);
  }
  return parts.join("\n");
}
