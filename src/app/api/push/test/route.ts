import { NextResponse } from "next/server";
import {
  normalizeNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications";
import { getSupabase } from "@/lib/supabase";
import { sunshineVaultKey } from "@/lib/vault-key";
import { sendPushToVault } from "@/lib/web-push";

export const runtime = "nodejs";

export async function POST() {
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
  if (!prefs.enabled) {
    return NextResponse.json(
      { error: "Push is not enabled in settings." },
      { status: 400 }
    );
  }

  const listRes = await supabase.rpc("sunshine_push_list", { p_key: key });
  if (listRes.error) {
    return NextResponse.json({ error: listRes.error.message }, { status: 502 });
  }
  const payload = listRes.data as { items?: unknown[] };
  const count = Array.isArray(payload.items) ? payload.items.length : 0;
  if (!count) {
    return NextResponse.json(
      {
        error:
          "No device subscribed yet. Turn push on again on this phone/browser.",
      },
      { status: 400 }
    );
  }

  const result = await sendPushToVault({
    title: "Sunshine",
    body: "Maria can reach you here — push works.",
    url: "/settings",
    tag: "sunshine-push-test",
  });

  return NextResponse.json({
    ok: true,
    devices: count,
    sent: result.sent,
    removed: result.removed,
  });
}
