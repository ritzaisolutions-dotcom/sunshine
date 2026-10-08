"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BowField } from "@/components/bow-pattern";
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
      <div className="sunshine-shell relative flex min-h-screen items-center justify-center">
        <BowField />
        <SunLogo className="relative z-10 size-12" />
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
    <div className="sunshine-shell relative min-h-screen text-[#3D2463] print:bg-white">
      <BowField className="print:hidden" />
      <header className="sunshine-panel relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#D4B8E8] px-6 py-4 print:hidden">
        <div className="flex items-center gap-3">
          <SunLogo className="size-10" />
          <h1 className="text-xl font-semibold text-[#7B4B9A]">Study sheet</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-[#D4B8E8]"
            onClick={() => window.print()}
          >
            Print / Save PDF
          </Button>
          <Button
            type="button"
            className="rounded-full bg-[#9B6BC0] text-[#FFFDF8]"
            onClick={() => void connectGoodNotes()}
          >
            {goodnotes ? "Reconnect GoodNotes" : "Connect GoodNotes"}
          </Button>
          {goodnotes ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#F2C14E]"
              onClick={() => void sendToGoodNotes()}
            >
              Send to GoodNotes
            </Button>
          ) : null}
          <Link
            href="/"
            className="rounded-full bg-[#F2C14E] px-4 py-2 text-sm text-[#3D2463]"
          >
            Back to chat
          </Link>
        </div>
      </header>

      {connectMsg ? (
        <p className="relative z-10 px-6 pt-4 text-sm text-[#7B4B9A] print:hidden">
          {connectMsg}
        </p>
      ) : null}

      <article className="relative z-10 mx-auto max-w-2xl space-y-6 px-6 py-8">
        <div className="flex items-center gap-3">
          <SunLogo className="size-12" />
          <div>
            <h2 className="text-2xl font-semibold text-[#7B4B9A]">Sunshine</h2>
            <p className="text-sm text-[#3D2463]/70">
              Study sheet for Nourie · Maria
            </p>
          </div>
        </div>

        <pre className="whitespace-pre-wrap rounded-3xl border border-[#D4B8E8] bg-[#FAF4FF]/90 p-5 text-sm leading-relaxed">
          {notesToDocument(notes)}
        </pre>

        {deck ? (
          <section className="rounded-3xl border border-[#F2C14E]/60 bg-[#FAF4FF]/90 p-5">
            <h3 className="mb-3 font-semibold text-[#7B4B9A]">
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
          <section className="rounded-3xl border border-[#D4B8E8] bg-[#FAF4FF]/90 p-5">
            <h3 className="mb-2 font-semibold text-[#7B4B9A]">
              Visual · {diagram.title}
            </h3>
            <pre className="whitespace-pre-wrap text-xs text-[#3D2463]/80">
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
