import { z } from "zod";
export const circles = ["Inner", "Close", "Wider", "Distant"] as const;
export type Circle = (typeof circles)[number];
export const kinds = [
  "people",
  "interactions",
  "dates",
  "facts",
  "news",
  "reminders",
  "gifts",
  "connections",
] as const;
export type Kind = (typeof kinds)[number];
const text = z.string().trim().max(5000);
export const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "Enter a valid date",
  );
const image = z
  .string()
  .max(2800000)
  .refine(
    (v) => !v || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v),
    "Use a PNG, JPEG or WebP photo",
  );
const person = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.union([z.string().email(), z.literal("")]).default(""),
  phone: text.default(""),
  title: text.default(""),
  company: text.default(""),
  city: text.default(""),
  timezone: z
    .string()
    .refine((v) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, "Use a valid time zone")
    .default("Europe/Dublin"),
  circle: z.enum(circles).default("Close"),
  cadenceMonths: z.number().int().min(1).max(60).nullable().default(null),
  checkIns: z.boolean().default(true),
  snoozedUntil: day.nullable().default(null),
  metWhere: text.default(""),
  metDate: day.nullable().default(null),
  notes: text.default(""),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
  photo: image.default(""),
});
const owned = { personId: z.string().uuid() };
export const schemas = {
  people: person,
  interactions: z.object({
    ...owned,
    type: z.enum(["call", "message", "email", "meet-up", "other"]),
    date: day,
    notes: text.default(""),
  }),
  dates: z
    .object({
      ...owned,
      type: z.enum([
        "birthday",
        "anniversary",
        "work anniversary",
        "child’s birthday",
        "other",
      ]),
      label: z.string().trim().min(1).max(150),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
      year: z.number().int().min(1900).max(2200).nullable().default(null),
    })
    .refine(
      (v) =>
        new Date(Date.UTC(v.year ?? 2000, v.month - 1, v.day)).getUTCMonth() ===
        v.month - 1,
      "That day does not exist in the selected month/year",
    ),
  facts: z.object({ ...owned, text: z.string().trim().min(1).max(5000) }),
  news: z.object({
    ...owned,
    text: z.string().trim().min(1).max(5000),
    date: day,
  }),
  reminders: z.object({
    ...owned,
    text: z.string().trim().min(1).max(5000),
    date: day,
    done: z.boolean().default(false),
    completedAt: z.string().nullable().default(null),
  }),
  gifts: z.object({
    ...owned,
    text: z.string().trim().min(1).max(5000),
    status: z.enum(["idea", "given", "received"]),
    occasion: text.default(""),
    date: day.nullable().default(null),
  }),
  connections: z
    .object({
      personId: z.string().uuid(),
      otherId: z.string().uuid(),
      label: z.enum([
        "partner",
        "parent",
        "child",
        "sibling",
        "colleague",
        "introduced",
      ]),
    })
    .refine((v) => v.personId !== v.otherId, "Choose a different person"),
};
export type Meta = { id: string; createdAt: string; updatedAt: string };
export type Person = z.infer<typeof person> & Meta;
export type Interaction = z.infer<typeof schemas.interactions> & Meta;
export type ImportantDate = z.infer<typeof schemas.dates> & Meta;
export type Fact = z.infer<typeof schemas.facts> & Meta;
export type News = z.infer<typeof schemas.news> & Meta;
export type Reminder = z.infer<typeof schemas.reminders> & Meta;
export type Gift = z.infer<typeof schemas.gifts> & Meta;
export type Connection = z.infer<typeof schemas.connections> & Meta;
export type Entities = {
  people: Person;
  interactions: Interaction;
  dates: ImportantDate;
  facts: Fact;
  news: News;
  reminders: Reminder;
  gifts: Gift;
  connections: Connection;
};
export type Snapshot = { [K in Kind]: Entities[K][] };
export const emptySnapshot = (): Snapshot => ({
  people: [],
  interactions: [],
  dates: [],
  facts: [],
  news: [],
  reminders: [],
  gifts: [],
  connections: [],
});
