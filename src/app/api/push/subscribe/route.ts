import { NextRequest, NextResponse } from "next/server";
import {
  isPushSubscriptionJSON,
  normalizeNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications";
import { getSupabase } from "@/lib/supabase";
import { sunshineVaultKey } from "@/lib/vault-key";

export async function POST(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured." },
      { status: 503 }
    );
  }

  let body: {
    subscription?: unknown;
    prefs?: Partial<NotificationPrefs>;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isPushSubscriptionJSON(body.subscription)) {
    return NextResponse.json(
      { error: "Valid push subscription required." },
      { status: 400 }
    );
  }

  const key = sunshineVaultKey();
  const prefs = normalizeNotificationPrefs({
    ...body.prefs,
    enabled: true,
  });

  const [subRes, prefsRes] = await Promise.all([
    supabase.rpc("sunshine_push_subscribe", {
      p_key: key,
      p_endpoint: body.subscription.endpoint,
      p_p256dh: body.subscription.keys.p256dh,
      p_auth: body.subscription.keys.auth,
      p_user_agent: req.headers.get("user-agent") ?? null,
    }),
    supabase.rpc("sunshine_notification_prefs_upsert", {
      p_key: key,
      p_enabled: prefs.enabled,
      p_due_todos: prefs.dueTodos,
      p_water: prefs.water,
    }),
  ]);

  if (subRes.error) {
    return NextResponse.json({ error: subRes.error.message }, { status: 502 });
  }
  if (prefsRes.error) {
    return NextResponse.json({ error: prefsRes.error.message }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    prefs: normalizeNotificationPrefs(
      prefsRes.data as Partial<NotificationPrefs>
    ),
  });
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured." },
      { status: 503 }
    );
  }

  let body: { endpoint?: string; disable?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required." }, { status: 400 });
  }

  const key = sunshineVaultKey();
  const { error } = await supabase.rpc("sunshine_push_unsubscribe", {
    p_key: key,
    p_endpoint: endpoint,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  if (body.disable) {
    const current = await supabase.rpc("sunshine_notification_prefs_get", {
      p_key: key,
    });
    const prefs = normalizeNotificationPrefs(
      current.data as Partial<NotificationPrefs>
    );
    await supabase.rpc("sunshine_notification_prefs_upsert", {
      p_key: key,
      p_enabled: false,
      p_due_todos: prefs.dueTodos,
      p_water: prefs.water,
    });
  }

  return NextResponse.json({ ok: true });
}
