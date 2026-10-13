/** One-line text for a job summary, e.g. "fetched 5 · covered posh-pocso 3". Nested objects are flattened one level. */
export function summaryText(s: unknown, sep = " · ") {
  if (!s || typeof s !== "object") return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(s as Record<string, unknown>)) {
    if (Array.isArray(v)) parts.push(`${k} ${v.join(", ") || "none"}`);
    else if (v && typeof v === "object") for (const [k2, v2] of Object.entries(v)) parts.push(`${k} ${k2} ${v2}`);
    else parts.push(`${k} ${v}`);
  }
  return parts.join(sep);
}
