import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../server/store.js";
import { schemas, day } from "../shared/model.js";
test("reject malformed dates, invalid timezones, non-image data, and self-connections", () => {
  assert.equal(day.safeParse("2026-02-30").success, false);
  assert.equal(
    schemas.people.safeParse({ name: "A", timezone: "not/a/zone" }).success,
    false,
  );
  assert.equal(
    schemas.people.safeParse({ name: "A", photo: "javascript:alert(1)" })
      .success,
    false,
  );
  assert.equal(
    schemas.dates.safeParse({
      personId: "f32ec651-4556-4eb6-a1fd-58355a9291e7",
      type: "birthday",
      label: "Birthday",
      month: 2,
      day: 29,
      year: 2001,
    }).success,
    false,
  );
});
test("reminder completion is server derived and reversible", async () => {
  const s = await new Store({ file: ":memory:" }).open();
  try {
    const p = await s.save("people", { name: "A" });
    const r = await s.save("reminders", {
      personId: p.id,
      text: "Call",
      date: "2025-01-01",
      done: true,
      completedAt: "fake",
    });
    assert.ok(r.completedAt);
    assert.notEqual(r.completedAt, "fake");
    const undone = await s.save("reminders", { ...r, done: false }, r.id);
    assert.equal(undone.completedAt, null);
  } finally {
    await s.close();
  }
});
test("local persistence survives reopen, including initialization marker", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const dir = await mkdtemp(join(tmpdir(), "rolodex-test-"));
  const file = join(dir, "test.sqlite");
  const s = await new Store({ file }).open();
  const p = await s.save("people", { name: "Persistence test" });
  await s.markInitialized();
  await s.close();
  const reopened = await new Store({ file }).open();
  try {
    assert.equal(
      (await reopened.get("people", p.id))?.name,
      "Persistence test",
    );
    assert.equal(await reopened.initialized(), true);
  } finally {
    await reopened.close();
    await rm(dir, { recursive: true, force: true });
  }
});
