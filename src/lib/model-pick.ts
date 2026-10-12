const HARD_EN =
  /\b(homework|essay|prove|solve|equation|calculate|grammar|rewrite|improve|analyse|analyze|thesis|paragraph|compare|difference|explain|why does|how does|step by step|show your work|correct my)\b/;

const HARD_DE =
  /\b(hausaufgaben|hausaufgabe|aufsatz|gleichung|berechne|berechnen|grammatik|umschreiben|verbessere|analysiere|absatz|vergleiche|unterschied|korrigiere|beweise)\b/;

const WEB_EN =
  /\b(today|tonight|yesterday|this week|this year|latest|current|currently|right now|news|weather|who won|score|price of|stock|election|released|breaking)\b/;

const WEB_DE =
  /\b(heute|gestern|aktuell|nachrichten|wetter|preis|wahl|spielstand)\b/;

/** Pick a Mistral chat model from the latest thing Noorie asked. */
export function pickChatModel(lastUserText: string): string {
  const t = lastUserText.trim().toLowerCase();
  if (!t) return "mistral-small-latest";

  const hard =
    t.length > 280 ||
    HARD_EN.test(t) ||
    HARD_DE.test(t) ||
    t.includes("erklär") ||
    t.includes("erklaer") ||
    t.includes("schritt für schritt") ||
    t.includes("schritt fuer schritt");

  return hard ? "mistral-medium-latest" : "mistral-small-latest";
}

/** True when the question likely needs today's facts from the open web. */
export function needsWebLookup(lastUserText: string): boolean {
  const t = lastUserText.trim().toLowerCase();
  if (!t) return false;
  return (
    WEB_EN.test(t) ||
    WEB_DE.test(t) ||
    /wer hat gewonnen|diese woche|dieses jahr/.test(t)
  );
}
