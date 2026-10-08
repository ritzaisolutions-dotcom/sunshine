"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BacklogPanel } from "@/components/backlog-panel";
import { BowField } from "@/components/bow-pattern";
import { SunLogo } from "@/components/sun-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/prompts";
import {
  loadBacklog,
  loadNotes,
  loadSettings,
  saveNotes,
  saveSettings,
} from "@/lib/storage";
import { AdminSettings, BacklogItem, NourieNotes } from "@/lib/types";

export default function AdminPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [notes, setNotes] = useState<NourieNotes | null>(null);
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [surpriseDraft, setSurpriseDraft] = useState("");
  const [savedFlash, setSavedFlash] = useState("");

  useEffect(() => {
    setSettings(loadSettings());
    setNotes(loadNotes());
    setBacklog(loadBacklog());
  }, []);

  if (!settings || !notes) {
    return (
      <div className="sunshine-shell relative flex min-h-screen items-center justify-center">
        <BowField />
        <SunLogo className="relative z-10 size-12" />
      </div>
    );
  }

  const persistSettings = (next: AdminSettings) => {
    setSettings(next);
    saveSettings(next);
    setSavedFlash("Saved");
    window.setTimeout(() => setSavedFlash(""), 1500);
  };

  const persistNotes = (next: NourieNotes) => {
    setNotes(next);
    saveNotes(next);
    setSavedFlash("Memory saved");
    window.setTimeout(() => setSavedFlash(""), 1500);
  };

  return (
    <div className="sunshine-shell relative min-h-screen text-[#3D2463]">
      <BowField />
      <header className="sunshine-panel relative z-10 flex items-center justify-between border-b border-[#D4B8E8] px-6 py-4">
        <div className="flex items-center gap-3">
          <SunLogo className="size-10" />
          <div>
            <h1 className="text-xl font-semibold text-[#7B4B9A]">Admin</h1>
            <p className="text-xs text-[#3D2463]/60">Sunshine settings</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {savedFlash ? (
            <span className="text-xs text-[#7B4B9A]">{savedFlash}</span>
          ) : null}
          <Link
            href="/"
            className="rounded-full bg-[#F2C14E] px-4 py-2 text-sm text-[#3D2463]"
          >
            Back to chat
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-3xl gap-8 px-6 py-8">
        <BacklogPanel items={backlog} onChange={setBacklog} />

        <section className="sunshine-panel rounded-3xl border border-[#D4B8E8] p-5 shadow-sm">
          <Label className="text-[#7B4B9A]">System prompt</Label>
          <Textarea
            className="mt-2 min-h-48 rounded-2xl border-[#D4B8E8] bg-[#FAF4FF]/90"
            value={settings.systemPrompt}
            onChange={(e) =>
              setSettings({ ...settings, systemPrompt: e.target.value })
            }
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-full bg-[#9B6BC0] text-[#FFFDF8]"
              onClick={() => persistSettings(settings)}
            >
              Save prompt
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#F2C14E]"
              onClick={() =>
                persistSettings({
                  ...settings,
                  systemPrompt: DEFAULT_SYSTEM_PROMPT,
                })
              }
            >
              Reset to Maria default
            </Button>
          </div>
        </section>

        <section className="sunshine-panel rounded-3xl border border-[#D4B8E8] p-5 shadow-sm">
          <Label className="text-[#7B4B9A]">Mistral API key</Label>
          <Input
            type="password"
            className="mt-2 rounded-2xl border-[#D4B8E8] bg-[#FAF4FF]/90"
            value={settings.mistralApiKey}
            onChange={(e) =>
              setSettings({ ...settings, mistralApiKey: e.target.value })
            }
            placeholder="Leave blank to use server MISTRAL_API_KEY"
          />
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              className="rounded-full bg-[#9B6BC0] text-[#FFFDF8]"
              onClick={() => persistSettings(settings)}
            >
              Save key
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#F2C14E]"
              onClick={() =>
                persistSettings({ ...settings, mistralApiKey: "" })
              }
            >
              Clear (use server key)
            </Button>
          </div>
        </section>

        <section className="sunshine-panel rounded-3xl border border-[#D4B8E8] p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-[#7B4B9A]">
            Memory about Nourie
          </h2>
          {(
            [
              ["whoSheIs", "Who she is"],
              ["howSheLikesToLearn", "How she likes to learn"],
              ["goals", "Goals"],
              ["inProgress", "In progress"],
              ["alreadyUnderstands", "Already understands"],
              ["getsStuckOn", "Gets stuck on"],
              ["littleThings", "Little things to remember"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="mb-3 block text-xs font-medium">
              {label}
              <Textarea
                className="mt-1 min-h-16 rounded-xl border-[#D4B8E8] bg-[#FAF4FF]/90"
                value={notes[key]}
                onChange={(e) =>
                  setNotes({ ...notes, [key]: e.target.value })
                }
              />
            </label>
          ))}
          <Button
            type="button"
            className="rounded-full bg-[#9B6BC0] text-[#FFFDF8]"
            onClick={() =>
              persistNotes({
                ...notes,
                lastUpdated: new Date().toISOString(),
              })
            }
          >
            Save memory
          </Button>
        </section>

        <section className="sunshine-panel rounded-3xl border border-[#D4B8E8] p-5 shadow-sm">
          <h2 className="mb-2 font-semibold text-[#7B4B9A]">Surprise lines</h2>
          <p className="mb-3 text-xs text-[#3D2463]/60">
            One random line appears once each visit for three seconds. Water
            reminders stay every 30 minutes.
          </p>
          <ul className="mb-3 space-y-2">
            {settings.surpriseLines.map((line, i) => (
              <li
                key={`${line}-${i}`}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#E8D5F5]/70 px-3 py-2 text-sm"
              >
                <span>{line}</span>
                <button
                  type="button"
                  className="text-xs text-[#7B4B9A]"
                  onClick={() =>
                    persistSettings({
                      ...settings,
                      surpriseLines: settings.surpriseLines.filter(
                        (_, idx) => idx !== i
                      ),
                    })
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={surpriseDraft}
              onChange={(e) => setSurpriseDraft(e.target.value)}
              placeholder="Add a short surprise line"
              className="rounded-2xl border-[#D4B8E8] bg-[#FAF4FF]/90"
            />
            <Button
              type="button"
              className="rounded-full bg-[#F2C14E] text-[#3D2463]"
              onClick={() => {
                if (!surpriseDraft.trim()) return;
                persistSettings({
                  ...settings,
                  surpriseLines: [
                    ...settings.surpriseLines,
                    surpriseDraft.trim(),
                  ],
                });
                setSurpriseDraft("");
              }}
            >
              Add
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-[#9B6BC0]"
              onClick={() => {
                const lines = settings.surpriseLines.filter((l) => l.trim());
                const pick =
                  lines[Math.floor(Math.random() * Math.max(lines.length, 1))] ||
                  "You are doing beautifully, princess.";
                window.location.href = `/?previewSurprise=${encodeURIComponent(pick)}`;
              }}
            >
              Preview
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
