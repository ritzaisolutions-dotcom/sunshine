export const ACCESS_COOKIE = "sunshine_gate";
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

export function getAccessKeyword(): string | null {
  const key = process.env.SUNSHINE_ACCESS_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function accessGateRequired(): boolean {
  return Boolean(getAccessKeyword());
}

export async function accessCookieValue(keyword: string): Promise<string> {
  const data = new TextEncoder().encode(`sunshine-gate:v1:${keyword}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function keywordsMatch(provided: string, expected: string): boolean {
  const a = provided.trim();
  const b = expected.trim();
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
