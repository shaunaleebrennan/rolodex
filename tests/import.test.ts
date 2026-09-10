import { test } from "node:test";
import assert from "node:assert/strict";
import { parseContacts, duplicateOf } from "../shared/import.js";
import { Store } from "../server/store.js";
test("CSV preserves quoted commas and maps fields; likely duplicates are detected", () => {
  const p = parseContacts(
    'name,email,company\n"Alex, Test",alex@example.com,Studio',
    "people.csv",
  );
  assert.equal(p.rows[0].name, "Alex, Test");
  assert.ok(
    duplicateOf({ name: "Other", email: "ALEX@example.com" }, [
      { name: "Alex", email: "alex@example.com" },
    ]),
  );
  assert.ok(
    duplicateOf({ name: "Aoife Murphy" }, [{ name: " aoife murphy " }]),
  );
});
test("vCard supports folded notes and structured org/name", () => {
  const p = parseContacts(
    "BEGIN:VCARD\r\nVERSION:3.0\r\nN:Test;Alex;;;\r\nFN:Alex Test\r\nEMAIL:alex@example.com\r\nORG:Studio;Design\r\nNOTE:Loves coffee and\r\n long walks\r\nEND:VCARD",
    "people.vcf",
  );
  assert.equal(p.rows[0].name, "Alex Test");
  assert.equal(p.rows[0].company, "Studio Design");
  assert.equal(p.rows[0].notes, "Loves coffee andlong walks");
});
test("contact edit and case insensitive search", async () => {
  const s = await new Store({ file: ":memory:" }).open();
  try {
    const p = await s.save("people", {
      name: "Alex",
      company: "STUDIO",
      email: "a@example.com",
    });
    assert.equal((await s.searchPeople("studio")).length, 1);
    const edited = await s.save("people", { ...p, name: "Sam" }, p.id);
    assert.equal(edited.name, "Sam");
    await s.remove("people", p.id);
    assert.equal((await s.searchPeople("studio")).length, 0);
  } finally {
    await s.close();
  }
});
