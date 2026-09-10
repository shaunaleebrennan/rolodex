import {
  addMonths,
  differenceInCalendarDays,
  parseISO,
  startOfDay,
  format,
  isLeapYear,
  subMonths,
} from "date-fns";
import {
  circles,
  type Circle,
  type Person,
  type Interaction,
  type Snapshot,
  type ImportantDate,
  type Connection,
} from "./model";
export const cadences: Record<Circle, number> = {
  Inner: 1,
  Close: 3,
  Wider: 6,
  Distant: 12,
};
export const isoDay = (date = new Date()) => format(date, "yyyy-MM-dd");
export function lastContact(person: Person, interactions: Interaction[]) {
  return (
    interactions
      .filter((i) => i.personId === person.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0]?.date || null
  );
}
export function checkIn(
  person: Person,
  interactions: Interaction[],
  today = new Date(),
) {
  const now = startOfDay(today),
    last = lastContact(person, interactions),
    months = person.cadenceMonths ?? cadences[person.circle];
  const due = last
    ? addMonths(parseISO(last), months)
    : startOfDay(parseISO(person.createdAt));
  const days = differenceInCalendarDays(due, now);
  const status = !person.checkIns
    ? "off"
    : person.snoozedUntil && parseISO(person.snoozedUntil) > now
      ? "snoozed"
      : !last
        ? "not contacted"
        : days < 0
          ? "overdue"
          : days <= 7
            ? "due soon"
            : "in touch";
  return {
    status,
    last,
    months,
    due: isoDay(due),
    days,
    needsContact: ["overdue", "due soon", "not contacted"].includes(status),
  };
}
export function annualDate(d: ImportantDate, year: number) {
  return new Date(
    year,
    d.month - 1,
    d.month === 2 && d.day === 29 && !isLeapYear(new Date(year, 0, 1))
      ? 28
      : d.day,
  );
}
export function nextDate(d: ImportantDate, today = new Date()) {
  let date = annualDate(d, today.getFullYear());
  if (date < startOfDay(today)) date = annualDate(d, today.getFullYear() + 1);
  return date;
}
export function currentAge(d: ImportantDate, today = new Date()) {
  if (d.year === null) return null;
  return (
    today.getFullYear() -
    d.year -
    (startOfDay(today) < annualDate(d, today.getFullYear()) ? 1 : 0)
  );
}
export function upcoming(data: Snapshot, today = new Date()) {
  return data.dates
    .map((d) => ({
      ...d,
      when: nextDate(d, today),
      person: data.people.find((p) => p.id === d.personId),
    }))
    .filter((d) => d.person && differenceInCalendarDays(d.when, today) <= 30)
    .sort((a, b) => a.when.getTime() - b.when.getTime());
}
export function connectionText(c: Connection, viewId: string) {
  if (c.personId !== viewId)
    return c.label === "introduced" ? "introduced you to" : c.label;
  return {
    parent: "child",
    child: "parent",
    introduced: "introduced by",
    partner: "partner",
    sibling: "sibling",
    colleague: "colleague",
  }[c.label];
}
export function whoToContact(data: Snapshot, today = new Date()) {
  return data.people
    .map((person) => ({ person, ...checkIn(person, data.interactions, today) }))
    .filter((p) => p.needsContact)
    .sort(
      (a, b) =>
        a.days - b.days ||
        circles.indexOf(a.person.circle) - circles.indexOf(b.person.circle) ||
        a.person.name.localeCompare(b.person.name),
    );
}
export function activity(data: Snapshot, personId?: string, type?: string) {
  return [
    ...data.interactions.map((i) => ({
      ...i,
      kind: "interactions",
      text: i.notes || "Caught up",
      label: {
        call: "Phone call",
        message: "Message",
        email: "Email",
        "meet-up": "Met up",
        other: "Interaction",
      }[i.type],
    })),
    ...data.news.map((i) => ({ ...i, kind: "news", label: "Life update" })),
    ...data.reminders
      .filter((r) => r.done && r.completedAt)
      .map((i) => ({
        ...i,
        date: i.completedAt!,
        kind: "reminders",
        label: "Reminder completed",
      })),
  ]
    .filter(
      (i) =>
        (!personId || i.personId === personId) && (!type || i.kind === type),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    );
}
export function chartData(data: Snapshot, today = new Date()) {
  return {
    months: Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(today, 5 - i);
      return {
        month: format(d, "MMM"),
        count: data.interactions.filter((a) =>
          a.date.startsWith(format(d, "yyyy-MM")),
        ).length,
      };
    }),
    circles: circles.map((circle) => {
      const people = data.people.filter((p) => p.circle === circle);
      const overdue = people.filter(
        (p) => checkIn(p, data.interactions, today).status === "overdue",
      ).length;
      return {
        circle,
        overdue,
        other: people.length - overdue,
        total: people.length,
      };
    }),
  };
}
