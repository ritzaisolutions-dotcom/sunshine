"use client";

import { useCallback, useEffect, useState } from "react";
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

  const show = useCallback(() => {
    setVisible(true);
    onShowingChange?.(true);
    saveWaterLastAt(Date.now());
    window.setTimeout(() => {
      setVisible(false);
      onShowingChange?.(false);
    }, OVERLAY_VISIBLE_MS);
  }, [onShowingChange]);

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
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#9B6BC0]/30 p-4 animate-in fade-in duration-300">
      <div className="flex max-w-sm flex-col items-center gap-3 rounded-3xl border border-[#F2C14E] bg-[#FAF4FF] px-8 py-6 text-center shadow-2xl">
        <SunLogo className="size-14" />
        <div className="text-4xl" aria-hidden>
          🧴
        </div>
        <p className="text-lg font-medium text-[#7B4B9A]">
          Time for a sip of water
        </p>
      </div>
    </div>
  );
}
