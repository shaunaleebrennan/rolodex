import { createHash } from "node:crypto";
import { z } from "zod";
import type { Snapshot } from "../shared/model.js";
import { InputError, type Store } from "./store.js";
export const embeddingModel = "text-embedding-3-small";
export const dimensions = 1536;
export const vectorIndex = "relationship_memory_v1";
export type Memory = {
  id: string;
  personId: string;
  label: string;
  text: string;
  hash: string;
};
export type MemoryMatch = {
  personId: string;
  name: string;
  evidence: { label: string; text: string }[];
};
export function memories(data: Snapshot): Memory[] {
  const rows: Omit<Memory, "hash">[] = [];
  for (const p of data.people) {
    const text = [p.title, p.company, ...p.tags, p.notes]
      .filter(Boolean)
      .join("\n");
    if (text)
      rows.push({
        id: `people:${p.id}`,
        personId: p.id,
        label: "Profile notes and work",
        text,
      });
    for (const kind of ["interactions", "facts", "news"] as const) {
      for (const r of data[kind].filter((r) => r.personId === p.id)) {
        const text = "notes" in r ? r.notes : r.text;
        if (text.trim())
          rows.push({
            id: `${kind}:${r.id}`,
            personId: p.id,
            label: `${kind}${"date" in r ? ` · ${r.date}` : ""}`,
            text,
          });
      }
    }
  }
  // Bound individual chunks for embedding input limits; preserve exact excerpts.
  return rows.flatMap((r) =>
    Array.from({ length: Math.ceil(r.text.length / 1200) }, (_, i) => {
      const text = r.text.slice(i * 1200, (i + 1) * 1200);
      return {
        ...r,
        id: `${r.id}:${i}`,
        text,
        hash: createHash("sha256")
          .update(r.label + "\n" + text)
          .digest("hex"),
      };
    }),
  );
}
export async function embed(
  text: string,
  key: string,
  fetcher: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetcher("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: embeddingModel, input: text, dimensions }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new InputError("Embedding service unavailable. Try again shortly.");
  }
  if (!response.ok)
    throw new InputError(
      response.status === 401
        ? "The embedding key was not accepted. Check OPENAI_API_KEY locally."
        : response.status === 429
          ? "Embedding limit reached. Check API billing or try later."
          : "Embedding service unavailable. Try again shortly.",
    );
  const body = await response.json();
  const parsed = z
    .array(z.number().finite())
    .length(dimensions)
    .safeParse(body.data?.[0]?.embedding);
  if (!parsed.success)
    throw new InputError("The embedding service returned an invalid vector.");
  return parsed.data;
}
export function verifiedMatches(
  rows: { id: string; hash: string }[],
  data: Snapshot,
): MemoryMatch[] {
  const current = new Map(memories(data).map((m) => [m.id, m]));
  const found = new Map<string, MemoryMatch>();
  for (const row of rows) {
    const m = current.get(row.id);
    if (!m || m.hash !== row.hash) continue; // Never surface deleted or stale excerpts.
    const p = data.people.find((p) => p.id === m.personId);
    if (!p) continue;
    if (!found.has(p.id) && found.size < 5)
      found.set(p.id, { personId: p.id, name: p.name, evidence: [] });
    const match = found.get(p.id);
    if (match && match.evidence.length < 3)
      match.evidence.push({ label: m.label, text: m.text });
  }
  return [...found.values()];
}
export async function searchMemory(
  store: Store,
  input: unknown,
  config: { key?: string; fetcher?: typeof fetch } = {},
) {
  const { query, shareContext } = z
    .object({
      query: z.string().trim().min(1).max(1000),
      shareContext: z.boolean().default(false),
    })
    .parse(input);
  if (!shareContext)
    throw new InputError(
      "Allow sharing this query with OpenAI to search by meaning.",
    );
  if (store.mode !== "mongodb")
    throw new InputError(
      "Find by memory needs MongoDB Atlas. Ordinary contact search still works in local demo mode.",
    );
  if (!config.key)
    throw new InputError(
      "Set OPENAI_API_KEY locally to enable Find by memory.",
    );
  await store.requireMemoryIndex();
  const vector = await embed(query, config.key, config.fetcher);
  const rows = await store.vectorMemories(vector);
  return verifiedMatches(rows, await store.snapshot());
}
