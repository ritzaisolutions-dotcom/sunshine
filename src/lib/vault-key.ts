/** Server-only single-user vault key (shared by chats vault + todos). */
export function sunshineVaultKey(): string {
  const key = process.env.SUNSHINE_VAULT_KEY?.trim();
  return key && key.length >= 8 ? key : "sunshine-noorie-primary";
}
