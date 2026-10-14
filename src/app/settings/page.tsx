"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, BellOff } from "lucide-react";
import { BowField } from "@/components/bow-pattern";
import { SunLogo } from "@/components/sun-logo";
import { Button } from "@/components/ui/button";
import { browserReplyLanguage, chatCopy } from "@/lib/language";
import {
  DEFAULT_NOTIFICATION_PREFS,
  type NotificationPrefs,
} from "@/lib/notifications";
import {
  disablePush,
  enablePush,
  fetchNotificationPrefs,
  hasActivePushSubscription,
  pushSupported,
  saveNotificationPrefs,
  sendTestPush,
} from "@/lib/push-client";
import {
  loadNotificationPrefs,
  saveNotificationPrefsLocal,
} from "@/lib/storage";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const lang = useMemo(() => browserReplyLanguage(), []);
  const copy = chatCopy(lang).settings;
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [deviceSubscribed, setDeviceSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">(
    "unknown"
  );

  const syncLocal = useCallback((next: NotificationPrefs) => {
    setPrefs(next);
    saveNotificationPrefsLocal(next);
  }, []);

  const refreshDevice = useCallback(async () => {
    const active = await hasActivePushSubscription();
    setDeviceSubscribed(active);
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    setSupported(pushSupported());
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
    syncLocal(loadNotificationPrefs());
    void fetchNotificationPrefs()
      .then((remote) => syncLocal(remote))
      .catch(() => undefined);
    void refreshDevice();
  }, [refreshDevice, syncLocal]);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2500);
  };

  const toggleChannel = async (
    key: "dueTodos" | "water",
    value: boolean
  ) => {
    const next = { ...prefs, [key]: value };
    syncLocal(next);
    setBusy(true);
    try {
      const saved = await saveNotificationPrefs(next);
      syncLocal(saved);
      flash(copy.saved);
    } catch {
      flash(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const turnOn = async () => {
    if (!supported) {
      flash(copy.unsupported);
      return;
    }
    setBusy(true);
    try {
      const next = await enablePush(prefs);
      syncLocal(next);
      await refreshDevice();
      flash(copy.enabled);
    } catch (err) {
      await refreshDevice();
      flash(
        err instanceof Error && err.message.includes("permission")
          ? copy.denied
          : copy.failed
      );
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const next = await disablePush(prefs);
      syncLocal(next);
      setDeviceSubscribed(false);
      flash(copy.disabled);
    } catch {
      flash(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const runTest = async () => {
    setBusy(true);
    try {
      await sendTestPush();
      flash(copy.testOk);
    } catch {
      flash(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const needsDeviceSignup = prefs.enabled && !deviceSubscribed && supported;

  return (
    <div className="sunshine-shell relative min-h-screen text-rapunzel-ink">
      <BowField />
      <header className="fixed inset-x-0 top-0 z-30 border-b border-white/70 bg-card/95 backdrop-blur-md">
        <div className="relative z-10 mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              aria-label={copy.back}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-white/80 bg-card/80 text-rapunzel-ink hover:bg-white/70"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <SunLogo className="size-10 shrink-0" title="Sunshine" />
            <h1 className="truncate font-[family-name:var(--font-fraunces)] text-2xl tracking-tight">
              {copy.title}
            </h1>
          </div>
          <Link
            href="/"
            className="shrink-0 rounded-full bg-rapunzel-gold px-4 py-2 text-sm text-rapunzel-ink hover:bg-rapunzel-gold-deep"
          >
            {copy.back}
          </Link>
        </div>
      </header>
      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-6 pt-20">
        <section className="space-y-5 rounded-[1.5rem] border border-white/80 bg-card/80 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-rapunzel-gold/35 text-rapunzel-ink">
              {prefs.enabled && deviceSubscribed ? (
                <Bell className="size-5" aria-hidden />
              ) : (
                <BellOff className="size-5" aria-hidden />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-rapunzel-plum">{copy.pushTitle}</h2>
              <p className="mt-1 text-sm leading-relaxed text-rapunzel-ink/70">
                {copy.pushBlurb}
              </p>
              <p className="mt-2 text-xs text-rapunzel-plum/70">{copy.iosHint}</p>
              {supported && prefs.enabled ? (
                <p className="mt-2 text-xs text-rapunzel-ink/70">
                  {deviceSubscribed ? copy.subscribed : copy.notSubscribed}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!prefs.enabled || needsDeviceSignup ? (
              <Button
                type="button"
                disabled={busy || !supported}
                className="rounded-full bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
                onClick={() => void turnOn()}
              >
                {copy.turnOn}
              </Button>
            ) : (
              <Button
                type="button"
                disabled={busy}
                variant="outline"
                className="rounded-full border-rapunzel-gold/70"
                onClick={() => void turnOff()}
              >
                {copy.turnOff}
              </Button>
            )}
            {deviceSubscribed ? (
              <Button
                type="button"
                disabled={busy}
                variant="outline"
                className="rounded-full border-rapunzel-gold/70"
                onClick={() => void runTest()}
              >
                {copy.testPush}
              </Button>
            ) : null}
            {message ? (
              <span className="text-xs text-rapunzel-plum">{message}</span>
            ) : null}
          </div>

          {!supported ? (
            <p className="text-sm text-rapunzel-ink/70">{copy.unsupported}</p>
          ) : null}
          {permission === "denied" ? (
            <p className="text-sm text-rapunzel-ink/70">{copy.denied}</p>
          ) : null}

          <div
            className={cn(
              "space-y-3 border-t border-border pt-4",
              !prefs.enabled && "opacity-55"
            )}
          >
            <p className="text-[10px] uppercase tracking-widest text-rapunzel-plum/70">
              {copy.channels}
            </p>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/50 px-3 py-3">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--primary)]"
                checked={prefs.dueTodos}
                disabled={busy || !prefs.enabled}
                onChange={(e) => void toggleChannel("dueTodos", e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-rapunzel-plum">
                  {copy.dueTodos}
                </span>
                <span className="mt-0.5 block text-xs text-rapunzel-ink/65">
                  {copy.dueTodosHint}
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-white/50 px-3 py-3">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--primary)]"
                checked={prefs.water}
                disabled={busy || !prefs.enabled}
                onChange={(e) => void toggleChannel("water", e.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium text-rapunzel-plum">
                  {copy.water}
                </span>
                <span className="mt-0.5 block text-xs text-rapunzel-ink/65">
                  {copy.waterHint}
                </span>
              </span>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
