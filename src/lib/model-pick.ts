/** Pick a Mistral chat model from the latest thing Noorie asked. */
export function pickChatModel(lastUserText: string): string {
  const t = lastUserText.trim().toLowerCase();
  if (!t) return "mistral-small-latest";

  const hard =
    t.length > 280 ||
    /\b(homework|essay|prove|solve|equation|calculate|grammar|rewrite|improve|analyse|analyze|thesis|paragraph|compare|difference|explain|why does|how does|step by step|show your work|correct my)\b/.test(
      t
    );

  return hard ? "mistral-medium-latest" : "mistral-small-latest";
}

/** True when the question likely needs today's facts from the open web. */
export function needsWebLookup(lastUserText: string): boolean {
  const t = lastUserText.trim().toLowerCase();
  if (!t) return false;
  return /\b(today|tonight|yesterday|this week|this year|latest|current|currently|right now|news|weather|who won|score|price of|stock|election|released|breaking)\b/.test(
    t
  );
}
