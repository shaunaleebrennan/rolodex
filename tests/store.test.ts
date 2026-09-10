import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../server/store.js";
import { seed } from "../server/seed.js";
import { kinds } from "../shared/model.js";
test("CRUD for every record type; deleting a person cleans both sides of connections", async () => {
  const s = await new Store({ file: ":memory:" }).open();
  try {
    const a = await s.save("people", { name: "A" }),
      b = await s.save("people", { name: "B" });
    const records: any = {
      people: { name: "C" },
      interactions: { personId: a.id, type: "call", date: "2025-01-01" },
      dates: {
        personId: a.id,
        type: "birthday",
        label: "Birthday",
        month: 2,
        day: 29,
      },
      facts: { personId: a.id, text: "Likes coffee" },
      news: { personId: a.id, text: "New job", date: "2025-01-01" },
      reminders: { personId: a.id, text: "Call", date: "2025-01-01" },
      gifts: { personId: a.id, text: "Book", status: "idea" },
      connections: { personId: a.id, otherId: b.id, label: "parent" },
    };
    for (const k of kinds) {
      const r = await s.save(k, records[k]);
      assert.equal((await s.get(k, r.id))?.id, r.id);
      assert.ok((await s.list(k)).some((x) => x.id === r.id));
      const changed = await s.save(k, records[k], r.id);
      assert.equal(changed.createdAt, r.createdAt);
      await s.remove(k, r.id);
      assert.equal(await s.get(k, r.id), null);
    }
    await s.save("connections", records.connections);
    await s.save("facts", records.facts);
    await s.remove("people", a.id);
    assert.equal((await s.list("connections")).length, 0);
    assert.equal((await s.list("facts")).length, 0);
    assert.ok(await s.get("people", b.id));
    await assert.rejects(s.save("facts", records.facts));
  } finally {
    await s.close();
  }
});
test("seed is realistic and idempotent", async () => {
  const s = await new Store({ file: ":memory:" }).open();
  try {
    await seed(s);
    await seed(s);
    const d = await s.snapshot();
    assert.equal(d.people.length, 32);
    assert.equal(new Set(d.people.map((p) => p.circle)).size, 4);
    assert.equal(d.interactions.length, 128);
    for (const k of kinds) assert.ok(d[k].length);
    assert.ok(
      d.interactions.some(
        (i) => new Date(i.date).getTime() < Date.now() - 365 * 86400000,
      ),
    );
  } finally {
    await s.close();
  }
});
