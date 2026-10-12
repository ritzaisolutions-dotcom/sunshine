import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import {
  mapDbTodo,
  nextDueAt,
  type SunshineTodo,
  type TodoRecurrence,
  type TodoSource,
  type TodoStatus,
} from "@/lib/todos";
import { sunshineVaultKey } from "@/lib/vault-key";

function parseStatus(value: unknown): TodoStatus | null {
  if (value === "open" || value === "done" || value === "suggested") return value;
  return null;
}

function parseSource(value: unknown): TodoSource | null {
  if (value === "noorie" || value === "maria") return value;
  return null;
}

function parseRecurrence(value: unknown): TodoRecurrence | null {
  if (value === "none" || value === "daily" || value === "weekly") return value;
  return null;
}

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured.", items: [] },
      { status: 503 }
    );
  }

  const { data, error } = await supabase.rpc("sunshine_todos_list", {
    p_key: sunshineVaultKey(),
  });
  if (error) {
    return NextResponse.json({ error: error.message, items: [] }, { status: 502 });
  }

  const payload = data as { items?: unknown };
  const raw = Array.isArray(payload?.items) ? payload.items : [];
  const items = raw
    .map((row) => mapDbTodo(row as Record<string, unknown>))
    .filter((row): row is SunshineTodo => Boolean(row));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured." },
      { status: 503 }
    );
  }

  let body: {
    title?: string;
    status?: TodoStatus;
    source?: TodoSource;
    dueAt?: string | null;
    recurrence?: TodoRecurrence;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Title required." }, { status: 400 });
  }

  const status = parseStatus(body.status) ?? "open";
  const source = parseSource(body.source) ?? "noorie";
  const recurrence = parseRecurrence(body.recurrence) ?? "none";
  const dueAt = body.dueAt ? new Date(body.dueAt).toISOString() : null;

  const { data, error } = await supabase.rpc("sunshine_todos_upsert", {
    p_key: sunshineVaultKey(),
    p_id: null,
    p_title: title,
    p_status: status,
    p_source: source,
    p_due_at: dueAt,
    p_recurrence: recurrence,
    p_reminded_at: null,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const item = mapDbTodo(data as Record<string, unknown>);
  if (!item) {
    return NextResponse.json({ error: "Could not create todo." }, { status: 502 });
  }
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured." },
      { status: 503 }
    );
  }

  let body: {
    id?: string;
    status?: TodoStatus;
    title?: string;
    dueAt?: string | null;
    recurrence?: TodoRecurrence;
    source?: TodoSource;
    remindedAt?: string | null;
    clearReminded?: boolean;
    completeRecurring?: boolean;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "id required." }, { status: 400 });
  }

  const key = sunshineVaultKey();

  // Full field update when title/recurrence/source provided.
  if (
    body.title != null ||
    body.recurrence != null ||
    body.source != null ||
    (body.dueAt !== undefined && body.status == null && !body.completeRecurring)
  ) {
    const list = await supabase.rpc("sunshine_todos_list", { p_key: key });
    if (list.error) {
      return NextResponse.json({ error: list.error.message }, { status: 502 });
    }
    const payload = list.data as { items?: unknown[] };
    const existingRaw = (Array.isArray(payload.items) ? payload.items : []).find(
      (row) => (row as { id?: string }).id === id
    ) as Record<string, unknown> | undefined;
    const existing = existingRaw ? mapDbTodo(existingRaw) : null;
    if (!existing) {
      return NextResponse.json({ error: "Todo not found." }, { status: 404 });
    }

    const { data, error } = await supabase.rpc("sunshine_todos_upsert", {
      p_key: key,
      p_id: id,
      p_title: body.title?.trim() || existing.title,
      p_status: parseStatus(body.status) ?? existing.status,
      p_source: parseSource(body.source) ?? existing.source,
      p_due_at:
        body.dueAt === undefined
          ? existing.dueAt
          : body.dueAt
            ? new Date(body.dueAt).toISOString()
            : null,
      p_recurrence: parseRecurrence(body.recurrence) ?? existing.recurrence,
      p_reminded_at: body.clearReminded
        ? null
        : body.remindedAt !== undefined
          ? body.remindedAt
          : existing.remindedAt,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    const item = mapDbTodo(data as Record<string, unknown>);
    if (!item) {
      return NextResponse.json({ error: "Could not update todo." }, { status: 502 });
    }
    return NextResponse.json(item);
  }

  // Status / remind / complete-with-recurrence path.
  const list = await supabase.rpc("sunshine_todos_list", { p_key: key });
  if (list.error) {
    return NextResponse.json({ error: list.error.message }, { status: 502 });
  }
  const payload = list.data as { items?: unknown[] };
  const existingRaw = (Array.isArray(payload.items) ? payload.items : []).find(
    (row) => (row as { id?: string }).id === id
  ) as Record<string, unknown> | undefined;
  const existing = existingRaw ? mapDbTodo(existingRaw) : null;
  if (!existing) {
    return NextResponse.json({ error: "Todo not found." }, { status: 404 });
  }

  const nextStatus = parseStatus(body.status) ?? existing.status;

  if (body.completeRecurring && nextStatus === "done" && existing.recurrence !== "none") {
    // Mark current cycle done, then insert next open occurrence.
    const doneRes = await supabase.rpc("sunshine_todos_set_status", {
      p_key: key,
      p_id: id,
      p_status: "done",
      p_due_at: existing.dueAt,
      p_reminded_at: null,
      p_clear_reminded: true,
    });
    if (doneRes.error) {
      return NextResponse.json({ error: doneRes.error.message }, { status: 502 });
    }

    const nextDue = nextDueAt(existing.dueAt, existing.recurrence);
    const createRes = await supabase.rpc("sunshine_todos_upsert", {
      p_key: key,
      p_id: null,
      p_title: existing.title,
      p_status: "open",
      p_source: existing.source,
      p_due_at: nextDue,
      p_recurrence: existing.recurrence,
      p_reminded_at: null,
    });
    if (createRes.error) {
      return NextResponse.json({ error: createRes.error.message }, { status: 502 });
    }
    const created = mapDbTodo(createRes.data as Record<string, unknown>);
    const done = mapDbTodo(doneRes.data as Record<string, unknown>);
    return NextResponse.json(created ?? done);
  }

  const { data, error } = await supabase.rpc("sunshine_todos_set_status", {
    p_key: key,
    p_id: id,
    p_status: nextStatus,
    p_due_at:
      body.dueAt === undefined
        ? null
        : body.dueAt
          ? new Date(body.dueAt).toISOString()
          : null,
    p_reminded_at: body.remindedAt ?? null,
    p_clear_reminded: Boolean(body.clearReminded),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const item = mapDbTodo(data as Record<string, unknown>);
  if (!item) {
    return NextResponse.json({ error: "Could not update todo." }, { status: 502 });
  }
  return NextResponse.json(item);
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured." },
      { status: 503 }
    );
  }

  let body: { ids?: unknown };
  try {
    body = (await req.json()) as { ids?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  if (!ids.length) {
    return NextResponse.json({ error: "ids required." }, { status: 400 });
  }

  const { error } = await supabase.rpc("sunshine_todos_reorder", {
    p_key: sunshineVaultKey(),
    p_ids: ids,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured." },
      { status: 503 }
    );
  }

  let body: { id?: string };
  try {
    body = (await req.json()) as { id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const id = body.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "id required." }, { status: 400 });
  }

  const { error } = await supabase.rpc("sunshine_todos_delete", {
    p_key: sunshineVaultKey(),
    p_id: id,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
