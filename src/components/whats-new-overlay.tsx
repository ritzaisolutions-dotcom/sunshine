"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  ImageIcon,
  Languages,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Volume2,
} from "lucide-react";
import { SunLogo } from "@/components/sun-logo";
import { Button } from "@/components/ui/button";
import {
  WHATS_NEW_VERSION,
  loadWhatsNewSeen,
  saveWhatsNewSeen,
} from "@/lib/storage";

const FEATURES = [
  {
    icon: Languages,
    title: "German or English",
    blurb:
      "Talk or type in German or English. Maria answers in that same language.",
  },
  {
    icon: ImageIcon,
    title: "Pictures",
    blurb: "Ask Maria to draw — she makes a friendly picture for you.",
  },
  {
    icon: Sparkles,
    title: "Smarter help",
    blurb: "Hard homework and careful writing get a stronger brain.",
  },
  {
    icon: RefreshCw,
    title: "Try again",
    blurb: "Not quite right? Redo Maria’s latest reply in one tap.",
  },
  {
    icon: Pencil,
    title: "Edit your message",
    blurb: "Fix your last question and send it again.",
  },
  {
    icon: Search,
    title: "Look it up",
    blurb: "For today’s facts, Maria can search and show short sources.",
  },
  {
    icon: Volume2,
    title: "Maria speaks",
    blurb: "Tap Speak on a reply to hear it aloud. The mic still types for you.",
  },
  {
    icon: Cloud,
    title: "Follow me",
    blurb: "Save chats and About Noorie with a sync code on phone and laptop.",
  },
] as const;

type WhatsNewOverlayProps = {
  onShowingChange?: (showing: boolean) => void;
};

export function WhatsNewOverlay({ onShowingChange }: WhatsNewOverlayProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loadWhatsNewSeen() === WHATS_NEW_VERSION) return;
    const delay = window.setTimeout(() => {
      setOpen(true);
      onShowingChange?.(true);
    }, 900);
    return () => window.clearTimeout(delay);
  }, [onShowingChange]);

  const dismiss = () => {
    saveWhatsNewSeen(WHATS_NEW_VERSION);
    setOpen(false);
    onShowingChange?.(false);
  };

  if (!open) return null;

  return (
    <div
      className="sunshine-overlay-motion fixed inset-0 z-[70] flex items-center justify-center bg-rapunzel-plum/35 p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
    >
      <div className="relative flex max-h-[min(90vh,640px)] w-full max-w-md flex-col rounded-3xl border border-rapunzel-gold/50 bg-card shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center gap-2 px-6 pt-7 text-center">
          <SunLogo className="size-12" />
          <p className="text-[10px] uppercase tracking-widest text-rapunzel-plum/70">
            Sunshine update
          </p>
          <h2
            id="whats-new-title"
            className="font-[family-name:var(--font-fraunces)] text-2xl font-medium tracking-tight text-rapunzel-plum"
          >
            New for you, Noorie
          </h2>
          <p className="max-w-sm text-sm leading-snug text-rapunzel-ink/75">
            Maria Sunshine learned a few new tricks. Here’s what you can try
            now.
          </p>
        </div>

        <ul className="mt-5 flex-1 space-y-3 overflow-y-auto px-6 pb-2">
          {FEATURES.map(({ icon: Icon, title, blurb }) => (
            <li
              key={title}
              className="flex gap-3 rounded-2xl bg-rapunzel-soft/80 px-3 py-2.5 text-left"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-rapunzel-gold/70 text-rapunzel-ink">
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-medium text-rapunzel-ink">
                  {title}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-rapunzel-plum/85">
                  {blurb}
                </span>
              </span>
            </li>
          ))}
        </ul>

        <div className="shrink-0 border-t border-border px-6 py-4">
          <Button
            type="button"
            onClick={dismiss}
            className="w-full rounded-2xl bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
          >
            Got it — let’s go
          </Button>
        </div>
      </div>
    </div>
  );
}
