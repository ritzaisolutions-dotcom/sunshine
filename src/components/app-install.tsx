"use client";

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chatCopy, type ReplyLanguage } from "@/lib/language";
import {
  loadInstallDismissed,
  saveInstallDismissed,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type AppInstallProps = {
  lang: ReplyLanguage;
  className?: string;
};

export function AppInstall({ lang, className }: AppInstallProps) {
  const copy = chatCopy(lang);
  const [updateReady, setUpdateReady] = useState(false);
  const [installReady, setInstallReady] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const installEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let cancelled = false;
    let updateTimer: number | null = null;
    let check: (() => void) | null = null;

    const onControllerChange = () => {
      window.location.reload();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") check?.();
    };

    const watchWaiting = (registration: ServiceWorkerRegistration) => {
      const waiting = registration.waiting;
      if (waiting) {
        setUpdateReady(true);
        return;
      }
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (
          installing.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          setUpdateReady(true);
        }
      });
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (cancelled) return;
        registrationRef.current = registration;

        if (!navigator.serviceWorker.controller && registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        } else if (
          !navigator.serviceWorker.controller &&
          registration.installing
        ) {
          registration.installing.addEventListener("statechange", () => {
            if (registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          });
        }

        watchWaiting(registration);
        registration.addEventListener("updatefound", () => {
          watchWaiting(registration);
        });

        check = () => {
          void registration.update().catch(() => undefined);
        };
        check();
        updateTimer = window.setInterval(check, 60 * 60 * 1000);
        window.addEventListener("focus", check);
        document.addEventListener("visibilitychange", onVisible);
      } catch {
        /* Service worker optional. */
      }
    };

    void register();
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    return () => {
      cancelled = true;
      if (updateTimer != null) window.clearInterval(updateTimer);
      if (check) window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (loadInstallDismissed()) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      installEventRef.current = event as BeforeInstallPromptEvent;
      setInstallReady(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const applyUpdate = () => {
    const waiting = registrationRef.current?.waiting;
    if (!waiting) {
      setUpdateReady(false);
      return;
    }
    waiting.postMessage({ type: "SKIP_WAITING" });
  };

  const install = async () => {
    const promptEvent = installEventRef.current;
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice.catch(() => undefined);
    installEventRef.current = null;
    setInstallReady(false);
    saveInstallDismissed();
  };

  const dismissInstall = () => {
    installEventRef.current = null;
    setInstallReady(false);
    saveInstallDismissed();
  };

  if (!updateReady && !installReady) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-2xl border border-rapunzel-gold/60 bg-card/95 px-3 py-2.5 shadow-xl backdrop-blur">
        {updateReady ? (
          <>
            <RefreshCw className="size-4 shrink-0 text-rapunzel-plum" aria-hidden />
            <Button
              type="button"
              size="sm"
              onClick={applyUpdate}
              className="min-w-0 flex-1 rounded-full bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
            >
              {copy.updateApp}
            </Button>
          </>
        ) : (
          <>
            <Download className="size-4 shrink-0 text-rapunzel-plum" aria-hidden />
            <Button
              type="button"
              size="sm"
              onClick={() => void install()}
              className="min-w-0 flex-1 rounded-full bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
            >
              {copy.installApp}
            </Button>
            <button
              type="button"
              aria-label={copy.dismissInstall}
              onClick={dismissInstall}
              className="grid size-8 shrink-0 place-items-center rounded-full text-rapunzel-plum hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
