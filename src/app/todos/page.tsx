"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { ArrowLeft, Check, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
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
  reorderTodos,
  type SunshineTodo,
  type TodoRecurrence,
  type TodoStatus,
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

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (!item) return list;
  next.splice(to, 0, item);
  return next;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueLocal, setEditDueLocal] = useState("");
  const [editRecurrence, setEditRecurrence] = useState<TodoRecurrence>("none");
  const [draggingId, setDraggingId] = useState<string | null>(null);

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

  const onReorder = async (
    status: TodoStatus,
    sectionItems: SunshineTodo[],
    fromId: string,
    toId: string
  ) => {
    if (fromId === toId) return;
    const from = sectionItems.findIndex((t) => t.id === fromId);
    const to = sectionItems.findIndex((t) => t.id === toId);
    if (from < 0 || to < 0) return;
    const nextSection = moveItem(sectionItems, from, to);
    const nextItems = [
      ...items.filter((t) => t.status !== status),
      ...nextSection,
    ];
    const openIds =
      status === "open"
        ? nextSection.map((t) => t.id)
        : nextItems.filter((t) => t.status === "open").map((t) => t.id);
    const suggestedIds =
      status === "suggested"
        ? nextSection.map((t) => t.id)
        : nextItems.filter((t) => t.status === "suggested").map((t) => t.id);
    const doneIds =
      status === "done"
        ? nextSection.map((t) => t.id)
        : nextItems.filter((t) => t.status === "done").map((t) => t.id);

    setItems(nextItems);
    setBusy(true);
    try {
      await reorderTodos([...openIds, ...suggestedIds, ...doneIds]);
      await reload();
    } catch {
      setError(copy.failed);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (todo: SunshineTodo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDueLocal(toDatetimeLocal(todo.dueAt));
    setEditRecurrence(todo.recurrence);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditDueLocal("");
    setEditRecurrence("none");
  };

  const saveEdit = async (todo: SunshineTodo) => {
    if (!editTitle.trim() || busy) return;
    setBusy(true);
    try {
      await patchTodo(todo.id, {
        title: editTitle.trim(),
        dueAt: editDueLocal ? new Date(editDueLocal).toISOString() : null,
        recurrence: editRecurrence,
        status: todo.status,
        source: todo.source,
        clearReminded: true,
      });
      cancelEdit();
      await reload();
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };

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
      if (editingId === todo.id) cancelEdit();
      await reload();
    } catch {
      setError(copy.failed);
    } finally {
      setBusy(false);
    }
  };

  const editButton = (todo: SunshineTodo) => (
    <button
      type="button"
      aria-label={copy.edit}
      disabled={busy}
      onClick={() => startEdit(todo)}
      className="grid size-8 place-items-center rounded-full text-rapunzel-plum/70 hover:bg-muted hover:text-rapunzel-ink disabled:opacity-50"
    >
      <Pencil className="size-3.5" />
    </button>
  );

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
          status="open"
          items={open}
          lang={lang}
          editingId={editingId}
          editTitle={editTitle}
          editDueLocal={editDueLocal}
          editRecurrence={editRecurrence}
          busy={busy}
          draggingId={draggingId}
          onDraggingId={setDraggingId}
          onReorder={(fromId, toId) => void onReorder("open", open, fromId, toId)}
          onEditTitle={setEditTitle}
          onEditDue={setEditDueLocal}
          onEditRecurrence={setEditRecurrence}
          onSaveEdit={(todo) => void saveEdit(todo)}
          onCancelEdit={cancelEdit}
          renderActions={(todo) => (
            <>
              {editButton(todo)}
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
          status="suggested"
          items={suggested}
          lang={lang}
          editingId={editingId}
          editTitle={editTitle}
          editDueLocal={editDueLocal}
          editRecurrence={editRecurrence}
          busy={busy}
          draggingId={draggingId}
          onDraggingId={setDraggingId}
          onReorder={(fromId, toId) =>
            void onReorder("suggested", suggested, fromId, toId)
          }
          onEditTitle={setEditTitle}
          onEditDue={setEditDueLocal}
          onEditRecurrence={setEditRecurrence}
          onSaveEdit={(todo) => void saveEdit(todo)}
          onCancelEdit={cancelEdit}
          renderActions={(todo) => (
            <>
              {editButton(todo)}
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
          status="done"
          items={done}
          lang={lang}
          muted
          editingId={editingId}
          editTitle={editTitle}
          editDueLocal={editDueLocal}
          editRecurrence={editRecurrence}
          busy={busy}
          draggingId={draggingId}
          onDraggingId={setDraggingId}
          onReorder={(fromId, toId) => void onReorder("done", done, fromId, toId)}
          onEditTitle={setEditTitle}
          onEditDue={setEditDueLocal}
          onEditRecurrence={setEditRecurrence}
          onSaveEdit={(todo) => void saveEdit(todo)}
          onCancelEdit={cancelEdit}
          renderActions={(todo) => (
            <>
              {editButton(todo)}
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
  status,
  items,
  lang,
  muted,
  editingId,
  editTitle,
  editDueLocal,
  editRecurrence,
  busy,
  draggingId,
  onDraggingId,
  onReorder,
  onEditTitle,
  onEditDue,
  onEditRecurrence,
  onSaveEdit,
  onCancelEdit,
  renderActions,
}: {
  heading: string;
  empty: string;
  status: TodoStatus;
  items: SunshineTodo[];
  lang: "de" | "en";
  muted?: boolean;
  editingId: string | null;
  editTitle: string;
  editDueLocal: string;
  editRecurrence: TodoRecurrence;
  busy: boolean;
  draggingId: string | null;
  onDraggingId: (id: string | null) => void;
  onReorder: (fromId: string, toId: string) => void;
  onEditTitle: (value: string) => void;
  onEditDue: (value: string) => void;
  onEditRecurrence: (value: TodoRecurrence) => void;
  onSaveEdit: (todo: SunshineTodo) => void;
  onCancelEdit: () => void;
  renderActions: (todo: SunshineTodo) => ReactNode;
}) {
  const copy = chatCopy(lang).todos;

  const onDragStart = (event: DragEvent, id: string) => {
    if (editingId || busy) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.setData(`sunshine-todo-${status}`, id);
    onDraggingId(id);
  };

  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const onDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const fromId =
      event.dataTransfer.getData(`sunshine-todo-${status}`) ||
      event.dataTransfer.getData("text/plain");
    onDraggingId(null);
    if (!fromId) return;
    onReorder(fromId, targetId);
  };

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
            const isEditing = editingId === todo.id;
            return (
              <li
                key={todo.id}
                draggable={!isEditing && !busy}
                onDragStart={(e) => onDragStart(e, todo.id)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, todo.id)}
                onDragEnd={() => onDraggingId(null)}
                className={cn(
                  "rounded-2xl border border-white/70 bg-card/75 px-4 py-3 transition",
                  muted && "opacity-75",
                  draggingId === todo.id && "opacity-50 ring-2 ring-rapunzel-gold/60",
                  !isEditing && !busy && "cursor-grab active:cursor-grabbing"
                )}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={editTitle}
                      onChange={(e) => onEditTitle(e.target.value)}
                      className="h-10 rounded-xl bg-white/70"
                      autoFocus
                    />
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <label className="flex flex-1 flex-col gap-1 text-xs text-rapunzel-plum/80">
                        {copy.dueOptional}
                        <Input
                          type="datetime-local"
                          value={editDueLocal}
                          onChange={(e) => onEditDue(e.target.value)}
                          className="h-10 rounded-xl bg-white/70"
                        />
                      </label>
                      <label className="flex flex-1 flex-col gap-1 text-xs text-rapunzel-plum/80">
                        {copy.recurrence}
                        <select
                          value={editRecurrence}
                          onChange={(e) =>
                            onEditRecurrence(e.target.value as TodoRecurrence)
                          }
                          className="h-10 rounded-xl border border-input bg-white/70 px-2 text-sm"
                        >
                          <option value="none">{copy.none}</option>
                          <option value="daily">{copy.daily}</option>
                          <option value="weekly">{copy.weekly}</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy || !editTitle.trim()}
                        onClick={() => onSaveEdit(todo)}
                        className="rounded-full bg-rapunzel-gold text-rapunzel-ink hover:bg-rapunzel-gold-deep"
                      >
                        {copy.save}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={onCancelEdit}
                      >
                        {copy.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className="mt-0.5 text-rapunzel-plum/45"
                        aria-label={copy.dragHandle}
                        title={copy.dragHandle}
                      >
                        <GripVertical className="size-4" />
                      </span>
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
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {renderActions(todo)}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
