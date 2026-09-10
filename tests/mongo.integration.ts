import "dotenv/config";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoClient } from "mongodb";
import { Store } from "../server/store.js";
import { kinds } from "../shared/model.js";
// Explicit test URI only. Never touch the configured app database.
test(
  "MongoDB integration: CRUD, text index, aggregation, and transactional cascade",
  { skip: !process.env.MONGODB_TEST_URI },
  async () => {
    const uri = process.env.MONGODB_TEST_URI!;
    const database = "rolodex_test_" + randomUUID().replaceAll("-", "");
    const s = await new Store({ uri, database }).open();
    try {
      const a = await s.save("people", {
          name: "Integration Alice",
          company: "Research Lab",
        }),
        b = await s.save("people", { name: "Integration Bob" });
      const records: any = {
        people: { name: "Integration Carol" },
        interactions: { personId: a.id, type: "call", date: "2025-01-01" },
        dates: {
          personId: a.id,
          type: "birthday",
          label: "Birthday",
          month: 2,
          day: 29,
        },
        facts: { personId: a.id, text: "Coffee" },
        news: { personId: a.id, text: "New job", date: "2025-01-01" },
        reminders: { personId: a.id, text: "Call", date: "2025-01-01" },
        gifts: { personId: a.id, text: "Book", status: "idea" },
        connections: { personId: a.id, otherId: b.id, label: "parent" },
      };
      for (const kind of kinds) {
        const r = await s.save(kind, records[kind]);
        assert.ok(await s.get(kind, r.id));
        await s.save(kind, records[kind], r.id);
        assert.ok((await s.list(kind)).find((x) => x.id === r.id));
        await s.remove(kind, r.id);
        assert.equal(await s.get(kind, r.id), null);
      }
      assert.equal((await s.searchPeople("Research"))[0].id, a.id);
      await s.save("interactions", records.interactions);
      assert.equal((await s.monthlyInteractions())[0].count, 1);
      await s.save("connections", records.connections);
      await s.remove("people", a.id);
      assert.equal((await s.list("connections")).length, 0);
      assert.equal((await s.list("interactions")).length, 0);
      assert.ok(await s.get("people", b.id));
    } finally {
      await s.close();
      const c = new MongoClient(uri);
      try {
        await c.connect();
        await c.db(database).dropDatabase();
      } finally {
        await c.close();
      }
    }
  },
);
