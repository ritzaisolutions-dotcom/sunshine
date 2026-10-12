"use client";

import { useCallback, useEffect, useState } from "react";
import { ListTodo, X } from "lucide-react";
import { chatCopy, type ReplyLanguage } from "@/lib/language";
import {
  fetchTodos,
  patchTodo,
  type SunshineTodo,
} from "@/lib/todos";

type TodoReminderProps = {
  lang: ReplyLanguage;
  paused?: boolean;
  onShowingChange?: (showing: boolean) => void;
};

function pickDueTodo(items: SunshineTodo[]): SunshineTodo | null {
  const now = Date.now();
  const due = items
    .filter(
      (t) =>
        t.status === "open" &&
        t.dueAt &&
        new Date(t.dueAt).getTime() <= now
    )
    .sort(
      (a, b) =>
        new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()
    );
  for (const todo of due) {
    if (!todo.remindedAt) return todo;
    const reminded = new Date(todo.remindedAt).getTime();
    // Show again only if due again after a full day of silence.
    if (now - reminded >= 24 * 60 * 60 * 1000) return todo;
  }
  return null;
}

export function TodoReminder({
  lang,
  paused = false,
  onShowingChange,
}: TodoReminderProps) {
  const copy = chatCopy(lang).todos;
  const [todo, setTodo] = useState<SunshineTodo | null>(null);

  const hide = useCallback(() => {
    setTodo(null);
    onShowingChange?.(false);
  }, [onShowingChange]);

  const check = useCallback(async () => {
    if (paused) return;
    try {
      const items = await fetchTodos();
      const next = pickDueTodo(items);
      if (next) {
        setTodo(next);
        onShowingChange?.(true);
      }
    } catch {
      /* optional */
    }
  }, [onShowingChange, paused]);

  useEffect(() => {
    if (paused) {
      hide();
      return;
    }
    void check();
    const tick = window.setInterval(() => void check(), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [check, hide, paused]);

  const dismiss = async () => {
    if (!todo) return;
    const id = todo.id;
    hide();
    try {
      await patchTodo(id, { remindedAt: new Date().toISOString() });
    } catch {
      /* ignore */
    }
  };

  if (!todo) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-rapunzel-gold/60 bg-card/95 px-4 py-3 shadow-xl backdrop-blur">
        <ListTodo className="size-5 shrink-0 text-rapunzel-gold-deep" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-rapunzel-plum/70">
            {copy.reminderTitle}
          </p>
          <p className="truncate text-sm font-medium text-rapunzel-plum">
            {todo.title}
          </p>
        </div>
        <button
          type="button"
          aria-label={copy.reminderClose}
          onClick={() => void dismiss()}
          className="grid size-8 shrink-0 place-items-center rounded-full text-rapunzel-plum hover:bg-muted"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
