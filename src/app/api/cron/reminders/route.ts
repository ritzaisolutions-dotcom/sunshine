import { NextRequest, NextResponse } from "next/server";
import {
  normalizeNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications";
import { getSupabase } from "@/lib/supabase";
import { mapDbTodo, type SunshineTodo } from "@/lib/todos";
import { sunshineVaultKey } from "@/lib/vault-key";
import { sendPushToVault } from "@/lib/web-push";

export const runtime = "nodejs";

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret) {
    const auth = req.headers.get("authorization");
    return auth === `Bearer ${secret}`;
  }
  // Fallback when CRON_SECRET is not set yet: trust Vercel's cron header only.
  return req.headers.get("x-vercel-cron") === "1";
}

function pickDueForPush(items: SunshineTodo[]): SunshineTodo[] {
  const now = Date.now();
  return items
    .filter(
      (todo) =>
        todo.status === "open" &&
        todo.dueAt &&
        new Date(todo.dueAt).getTime() <= now &&
        (!todo.remindedAt ||
          now - new Date(todo.remindedAt).getTime() >= 24 * 60 * 60 * 1000)
    )
    .sort(
      (a, b) =>
        new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()
    );
}

async function runReminders() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured." },
      { status: 503 }
    );
  }

  const key = sunshineVaultKey();
  const prefsRes = await supabase.rpc("sunshine_notification_prefs_get", {
    p_key: key,
  });
  if (prefsRes.error) {
    return NextResponse.json({ error: prefsRes.error.message }, { status: 502 });
  }

  const prefs = normalizeNotificationPrefs(
    prefsRes.data as Partial<NotificationPrefs>
  );
  if (!prefs.enabled || !prefs.dueTodos) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: prefs.enabled ? "dueTodos_off" : "push_disabled",
    });
  }

  const listRes = await supabase.rpc("sunshine_todos_list", { p_key: key });
  if (listRes.error) {
    return NextResponse.json({ error: listRes.error.message }, { status: 502 });
  }

  const payload = listRes.data as { items?: unknown[] };
  const items = (Array.isArray(payload.items) ? payload.items : [])
    .map((row) => mapDbTodo(row as Record<string, unknown>))
    .filter((row): row is SunshineTodo => Boolean(row));

  const due = pickDueForPush(items);
  if (!due.length) {
    return NextResponse.json({ ok: true, due: 0, sent: 0 });
  }

  const title = due.length === 1 ? "Denk daran" : `${due.length} To-dos fällig`;
  const body =
    due.length === 1
      ? due[0]!.title
      : due
          .slice(0, 3)
          .map((todo) => todo.title)
          .join(" · ");

  const push = await sendPushToVault({
    title,
    body,
    url: "/todos",
    tag: "sunshine-due-todos",
  });

  const remindedAt = new Date().toISOString();
  await Promise.all(
    due.map((todo) =>
      supabase.rpc("sunshine_todos_set_status", {
        p_key: key,
        p_id: todo.id,
        p_status: todo.status,
        p_due_at: null,
        p_reminded_at: remindedAt,
        p_clear_reminded: false,
      })
    )
  );

  return NextResponse.json({
    ok: true,
    due: due.length,
    sent: push.sent,
    removed: push.removed,
  });
}

export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return runReminders();
}

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return runReminders();
}
