export type TodoStatus = "open" | "done" | "suggested";
export type TodoSource = "noorie" | "maria";
export type TodoRecurrence = "none" | "daily" | "weekly";

export type SunshineTodo = {
  id: string;
  title: string;
  status: TodoStatus;
  source: TodoSource;
  dueAt: string | null;
  recurrence: TodoRecurrence;
  remindedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TodoAddAction = {
  op: "add";
  title: string;
  dueAt?: string | null;
  /** Relative reminder: minutes from now (preferred for "in X minutes"). */
  dueInMinutes?: number | null;
  recurrence?: TodoRecurrence;
  suggested?: boolean;
};

export type TodoCompleteAction = {
  op: "complete";
  title: string;
  id?: string;
};

export type TodoListAction = {
  op: "list";
};

export type TodoAction = TodoAddAction | TodoCompleteAction | TodoListAction;

type DbTodo = {
  id?: string;
  title?: string;
  status?: string;
  source?: string;
  due_at?: string | null;
  recurrence?: string;
  reminded_at?: string | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

function asStatus(value: unknown): TodoStatus {
  if (value === "done" || value === "suggested" || value === "open") return value;
  return "open";
}

function asSource(value: unknown): TodoSource {
  return value === "maria" ? "maria" : "noorie";
}

function asRecurrence(value: unknown): TodoRecurrence {
  if (value === "daily" || value === "weekly" || value === "none") return value;
  return "none";
}

export function mapDbTodo(row: DbTodo): SunshineTodo | null {
  if (!row.id || typeof row.title !== "string" || !row.title.trim()) return null;
  return {
    id: row.id,
    title: row.title.trim(),
    status: asStatus(row.status),
    source: asSource(row.source),
    dueAt: row.due_at ?? null,
    recurrence: asRecurrence(row.recurrence),
    remindedAt: row.reminded_at ?? null,
    sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export function nextDueAt(
  current: string | null,
  recurrence: TodoRecurrence,
  from = new Date()
): string | null {
  if (recurrence === "none") return current;
  const base = current ? new Date(current) : from;
  const start = Number.isNaN(base.getTime()) ? from : base;
  const next = new Date(start);
  if (recurrence === "daily") {
    next.setDate(next.getDate() + 1);
  } else {
    next.setDate(next.getDate() + 7);
  }
  // If still in the past relative to now, keep stepping forward.
  while (next.getTime() <= from.getTime()) {
    if (recurrence === "daily") next.setDate(next.getDate() + 1);
    else next.setDate(next.getDate() + 7);
  }
  return next.toISOString();
}

export function formatTodosForPrompt(todos: SunshineTodo[]): string {
  const open = todos.filter((t) => t.status === "open");
  const suggested = todos.filter((t) => t.status === "suggested");
  if (!open.length && !suggested.length) {
    return "Open todos: (none). Suggested: (none).";
  }
  const line = (t: SunshineTodo) => {
    const due = t.dueAt ? ` due ${t.dueAt}` : "";
    const rec = t.recurrence !== "none" ? ` [${t.recurrence}]` : "";
    return `- ${t.title}${due}${rec}`;
  };
  return [
    open.length ? `Open todos:\n${open.map(line).join("\n")}` : "Open todos: (none).",
    suggested.length
      ? `Maria suggested:\n${suggested.map(line).join("\n")}`
      : "Maria suggested: (none).",
  ].join("\n");
}

/** Client helpers talking to /api/todos */
export async function fetchTodos(): Promise<SunshineTodo[]> {
  const res = await fetch("/api/todos", { method: "GET", cache: "no-store" });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || `Could not load todos (${res.status})`);
  }
  const data = (await res.json()) as { items?: SunshineTodo[] };
  return Array.isArray(data.items) ? data.items : [];
}

export async function createTodo(input: {
  title: string;
  status?: TodoStatus;
  source?: TodoSource;
  dueAt?: string | null;
  recurrence?: TodoRecurrence;
}): Promise<SunshineTodo> {
  const res = await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || `Could not create todo (${res.status})`);
  }
  return (await res.json()) as SunshineTodo;
}

export async function patchTodo(
  id: string,
  patch: {
    status?: TodoStatus;
    title?: string;
    dueAt?: string | null;
    recurrence?: TodoRecurrence;
    source?: TodoSource;
    remindedAt?: string | null;
    clearReminded?: boolean;
    completeRecurring?: boolean;
  }
): Promise<SunshineTodo> {
  const res = await fetch("/api/todos", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...patch }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || `Could not update todo (${res.status})`);
  }
  return (await res.json()) as SunshineTodo;
}

export async function deleteTodo(id: string): Promise<void> {
  const res = await fetch("/api/todos", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || `Could not delete todo (${res.status})`);
  }
}

export async function reorderTodos(ids: string[]): Promise<void> {
  const res = await fetch("/api/todos", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || `Could not reorder todos (${res.status})`);
  }
}

export async function applyTodoActions(
  actions: TodoAction[]
): Promise<SunshineTodo[]> {
  let items = await fetchTodos();
  for (const action of actions) {
    if (action.op === "list") continue;
    if (action.op === "add") {
      const title = action.title?.trim();
      if (!title) continue;
      const dueAt =
        typeof action.dueInMinutes === "number" &&
        Number.isFinite(action.dueInMinutes) &&
        action.dueInMinutes > 0
          ? new Date(Date.now() + action.dueInMinutes * 60_000).toISOString()
          : (action.dueAt ?? null);
      await createTodo({
        title,
        status: action.suggested ? "suggested" : "open",
        source: "maria",
        dueAt,
        recurrence: action.recurrence ?? "none",
      });
      continue;
    }
    if (action.op === "complete") {
      const needle = action.title?.trim().toLowerCase();
      const match =
        (action.id && items.find((t) => t.id === action.id)) ||
        items.find(
          (t) =>
            t.status === "open" &&
            needle &&
            t.title.toLowerCase() === needle
        ) ||
        items.find(
          (t) =>
            t.status === "open" &&
            needle &&
            t.title.toLowerCase().includes(needle)
        );
      if (!match) continue;
      await patchTodo(match.id, {
        status: "done",
        completeRecurring: match.recurrence !== "none",
      });
    }
  }
  items = await fetchTodos();
  return items;
}
