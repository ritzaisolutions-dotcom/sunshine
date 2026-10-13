export type NotificationPrefs = {
  enabled: boolean;
  dueTodos: boolean;
  water: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  dueTodos: true,
  water: false,
};

export function normalizeNotificationPrefs(
  value: Partial<NotificationPrefs> | null | undefined
): NotificationPrefs {
  return {
    enabled: Boolean(value?.enabled),
    dueTodos: value?.dueTodos !== false,
    water: Boolean(value?.water),
  };
}

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export function isPushSubscriptionJSON(
  value: unknown
): value is PushSubscriptionJSON {
  if (!value || typeof value !== "object") return false;
  const row = value as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  return (
    typeof row.endpoint === "string" &&
    row.endpoint.length > 0 &&
    typeof row.keys?.p256dh === "string" &&
    row.keys.p256dh.length > 0 &&
    typeof row.keys?.auth === "string" &&
    row.keys.auth.length > 0
  );
}
