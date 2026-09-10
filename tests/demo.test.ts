import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../server/store.js";
import { addDemo, demoPeople, demoQueries, demoTag } from "../server/demo.js";
test("interview demo adds distinct evidence without modifying existing contacts and skips repeat additions", async () => {
  const s = await new Store({ file: ":memory:" }).open();
  try {
    const own = await s.save("people", {
      name: demoPeople[0].name,
      notes: "User-owned notes",
    });
    assert.equal(await addDemo(s), 6);
    assert.equal(await addDemo(s), 0);
    const data = await s.snapshot();
    assert.equal(data.people.length, 7);
    assert.deepEqual(await s.get("people", own.id), own);
    assert.equal(data.people.filter((p) => p.tags.includes(demoTag)).length, 6);
    assert.equal(new Set(data.interactions.map((i) => i.notes)).size, 6);
    assert.equal(data.news.length, 6);
    assert.equal(data.facts.length, 6);
    assert.equal(demoQueries.filter((q) => q.expected !== null).length, 9);
  } finally {
    await s.close();
  }
});

test("legacy sample names are cleaned without losing notes or changing unrelated contacts", async () => {
  const s = await new Store({ file: ":memory:" }).open();
  try {
    await addDemo(s);
    const p = (await s.list("people"))[0];
    await s.save(
      "people",
      { ...p, name: `${p.name} · Demo`, notes: "Custom note" },
      p.id,
    );
    const own = await s.save("people", {
      name: `${p.name} · Demo`,
      notes: "Personal contact",
    });
    assert.equal(await addDemo(s), 0);
    const updated = await s.get("people", p.id);
    assert.equal(updated?.name, p.name);
    assert.equal(updated?.notes, "Custom note");
    assert.deepEqual(await s.get("people", own.id), own);
  } finally {
    await s.close();
  }
});
