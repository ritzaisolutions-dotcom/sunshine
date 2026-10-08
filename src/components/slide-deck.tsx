"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SlideDeck } from "@/lib/types";

export function SlideDeckView({ deck }: { deck: SlideDeck }) {
  const [index, setIndex] = useState(0);
  const slide = deck.slides[index];
  if (!slide) return null;

  return (
    <div className="mt-2 w-full max-w-md overflow-hidden rounded-2xl border border-[#CDB4E8] bg-[#FFF8EF] shadow-sm">
      <div className="bg-gradient-to-r from-[#5C2D91] to-[#F3B6C8] px-4 py-2 text-sm font-medium text-[#FFF8EF]">
        {deck.title}
      </div>
      <div className="min-h-36 space-y-2 px-5 py-4">
        <h3 className="text-base font-semibold text-[#5C2D91]">{slide.title}</h3>
        <p className="text-sm leading-relaxed text-[#1B1028]/90">{slide.body}</p>
      </div>
      <div className="flex items-center justify-between border-t border-[#CDB4E8]/50 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="text-[#5C2D91]"
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <span className="text-xs tabular-nums text-[#1B1028]/60">
          {index + 1} / {deck.slides.length}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={index >= deck.slides.length - 1}
          onClick={() =>
            setIndex((i) => Math.min(deck.slides.length - 1, i + 1))
          }
          className="text-[#5C2D91]"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
