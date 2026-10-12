"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { BowField } from "@/components/bow-pattern";
import { SunLogo } from "@/components/sun-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { browserReplyLanguage, chatCopy } from "@/lib/language";
import {
  createTodo,
  deleteTodo,
  fetchTodos,
  patchTodo,
  type SunshineTodo,
  type TodoRecurrence,
} from "@/lib/todos";
import { cn } from "@/lib/utils";

function formatDue(iso: string | null, lang: "de" | "en"): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(lang === "de" ? "de-DE" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function TodosPage() {
  const lang = useMemo(() => browserReplyLanguage(), []);
  const copy = chatCopy(lang).todos;
  const [items, setItems] = useState<SunshineTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dueLocal, setDueLocal] = useState("");
  const [recurrence, setRecurrence] = useState<TodoRecurrence>("none");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const next = await fetchTodos();
      setItems(next);
      setError(null);
    } catch {
      setError(copy.failed);
    } finally {
      setLoading(false);
    }
  }, [copy.failed]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const open = items.filter((t) => t.status === "open");
  const done = items.filter((t) => t.status === "done");
  const suggested = items.filter((t) => t.status === "suggested");

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      await createTodo({
        title: title.trim(),
        source: "noorie",
        status: "open",
        recurrence,
        dueAt: dueLocal ? new Date(dueLocal).toISOString() : null,
      });
      setTitle("");
      setDueLocal("");
      setRecurrence("none");
      await reload();
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const markDone = async (todo: SunshineTodo) => {
    setBusy(true);
    try {
      await patchTodo(todo.id, {
        status: "done",
        completeRecurring: todo.recurrence !== "none",
      });
      await reload();
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const reopen = async (todo: SunshineTodo) => {
    setBusy(true);
    try {
      await patchTodo(todo.id, { status: "open", clearReminded: true });
      await reload();
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const accept = async (todo: SunshineTodo) => {
    setBusy(true);
    try {
      await patchTodo(todo.id, { status: "open", clearReminded: true });
      await reload();
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (todo: SunshineTodo) => {
    setBusy(true);
    try {
      await deleteTodo(todo.id);
      await reload();
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sunshine-shell relative min-h-screen text-rapunzel-ink">
      <BowField />
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-6">
        <header className="mb-6 flex items-center justify-between gap-3">
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
        </header>

        <form
          onSubmit={onCreate}
          className="mb-8 space-y-3 rounded-[1.5rem] border border-white/80 bg-card/80 p-4 shadow-sm"
        >
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={copy.placeholder}
            className="h-11 rounded-xl bg-white/70"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1 text-xs text-rapunzel-plum/80">
              {copy.dueOptional}
              <Input
                type="datetime-local"
                value={dueLocal}
                onChange={(e) => setDueLocal(e.target.value)}
                className="h-10 rounded-xl bg-white/70"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-rapunzel-plum/80">
              {copy.recurrence}
              <select
                value={recurrence}
                onChange={(e) =>
                  setRecurrence(e.target.value as TodoRecurrence)
                }
                className="h-10 rounded-xl border border-input bg-white/70 px-2 text-sm"
              >
                <option value="none">{copy.none}</option>
                <option value="daily">{copy.daily}</option>
                <option value="weekly">{copy.weekly}</option>
              </select>
            </label>
          </div>
          <Button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-xl bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
          >
            <Plus className="size-4" aria-hidden />
            {copy.add}
          </Button>
        </form>

        {loading ? (
          <p className="text-sm text-rapunzel-plum/80">{copy.loading}</p>
        ) : null}
        {error ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <TodoSection
          heading={copy.open}
          empty={copy.emptyOpen}
          items={open}
          lang={lang}
          renderActions={(todo) => (
            <>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void markDone(todo)}
                className="rounded-full bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
              >
                <Check className="size-3.5" aria-hidden />
                {copy.markDone}
              </Button>
              <IconDelete label={copy.delete} onClick={() => void remove(todo)} />
            </>
          )}
        />

        <TodoSection
          heading={copy.suggested}
          empty={copy.emptySuggested}
          items={suggested}
          lang={lang}
          renderActions={(todo) => (
            <>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void accept(todo)}
                className="rounded-full bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
              >
                {copy.accept}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void remove(todo)}
              >
                {copy.dismiss}
              </Button>
            </>
          )}
        />

        <TodoSection
          heading={copy.done}
          empty={copy.emptyDone}
          items={done}
          lang={lang}
          muted
          renderActions={(todo) => (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void reopen(todo)}
              >
                {copy.reopen}
              </Button>
              <IconDelete label={copy.delete} onClick={() => void remove(todo)} />
            </>
          )}
        />
      </div>
    </div>
  );
}

function IconDelete({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-rapunzel-plum/70 hover:bg-muted hover:text-rapunzel-ink"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

function TodoSection({
  heading,
  empty,
  items,
  lang,
  muted,
  renderActions,
}: {
  heading: string;
  empty: string;
  items: SunshineTodo[];
  lang: "de" | "en";
  muted?: boolean;
  renderActions: (todo: SunshineTodo) => ReactNode;
}) {
  const copy = chatCopy(lang).todos;
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-rapunzel-plum/70">
        {heading}
      </h2>
      {!items.length ? (
        <p className="text-sm text-rapunzel-ink/55">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((todo) => {
            const due = formatDue(todo.dueAt, lang);
            return (
              <li
                key={todo.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-2xl border border-white/70 bg-card/75 px-4 py-3",
                  muted && "opacity-75"
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium text-rapunzel-ink">{todo.title}</p>
                  <p className="mt-0.5 text-[11px] text-rapunzel-plum/75">
                    {todo.recurrence !== "none"
                      ? todo.recurrence === "daily"
                        ? copy.daily
                        : copy.weekly
                      : null}
                    {todo.recurrence !== "none" && due ? " · " : null}
                    {due}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {renderActions(todo)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
