"use client";

import { Cloud } from "lucide-react";
import { chatCopy, type ReplyLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";

export type CloudSyncStatus = "off" | "loading" | "saving" | "ok" | "error";

type CloudSyncPanelProps = {
  lang: ReplyLanguage;
  status: CloudSyncStatus;
};

export function CloudSyncPanel({ lang, status }: CloudSyncPanelProps) {
  const copy = chatCopy(lang).sync;

  if (status === "off") {
    return (
      <p className="px-3 py-2 text-[11px] leading-snug text-rapunzel-plum/70">
        {copy.missingEnv}
      </p>
    );
  }

  const label =
    status === "loading"
      ? copy.loading
      : status === "saving"
        ? copy.saving
        : status === "error"
          ? copy.failed
          : copy.autoOk;

  return (
    <div className="space-y-1 border-t border-border p-3">
      <p className="text-[10px] uppercase tracking-widest text-rapunzel-plum/70">
        {copy.title}
      </p>
      <p
        className={cn(
          "flex items-center gap-1.5 text-[11px] leading-snug",
          status === "error" ? "text-red-600" : "text-rapunzel-ink/70"
        )}
      >
        <Cloud className="size-3.5 shrink-0" aria-hidden />
        {label}
      </p>
      <p className="text-[11px] leading-snug text-rapunzel-ink/55">{copy.blurb}</p>
    </div>
  );
}
