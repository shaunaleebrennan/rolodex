import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../server/store.js";
import {
  memories,
  verifiedMatches,
  searchMemory,
  embed,
  dimensions,
} from "../server/semantic.js";
test("memory excerpts exclude dedicated sensitive fields and reject changed or deleted evidence", async () => {
  const s = await new Store({ file: ":memory:" }).open();
  try {
    const p = await s.save("people", {
      name: "Alex",
      email: "private@example.com",
      phone: "secret-phone",
      notes: "Launched a conversational software product.",
    });
    const n = await s.save("news", {
      personId: p.id,
      text: "Starting a consultancy",
      date: "2026-01-01",
    });
    const data = await s.snapshot();
    const docs = memories(data);
    assert.equal(docs.length, 2);
    assert.ok(!JSON.stringify(docs).includes("private@example.com"));
    assert.ok(!JSON.stringify(docs).includes("secret-phone"));
    assert.equal(verifiedMatches(docs, data)[0].evidence.length, 2);
    await s.save("people", { ...p, notes: "Updated details" }, p.id);
    await s.remove("news", n.id);
    assert.deepEqual(verifiedMatches(docs, await s.snapshot()), []);
    await s.remove("people", p.id);
    assert.deepEqual(verifiedMatches(docs, await s.snapshot()), []);
  } finally {
    await s.close();
  }
});
test("semantic search checks consent and index before making an embedding request", async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    throw new Error("must not call");
  }) as typeof fetch;
  const local = new Store();
  await assert.rejects(
    searchMemory(local, { query: "founder" }, { key: "test", fetcher }),
    /Allow sharing/,
  );
  await assert.rejects(
    searchMemory(
      local,
      { query: "founder", shareContext: true },
      { key: "test", fetcher },
    ),
    /needs MongoDB/,
  );
  const unavailable = {
    mode: "mongodb",
    requireMemoryIndex: async () => {
      throw new Error("not ready");
    },
  } as unknown as Store;
  await assert.rejects(
    searchMemory(
      unavailable,
      { query: "founder", shareContext: true },
      { key: "test", fetcher },
    ),
    /not ready/,
  );
  assert.equal(calls, 0);
});
test("embedding failures are sanitized and vector dimensions are validated", async () => {
  const invalid = (async () =>
    new Response(
      JSON.stringify({ data: [{ embedding: [1] }] }),
    )) as typeof fetch;
  await assert.rejects(embed("hello", "test", invalid), /invalid vector/);
  const failed = (async () =>
    new Response("secret provider response", { status: 401 })) as typeof fetch;
  await assert.rejects(embed("hello", "test", failed), /key was not accepted/);
  const valid = (async (_u, init) => {
    const body = JSON.parse(init?.body as string);
    assert.equal(body.dimensions, dimensions);
    return new Response(
      JSON.stringify({ data: [{ embedding: Array(dimensions).fill(0.1) }] }),
    );
  }) as typeof fetch;
  assert.equal((await embed("hello", "test", valid)).length, dimensions);
});
test("semantic retrieval sends vector to store and returns only current source excerpts", async () => {
  const s = await new Store({ file: ":memory:" }).open();
  try {
    await s.save("people", {
      name: "Alex",
      notes: "Leaving employment to launch a consultancy.",
    });
    const data = await s.snapshot();
    const fake = {
      mode: "mongodb",
      requireMemoryIndex: async () => {},
      snapshot: async () => data,
      vectorMemories: async (v: number[]) => {
        assert.equal(v.length, dimensions);
        return memories(data);
      },
    } as unknown as Store;
    const fetcher = (async () =>
      new Response(
        JSON.stringify({ data: [{ embedding: Array(dimensions).fill(0.1) }] }),
      )) as typeof fetch;
    const results = await searchMemory(
      fake,
      { query: "starting their own business", shareContext: true },
      { key: "test", fetcher },
    );
    assert.equal(results[0].name, "Alex");
    assert.equal(
      results[0].evidence[0].text,
      "Leaving employment to launch a consultancy.",
    );
  } finally {
    await s.close();
  }
});
