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
import { cloudSyncConfigured } from "@/lib/supabase";
import { ChatThread, NourieNotes } from "@/lib/types";

type CloudSyncPanelProps = {
  chats: ChatThread[];
  notes: NourieNotes;
  onPulled: (chats: ChatThread[], notes: NourieNotes) => void;
};

export function CloudSyncPanel({ chats, notes, onPulled }: CloudSyncPanelProps) {
  const [key, setKey] = useState(() => loadSyncKey() ?? "");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");

  if (!cloudSyncConfigured()) {
    return (
      <p className="px-3 py-2 text-[11px] leading-snug text-rapunzel-plum/70">
        Cloud sync needs NEXT_PUBLIC_SUPABASE_URL and
        NEXT_PUBLIC_SUPABASE_ANON_KEY on the server.
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
        throw new Error("Enter or create a sync code first.");
      }
      if (action === "pull") {
        const result = await pullCloudVault(syncKey);
        if (!result.found) {
          setFlash("No vault yet for this code. Save from this phone first.");
          return;
        }
        onPulled(result.chats, result.notes);
        saveSyncKey(syncKey);
        setFlash("Pulled chats and About Noorie from the cloud.");
        return;
      }
      await pushCloudVault(syncKey, chats, notes);
      saveSyncKey(syncKey);
      setFlash(
        action === "create"
          ? "New sync code ready. Save it, then open Sunshine on another device and paste it."
          : "Saved chats and About Noorie to the cloud."
      );
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 border-t border-border p-3">
      <p className="text-[10px] uppercase tracking-widest text-rapunzel-plum/70">
        Follow me
      </p>
      <p className="text-[11px] leading-snug text-rapunzel-ink/70">
        Same sync code on phone and laptop shares chats and About Noorie.
      </p>
      <Input
        value={key}
        onChange={(e) => remember(e.target.value)}
        placeholder="Sync code"
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
          Save to cloud
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          className="rounded-full border-rapunzel-gold"
          onClick={() => void run("pull")}
        >
          Load
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          className="rounded-full text-rapunzel-plum"
          onClick={() => void run("create")}
        >
          New code
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
              setFlash("Cleared local sync code.");
            }}
          >
            Forget
          </Button>
        ) : null}
      </div>
      {flash ? (
        <p className="text-[11px] leading-snug text-rapunzel-plum">{flash}</p>
      ) : null}
    </div>
  );
}
