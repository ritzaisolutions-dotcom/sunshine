"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { SunLogo } from "@/components/sun-logo";
import {
  OVERLAY_VISIBLE_MS,
  WATER_INTERVAL_MS,
  loadWaterLastAt,
  saveWaterLastAt,
} from "@/lib/storage";

type WaterReminderProps = {
  debugFast?: boolean;
  paused?: boolean;
  onShowingChange?: (showing: boolean) => void;
};

export function WaterReminder({
  debugFast = false,
  paused = false,
  onShowingChange,
}: WaterReminderProps) {
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (hideTimer.current != null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setVisible(false);
    onShowingChange?.(false);
  }, [onShowingChange]);

  const show = useCallback(() => {
    setVisible(true);
    onShowingChange?.(true);
    saveWaterLastAt(Date.now());
    if (hideTimer.current != null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null;
      setVisible(false);
      onShowingChange?.(false);
    }, OVERLAY_VISIBLE_MS);
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
    <div className="sunshine-overlay-motion pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-primary/30 p-4 animate-in fade-in duration-300">
      <div className="relative flex max-w-sm flex-col items-center gap-3 rounded-3xl border border-accent bg-card px-8 py-6 text-center shadow-2xl">
        <button
          type="button"
          aria-label="Close water reminder"
          onClick={dismiss}
          className="pointer-events-auto absolute top-3 right-3 grid size-8 place-items-center rounded-full text-rapunzel-plum hover:bg-muted"
        >
          <X className="size-4" />
        </button>
        <SunLogo className="size-14" />
        <div className="text-4xl" aria-hidden>
          🧴
        </div>
        <p className="text-lg font-medium text-rapunzel-plum">
          Time for a sip of water
        </p>
      </div>
    </div>
  );
}
