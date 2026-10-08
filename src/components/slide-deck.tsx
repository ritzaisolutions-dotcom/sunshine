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
    <div className="mt-2 w-full max-w-md overflow-hidden rounded-2xl border border-[#D4B8E8] bg-[#FAF4FF] shadow-sm">
      <div className="bg-gradient-to-r from-[#9B6BC0] to-[#F2C14E] px-4 py-2 text-sm font-medium text-[#FFFDF8]">
        {deck.title}
      </div>
      <div className="min-h-36 space-y-2 px-5 py-4">
        <h3 className="text-base font-semibold text-[#7B4B9A]">{slide.title}</h3>
        <p className="text-sm leading-relaxed text-[#3D2463]/90">{slide.body}</p>
      </div>
      <div className="flex items-center justify-between border-t border-[#D4B8E8]/60 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="text-[#7B4B9A]"
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <span className="text-xs tabular-nums text-[#3D2463]/60">
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
          className="text-[#7B4B9A]"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
