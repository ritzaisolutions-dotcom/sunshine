"use client";

import { FormEvent, useMemo, useState } from "react";
import { Lock, Sun } from "lucide-react";
import { BowField } from "@/components/bow-pattern";
import { SunLogo } from "@/components/sun-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { browserReplyLanguage } from "@/lib/language";

const COPY = {
  de: {
    title: "Sunshine",
    prompt: "Schlüsselwort eingeben",
    placeholder: "Schlüsselwort",
    submit: "Öffnen",
    wrong: "Falsches Schlüsselwort.",
    snag: "Das hat nicht geklappt. Nochmal versuchen.",
  },
  en: {
    title: "Sunshine",
    prompt: "Enter the keyword",
    placeholder: "Keyword",
    submit: "Open",
    wrong: "Wrong keyword.",
    snag: "Something went wrong. Try again.",
  },
} as const;

export default function UnlockPage() {
  const lang = useMemo(() => browserReplyLanguage(), []);
  const copy = COPY[lang];
  const [keyword, setKeyword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!keyword.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword }),
      });
      if (res.status === 401) {
        setError(copy.wrong);
        setBusy(false);
        return;
      }
      if (!res.ok) {
        setError(copy.snag);
        setBusy(false);
        return;
      }
      window.location.href = "/";
    } catch {
      setError(copy.snag);
      setBusy(false);
    }
  };

  return (
    <div className="sunshine-shell relative flex min-h-screen items-center justify-center p-6 text-rapunzel-ink">
      <BowField />
      <div className="relative z-10 w-full max-w-sm rounded-[1.75rem] border border-white/80 bg-card/80 p-8 shadow-[0_20px_60px_-36px_color-mix(in_srgb,var(--primary)_55%,transparent)]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <SunLogo className="size-16" title={copy.title} />
          <h1 className="font-[family-name:var(--font-fraunces)] text-3xl tracking-tight text-rapunzel-ink">
            {copy.title}
          </h1>
          <p className="flex items-center gap-1.5 text-sm text-rapunzel-plum/85">
            <Lock className="size-3.5" aria-hidden />
            {copy.prompt}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={copy.placeholder}
            aria-label={copy.placeholder}
            className="h-11 rounded-xl bg-white/70 text-base"
          />
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={busy || !keyword.trim()}
            className="h-11 w-full rounded-xl bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
          >
            <Sun className="size-4" aria-hidden />
            {copy.submit}
          </Button>
        </form>
      </div>
    </div>
  );
}
