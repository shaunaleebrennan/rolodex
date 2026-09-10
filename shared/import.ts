import Papa from "papaparse";
import ICAL from "ical.js";
export type ImportRow = Record<string, string>;
export function parseContacts(
  content: string,
  filename: string,
): { headers: string[]; rows: ImportRow[] } {
  if (content.length > 2_000_000)
    throw new Error("Choose a file smaller than 2 MB");
  if (filename.toLowerCase().endsWith(".vcf")) {
    const cards = content.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) || [];
    if (!cards.length) throw new Error("No vCards found");
    const rows = cards.map((card) => {
      const c = new ICAL.Component(ICAL.parse(card));
      const get = (key: string) => c.getFirstPropertyValue(key);
      const n = get("n") as any;
      const org = get("org") as any;
      return {
        name: String(
          get("fn") || (Array.isArray(n) ? [n[1], n[0]].join(" ") : ""),
        ),
        email: String(get("email") || ""),
        phone: String(get("tel") || "").replace(/^tel:/, ""),
        company: Array.isArray(org) ? org.join(" ") : String(org || ""),
        title: String(get("title") || ""),
        notes: String(get("note") || ""),
      };
    });
    return {
      headers: ["name", "email", "phone", "company", "title", "notes"],
      rows,
    };
  }
  const result = Papa.parse<ImportRow>(content, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  if (result.errors.length)
    throw new Error("This CSV could not be read: " + result.errors[0].message);
  if (!result.data.length) throw new Error("This file has no contact rows");
  if (result.data.length > 1000)
    throw new Error("Import up to 1,000 contacts at a time");
  return { headers: result.meta.fields || [], rows: result.data };
}
export const normalized = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
export function duplicateOf(
  a: { name: string; email?: string },
  people: { name: string; email?: string }[],
) {
  return people.find(
    (p) =>
      (a.email && p.email && normalized(a.email) === normalized(p.email)) ||
      normalized(a.name) === normalized(p.name),
  );
}
