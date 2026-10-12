"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chatCopy, type ReplyLanguage } from "@/lib/language";
import {
  WATER_INTERVAL_MS,
  loadWaterLastAt,
  saveWaterLastAt,
} from "@/lib/storage";

type WaterReminderProps = {
  lang: ReplyLanguage;
  debugFast?: boolean;
  paused?: boolean;
  onShowingChange?: (showing: boolean) => void;
};

export function WaterReminder({
  lang,
  debugFast = false,
  paused = false,
  onShowingChange,
}: WaterReminderProps) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const copy = chatCopy(lang);

  const dismiss = useCallback(() => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
    }
    hideTimer.current = null;
    setVisible(false);
    onShowingChange?.(false);
  }, [onShowingChange]);

  const drunk = useCallback(() => {
    saveWaterLastAt(Date.now());
    dismiss();
  }, [dismiss]);

  const show = useCallback(() => {
    setVisible(true);
    onShowingChange?.(true);
    saveWaterLastAt(Date.now());
  }, [onShowingChange]);

  useEffect(
    () => () => {
      if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    },
    []
  );

  useEffect(() => {
    if (paused) return;

    const interval = debugFast ? 4000 : WATER_INTERVAL_MS;

    const maybeShow = () => {
      const last = loadWaterLastAt();
      const now = Date.now();
      if (last == null) {
        saveWaterLastAt(now);
        return;
      }
      if (now - last >= interval) {
        show();
      }
    };

    maybeShow();
    const onVisible = () => {
      if (document.visibilityState === "visible") maybeShow();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    const tick = window.setInterval(maybeShow, debugFast ? 1000 : 15_000);

    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [debugFast, paused, show]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-rapunzel-gold/60 bg-card/95 px-4 py-3 shadow-xl backdrop-blur">
        <span className="text-2xl" aria-hidden>
          💧
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium text-rapunzel-plum">
          {copy.waterPrompt}
        </p>
        <Button
          type="button"
          size="sm"
          onClick={drunk}
          className="shrink-0 rounded-full bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
        >
          {copy.waterDrunk}
        </Button>
        <button
          type="button"
          aria-label={copy.waterClose}
          onClick={dismiss}
          className="grid size-8 shrink-0 place-items-center rounded-full text-rapunzel-plum hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
