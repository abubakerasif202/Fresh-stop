import { parseDollarsToCents } from "./admin-pricing";

export interface ImportedPrice { slug: string; priceCents: number }

/** Strict CSV parser supporting spreadsheet quotes, commas and CRLF. */
export function parsePricingCsv(input: unknown): ImportedPrice[] {
  if (typeof input !== "string" || Buffer.byteLength(input) > 200_000) throw new Error("Choose a CSV file smaller than 200 KB.");
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === "," || c === "\n" || c === "\r") {
      row.push(cell); cell = ""; closed = false;
      if (c !== ",") { if (row.some((v) => v.trim())) rows.push(row); row = []; if (c === "\r" && text[i + 1] === "\n") i++; }
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if (closed || c === '"') throw new Error("Invalid CSV quoting.");
    else cell += c;
  }
  if (quoted) throw new Error("Invalid CSV: unclosed quote.");
  row.push(cell); if (row.some((v) => v.trim())) rows.push(row);
  const headers = rows.shift()?.map((h) => h.trim());
  if (!headers || new Set(headers).size !== headers.length) throw new Error("CSV headers are missing or duplicated.");
  const slugIndex = headers.indexOf("Slug");
  const priceIndex = headers.indexOf("Suggested Price AUD");
  if (slugIndex < 0 || priceIndex < 0) throw new Error("CSV needs Slug and Suggested Price AUD columns. Use Export CSV as the template.");
  if (!rows.length || rows.length > 200) throw new Error("Import between 1 and 200 product rows.");
  const seen = new Set<string>();
  return rows.map((values, i) => {
    const slug = values[slugIndex]?.trim() ?? "";
    const parsed = parseDollarsToCents(values[priceIndex]);
    if (values.length !== headers.length || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160 || seen.has(slug)) throw new Error(`Row ${i + 2}: invalid or duplicate product slug, or inconsistent columns.`);
    if (!parsed.ok) throw new Error(`Row ${i + 2}: ${parsed.error}`);
    seen.add(slug);
    return { slug, priceCents: parsed.cents };
  });
}
