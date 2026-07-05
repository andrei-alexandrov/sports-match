/**
 * "Sat, 11 Jul · 10:30" — local time, matching the chat's terse date voice.
 *
 * `toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })`
 * renders as either "Sat, 11 Jul" or "Sat 11 Jul" depending on the runtime's ICU
 * data. Stripping any comma first and then inserting one after the weekday
 * normalizes both variants to the same deterministic output.
 */
export function formatEventDate(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day.replace(",", "").replace(" ", ", ")} · ${time}`;
}
