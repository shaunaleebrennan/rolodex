import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../server/store.js";
import { respond } from "../server/assistant.js";
test("offline helper grounds suggestions in saved records and provides a draft", async () => {
  const s = await new Store({ file: ":memory:" }).open();
  try {
    const p = await s.save("people", { name: "Alex Test" });
    await s.save("news", {
      personId: p.id,
      text: "Started a new role",
      date: "2026-01-01",
    });
    const r = await respond(s, { question: "Who should I contact?" });
    assert.equal(r.mode, "offline");
    assert.ok(r.answer.includes("Started a new role"));
    assert.equal(r.sources[0].id, p.id);
    assert.ok(r.draft?.includes("Alex"));
    assert.equal((await s.list("interactions")).length, 0);
    await assert.rejects(
      respond(s, { question: "Hello", shareContext: false }, { key: "test" }),
      /Allow sharing/,
    );
  } finally {
    await s.close();
  }
});
test("AI uses bounded read-only tools and only cited records, with storage disabled", async () => {
  const s = await new Store({ file: ":memory:" }).open();
  try {
    const p = await s.save("people", { name: "Alex Test" });
    let calls = 0;
    const fetcher = (async (_url: any, init: any) => {
      const body = JSON.parse(init.body);
      assert.equal(body.store, false);
      calls++;
      return new Response(
        JSON.stringify(
          calls === 1
            ? {
                output: [
                  {
                    type: "function_call",
                    name: "get_relationship_context",
                    arguments: JSON.stringify({ personId: p.id }),
                    call_id: "1",
                  },
                ],
              }
            : {
                output: [
                  {
                    type: "message",
                    content: [
                      { type: "output_text", text: "Say hello to Alex." },
                    ],
                  },
                ],
              },
        ),
        { status: 200 },
      );
    }) as typeof fetch;
    const r = await respond(
      s,
      { question: "Prepare a catch-up", personId: p.id, shareContext: true },
      { key: "test-only", fetcher },
    );
    assert.equal(calls, 2);
    assert.equal(r.mode, "ai");
    assert.equal(r.sources[0].name, "Alex Test");
    assert.equal((await s.list("interactions")).length, 0);
  } finally {
    await s.close();
  }
});
