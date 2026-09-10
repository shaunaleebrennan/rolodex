import { test } from "node:test";
import assert from "node:assert/strict";
import {
  checkIn,
  annualDate,
  nextDate,
  currentAge,
  connectionText,
  chartData,
} from "../shared/logic.js";
import {
  schemas,
  emptySnapshot,
  type Person,
  type ImportantDate,
} from "../shared/model.js";
const p = {
  ...schemas.people.parse({ name: "Test", circle: "Inner" }),
  id: "a",
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-01T10:00:00Z",
} as Person;
const i: any = [{ personId: "a", date: "2026-01-31" }];
test("month end cadence, overrides, opt out and snoozing", () => {
  assert.equal(checkIn(p, i, new Date(2026, 1, 23)).due, "2026-02-28");
  assert.equal(checkIn(p, i, new Date(2026, 1, 23)).status, "due soon");
  assert.equal(checkIn(p, i, new Date(2026, 2, 1)).status, "overdue");
  assert.equal(
    checkIn({ ...p, cadenceMonths: 3 }, i, new Date(2026, 2, 1)).status,
    "in touch",
  );
  assert.equal(
    checkIn({ ...p, checkIns: false }, i, new Date(2026, 2, 1)).needsContact,
    false,
  );
  assert.equal(
    checkIn({ ...p, snoozedUntil: "2026-03-02" }, i, new Date(2026, 2, 1))
      .needsContact,
    false,
  );
  assert.equal(
    checkIn({ ...p, snoozedUntil: "2026-03-01" }, i, new Date(2026, 2, 1))
      .status,
    "overdue",
  );
  assert.equal(checkIn(p, [], new Date(2026, 2, 1)).status, "not contacted");
});
test("most recent interaction controls status regardless of insert order", () => {
  const records = [...i, { personId: "a", date: "2026-02-28" }] as any;
  assert.equal(checkIn(p, records, new Date(2026, 2, 1)).status, "in touch");
  assert.equal(
    checkIn(p, records.reverse(), new Date(2026, 2, 1)).last,
    "2026-02-28",
  );
});
test("annual dates cross year boundaries and handle leap birthdays", () => {
  const d = {
    month: 2,
    day: 29,
    year: 2000,
    type: "birthday",
  } as ImportantDate;
  assert.equal(annualDate(d, 2025).getDate(), 28);
  assert.equal(annualDate(d, 2024).getDate(), 29);
  assert.equal(nextDate(d, new Date(2025, 11, 31)).getFullYear(), 2026);
  assert.equal(currentAge(d, new Date(2025, 1, 27)), 24);
  assert.equal(currentAge(d, new Date(2025, 1, 28)), 25);
  assert.equal(currentAge({ ...d, year: null }, new Date()), null);
});
test("connection labels read from either person’s perspective", () => {
  const c = { personId: "a", otherId: "b", label: "parent" } as any;
  assert.equal(connectionText(c, "a"), "child");
  assert.equal(connectionText(c, "b"), "parent");
});
test("dashboard counts match underlying interactions and circle membership", () => {
  const data = emptySnapshot();
  data.people = [p];
  data.interactions = i;
  const d = chartData(data, new Date(2026, 2, 1));
  assert.equal(d.months.find((m) => m.month === "Jan")?.count, 1);
  assert.equal(d.circles[0].overdue, 1);
  assert.equal(d.circles[0].total, 1);
});
