import webpush from "web-push";
import { getSupabase } from "@/lib/supabase";
import { sunshineVaultKey } from "@/lib/vault-key";

export type StoredPushSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function vapidConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured.");
  }
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:sunshine@local.dev";
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function sendPushToVault(input: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}): Promise<{ sent: number; removed: number }> {
  if (!vapidConfigured()) {
    return { sent: 0, removed: 0 };
  }

  const supabase = getSupabase();
  if (!supabase) return { sent: 0, removed: 0 };

  const key = sunshineVaultKey();
  const { data, error } = await supabase.rpc("sunshine_push_list", {
    p_key: key,
  });
  if (error) {
    throw new Error(error.message);
  }

  const payload = data as { items?: StoredPushSubscription[] };
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) return { sent: 0, removed: 0 };

  configureWebPush();
  const body = JSON.stringify({
    title: input.title,
    body: input.body,
    url: input.url ?? "/todos",
    tag: input.tag ?? "sunshine-reminder",
  });

  let sent = 0;
  let removed = 0;

  await Promise.all(
    items.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 }
        );
        sent += 1;
      } catch (err) {
        const statusCode =
          err && typeof err === "object" && "statusCode" in err
            ? Number((err as { statusCode?: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.rpc("sunshine_push_delete_endpoint", {
            p_endpoint: sub.endpoint,
          });
          removed += 1;
        }
      }
    })
  );

  return { sent, removed };
}
