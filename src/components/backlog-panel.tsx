"use client";

import { useState } from "react";
import { SunLogo } from "@/components/sun-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addBacklogWishes, saveBacklog } from "@/lib/storage";
import { BacklogItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type BacklogPanelProps = {
  items: BacklogItem[];
  onChange: (items: BacklogItem[]) => void;
};

/**
 * Wish-ribbon backlog: each upgrade request hangs like a soft ribbon tag
 * under the red sun — not a generic ticket board.
 */
export function BacklogPanel({ items, onChange }: BacklogPanelProps) {
  const [draft, setDraft] = useState("");
  const open = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  const persist = (next: BacklogItem[]) => {
    saveBacklog(next);
    onChange(next);
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#F2C14E]/55 bg-gradient-to-b from-[#FAF4FF] via-[#E8D5F5]/80 to-[#F2C14E]/20 p-6 shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-[#F2C14E]/25 blur-2xl"
      />
      <div className="relative mb-5 flex items-start gap-3">
        <SunLogo className="size-12" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#E0A92E]">
            Wish ribbon
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-[#7B4B9A]">
            Upgrade backlog
          </h2>
          <p className="mt-1 max-w-md text-sm leading-relaxed text-[#3D2463]/70">
            Tell Maria what you want changed in Sunshine. She saves every wish
            here so nothing gets lost.
          </p>
        </div>
      </div>

      {open.length === 0 ? (
        <div className="relative mb-5 rounded-2xl border border-dashed border-[#9B6BC0]/35 bg-white/55 px-4 py-6 text-center text-sm text-[#3D2463]/60">
          No open wishes yet. In chat, say something like “I wish Sunshine
          could…” and Maria will pin it here.
        </div>
      ) : (
        <ul className="relative mb-5 space-y-3">
          {open.map((item, index) => (
            <li
              key={item.id}
              className={cn(
                "group relative rounded-2xl border border-white/80 bg-[#FAF4FF]/95 px-4 py-3 shadow-[0_8px_24px_-16px_rgba(123,75,154,0.55)]",
                "before:absolute before:left-4 before:-top-2 before:h-2 before:w-10 before:rounded-full before:bg-[#F2C14E]"
              )}
              style={{ marginLeft: `${Math.min(index, 4) * 6}px` }}
            >
              <p className="pr-16 text-sm font-medium leading-snug text-[#3D2463]">
                {item.wish}
              </p>
              <p className="mt-1 text-[11px] text-[#3D2463]/45">
                {item.source === "chat" ? "From chat" : "Added in Admin"} ·{" "}
                {new Date(item.createdAt).toLocaleString()}
              </p>
              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  type="button"
                  className="text-[11px] font-medium text-[#7B4B9A] underline-offset-2 hover:underline"
                  onClick={() =>
                    persist(
                      items.map((i) =>
                        i.id === item.id ? { ...i, done: true } : i
                      )
                    )
                  }
                >
                  Done
                </button>
                <button
                  type="button"
                  className="text-[11px] text-[#3D2463]/45 hover:text-[#9B6BC0]"
                  onClick={() =>
                    persist(items.filter((i) => i.id !== item.id))
                  }
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="relative flex flex-col gap-2 sm:flex-row">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Pin a wish yourself…"
          className="rounded-2xl border-[#D4B8E8] bg-white/80"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!draft.trim()) return;
              onChange(addBacklogWishes([draft.trim()], "admin"));
              setDraft("");
            }
          }}
        />
        <Button
          type="button"
          className="rounded-full bg-[#F2C14E] text-[#3D2463] hover:bg-[#E8B84A]"
          onClick={() => {
            if (!draft.trim()) return;
            onChange(addBacklogWishes([draft.trim()], "admin"));
            setDraft("");
          }}
        >
          Pin wish
        </Button>
      </div>

      {done.length > 0 ? (
        <details className="relative mt-5">
          <summary className="cursor-pointer text-xs font-medium text-[#7B4B9A]">
            Done ribbons ({done.length})
          </summary>
          <ul className="mt-2 space-y-2">
            {done.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-white/50 px-3 py-2 text-xs text-[#3D2463]/55 line-through"
              >
                <span>{item.wish}</span>
                <button
                  type="button"
                  className="shrink-0 text-[#7B4B9A] no-underline"
                  onClick={() =>
                    persist(
                      items.map((i) =>
                        i.id === item.id ? { ...i, done: false } : i
                      )
                    )
                  }
                >
                  Reopen
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
