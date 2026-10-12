"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearSyncKey,
  createSyncKey,
  loadSyncKey,
  pullCloudVault,
  pushCloudVault,
  saveSyncKey,
} from "@/lib/cloud-sync";
import { chatCopy, type ReplyLanguage } from "@/lib/language";
import { cloudSyncConfigured } from "@/lib/supabase";
import { ChatThread, NourieNotes } from "@/lib/types";

type CloudSyncPanelProps = {
  chats: ChatThread[];
  notes: NourieNotes;
  lang: ReplyLanguage;
  onPulled: (chats: ChatThread[], notes: NourieNotes) => void;
};

export function CloudSyncPanel({
  chats,
  notes,
  lang,
  onPulled,
}: CloudSyncPanelProps) {
  const [key, setKey] = useState(() => loadSyncKey() ?? "");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const copy = chatCopy(lang).sync;

  if (!cloudSyncConfigured()) {
    return (
      <p className="px-3 py-2 text-[11px] leading-snug text-rapunzel-plum/70">
        {copy.missingEnv}
      </p>
    );
  }

  const remember = (value: string) => {
    setKey(value);
    if (value.trim().length >= 8) saveSyncKey(value.trim());
  };

  const run = async (action: "pull" | "push" | "create") => {
    setBusy(true);
    setFlash("");
    try {
      let syncKey = key.trim();
      if (action === "create") {
        syncKey = createSyncKey();
        remember(syncKey);
      }
      if (syncKey.length < 8) {
        throw new Error(copy.needKey);
      }
      if (action === "pull") {
        const result = await pullCloudVault(syncKey);
        if (!result.found) {
          setFlash(copy.noVault);
          return;
        }
        onPulled(result.chats, result.notes);
        saveSyncKey(syncKey);
        setFlash(copy.pulled);
        return;
      }
      await pushCloudVault(syncKey, chats, notes);
      saveSyncKey(syncKey);
      setFlash(action === "create" ? copy.created : copy.saved);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : copy.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 border-t border-border p-3">
      <p className="text-[10px] uppercase tracking-widest text-rapunzel-plum/70">
        {copy.title}
      </p>
      <p className="text-[11px] leading-snug text-rapunzel-ink/70">{copy.blurb}</p>
      <Input
        value={key}
        onChange={(e) => remember(e.target.value)}
        placeholder={copy.placeholder}
        className="rounded-xl border-border bg-card/90 text-xs"
      />
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          disabled={busy}
          className="rounded-full bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
          onClick={() => void run("push")}
        >
          {copy.save}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          className="rounded-full border-rapunzel-gold"
          onClick={() => void run("pull")}
        >
          {copy.load}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          className="rounded-full text-rapunzel-plum"
          onClick={() => void run("create")}
        >
          {copy.newCode}
        </Button>
        {key ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            className="rounded-full text-rapunzel-ink/50"
            onClick={() => {
              clearSyncKey();
              setKey("");
              setFlash(copy.cleared);
            }}
          >
            {copy.forget}
          </Button>
        ) : null}
      </div>
      {flash ? (
        <p className="text-[11px] leading-snug text-rapunzel-plum">{flash}</p>
      ) : null}
    </div>
  );
}
