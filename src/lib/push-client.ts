import {
  DEFAULT_NOTIFICATION_PREFS,
  normalizeNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/notifications";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  const res = await fetch("/api/push/prefs", { cache: "no-store" });
  if (!res.ok) return DEFAULT_NOTIFICATION_PREFS;
  const data = (await res.json()) as { prefs?: Partial<NotificationPrefs> };
  return normalizeNotificationPrefs(data.prefs);
}

export async function saveNotificationPrefs(
  prefs: NotificationPrefs
): Promise<NotificationPrefs> {
  const res = await fetch("/api/push/prefs", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || `Could not save prefs (${res.status})`);
  }
  const data = (await res.json()) as { prefs?: Partial<NotificationPrefs> };
  return normalizeNotificationPrefs(data.prefs);
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

export async function enablePush(
  prefs: NotificationPrefs
): Promise<NotificationPrefs> {
  if (!pushSupported()) {
    throw new Error("Push is not supported in this browser.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const vapidRes = await fetch("/api/push/vapid", { cache: "no-store" });
  if (!vapidRes.ok) {
    throw new Error("Push is not configured on the server.");
  }
  const vapid = (await vapidRes.json()) as { publicKey?: string };
  if (!vapid.publicKey) {
    throw new Error("Missing VAPID public key.");
  }

  const registration = await getRegistration();
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid.publicKey) as BufferSource,
    });
  }

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      prefs: { ...prefs, enabled: true },
    }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || `Could not subscribe (${res.status})`);
  }
  const data = (await res.json()) as { prefs?: Partial<NotificationPrefs> };
  return normalizeNotificationPrefs(data.prefs);
}

export async function disablePush(
  prefs: NotificationPrefs
): Promise<NotificationPrefs> {
  if (pushSupported()) {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const endpoint = subscription.endpoint;
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint, disable: true }),
        });
        await subscription.unsubscribe().catch(() => undefined);
      }
    } catch {
      /* still save disabled prefs */
    }
  }

  return saveNotificationPrefs({ ...prefs, enabled: false });
}
