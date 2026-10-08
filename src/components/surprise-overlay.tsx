"use client";

import { useCallback, useEffect, useState } from "react";
import { SunLogo } from "@/components/sun-logo";
import {
  OVERLAY_VISIBLE_MS,
  loadSettings,
  loadSurpriseVisitId,
  saveSurpriseVisitId,
} from "@/lib/storage";

type SurpriseOverlayProps = {
  waterShowing?: boolean;
  previewLine?: string | null;
  onPreviewConsumed?: () => void;
};

export function SurpriseOverlay({
  waterShowing = false,
  previewLine = null,
  onPreviewConsumed,
}: SurpriseOverlayProps) {
  const [line, setLine] = useState<string | null>(null);

  const showLine = useCallback(
    (text: string) => {
      setLine(text);
      window.setTimeout(() => {
        setLine(null);
        onPreviewConsumed?.();
      }, OVERLAY_VISIBLE_MS);
    },
    [onPreviewConsumed]
  );

  useEffect(() => {
    if (previewLine) {
      showLine(previewLine);
    }
  }, [previewLine, showLine]);

  useEffect(() => {
    if (waterShowing || previewLine) return;

    const settings = loadSettings();
    const lines = settings.surpriseLines.filter((l) => l.trim().length > 0);
    if (!lines.length) return;

    const visitKey = sessionStorage.getItem("sunshine.sessionVisit");
    let visitId = visitKey;
    if (!visitId) {
      visitId = crypto.randomUUID();
      sessionStorage.setItem("sunshine.sessionVisit", visitId);
    }

    const shownFor = loadSurpriseVisitId();
    if (shownFor === visitId) return;

    const pick = lines[Math.floor(Math.random() * lines.length)];
    const delay = window.setTimeout(() => {
      if (waterShowing) return;
      saveSurpriseVisitId(visitId!);
      showLine(pick);
    }, 2500);

    return () => clearTimeout(delay);
  }, [previewLine, showLine, waterShowing]);

  if (!line) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-[#F2C14E]/25 p-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex max-w-md flex-col items-center gap-3 rounded-3xl border border-[#F2C14E] bg-[#FAF4FF] px-8 py-6 text-center shadow-2xl">
        <SunLogo className="size-12" />
        <p className="text-lg font-medium leading-snug text-[#3D2463]">{line}</p>
      </div>
    </div>
  );
}
