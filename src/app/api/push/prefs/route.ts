import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_NOTIFICATION_PREFS,
  normalizeNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications";
import { getSupabase } from "@/lib/supabase";
import { sunshineVaultKey } from "@/lib/vault-key";

export async function GET() {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured.", prefs: DEFAULT_NOTIFICATION_PREFS },
      { status: 503 }
    );
  }

  const { data, error } = await supabase.rpc("sunshine_notification_prefs_get", {
    p_key: sunshineVaultKey(),
  });
  if (error) {
    return NextResponse.json(
      { error: error.message, prefs: DEFAULT_NOTIFICATION_PREFS },
      { status: 502 }
    );
  }

  return NextResponse.json({
    prefs: normalizeNotificationPrefs(data as Partial<NotificationPrefs>),
  });
}

export async function PUT(req: NextRequest) {
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Cloud sync is not configured." },
      { status: 503 }
    );
  }

  let body: Partial<NotificationPrefs>;
  try {
    body = (await req.json()) as Partial<NotificationPrefs>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prefs = normalizeNotificationPrefs(body);
  const { data, error } = await supabase.rpc(
    "sunshine_notification_prefs_upsert",
    {
      p_key: sunshineVaultKey(),
      p_enabled: prefs.enabled,
      p_due_todos: prefs.dueTodos,
      p_water: prefs.water,
    }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({
    prefs: normalizeNotificationPrefs(data as Partial<NotificationPrefs>),
  });
}
