import { useState, type FormEvent } from "react";
import {
  Phone,
  MessageCircle,
  Mail,
  Coffee,
  Clock3,
  Newspaper,
  CheckCheck,
  Plus,
  Pencil,
  Trash2,
  Gift,
  CalendarDays,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import type { Snapshot, Kind, Person } from "../shared/model";
import {
  activity,
  isoDay,
  upcoming,
  currentAge,
  nextDate,
  connectionText,
} from "../shared/logic";
import { saveRecord, deleteRecord } from "./api";
import { Modal, Field, Section, Empty, Avatar } from "./ui";
export type Editor = {
  kind: Exclude<Kind, "people">;
  personId: string;
  record?: any;
};
const names: Record<string, string> = {
  interactions: "Log an interaction",
  facts: "Add a fact",
  news: "Add a life update",
  reminders: "Set a reminder",
  dates: "Add an important date",
  gifts: "Add a gift",
  connections: "Connect two people",
};
export function RecordForm({
  editor,
  data,
  onClose,
  onSaved,
}: {
  editor: Editor;
  data: Snapshot;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { kind, personId, record: r } = editor;
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const fields: any = Object.fromEntries(f.entries());
    if (kind === "dates") {
      fields.month = Number(fields.month);
      fields.day = Number(fields.day);
      fields.year = fields.year ? Number(fields.year) : null;
    }
    if (kind === "gifts") fields.date = fields.date || null;
    try {
      await saveRecord(kind, { ...r, ...fields, personId }, r?.id);
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        r
          ? "Edit " +
            {
              interactions: "interaction",
              facts: "fact",
              news: "life update",
              reminders: "reminder",
              dates: "date",
              gifts: "gift",
              connections: "connection",
            }[kind]
          : names[kind]
      }
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <p className="muted">
          For {data.people.find((p) => p.id === personId)?.name}
        </p>
        <div className="form-grid">
          {kind === "interactions" && (
            <>
              <Field label="How did you connect?">
                <select name="type" defaultValue={r?.type || "call"}>
                  <option value="call">Phone call</option>
                  <option value="message">Message</option>
                  <option value="email">Email</option>
                  <option value="meet-up">Met up</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Date">
                <input
                  required
                  type="date"
                  name="date"
                  max={isoDay()}
                  defaultValue={r?.date || isoDay()}
                />
              </Field>
              <Field label="What did you talk about?" wide>
                <textarea
                  autoFocus
                  name="notes"
                  rows={4}
                  defaultValue={r?.notes}
                  placeholder="The little details you’ll want to remember…"
                />
              </Field>
            </>
          )}
          {["facts", "news", "reminders"].includes(kind) && (
            <>
              <Field
                label={
                  kind === "facts"
                    ? "What’s worth remembering?"
                    : kind === "news"
                      ? "What’s new?"
                      : "What would you like to do?"
                }
                wide
              >
                <textarea
                  autoFocus
                  required
                  name="text"
                  rows={3}
                  defaultValue={r?.text}
                />
              </Field>
              {kind !== "facts" && (
                <Field label={kind === "reminders" ? "Due date" : "Date"}>
                  <input
                    required
                    type="date"
                    name="date"
                    defaultValue={r?.date || isoDay()}
                  />
                </Field>
              )}
            </>
          )}
          {kind === "dates" && (
            <>
              <Field label="Type">
                <select name="type" defaultValue={r?.type || "birthday"}>
                  {[
                    "birthday",
                    "anniversary",
                    "work anniversary",
                    "child’s birthday",
                    "other",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
              <Field label="Label">
                <input
                  required
                  name="label"
                  defaultValue={r?.label || "Birthday"}
                />
              </Field>
              <Field label="Month">
                <select
                  name="month"
                  defaultValue={r?.month || new Date().getMonth() + 1}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {format(new Date(2000, i, 1), "MMMM")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Day">
                <input
                  required
                  type="number"
                  min="1"
                  max="31"
                  name="day"
                  defaultValue={r?.day || 1}
                />
              </Field>
              <Field label="Year (optional)">
                <input
                  type="number"
                  min="1900"
                  max="2200"
                  name="year"
                  defaultValue={r?.year || ""}
                  placeholder="Leave blank if unknown"
                />
              </Field>
            </>
          )}
          {kind === "gifts" && (
            <>
              <Field label="Gift" wide>
                <input autoFocus required name="text" defaultValue={r?.text} />
              </Field>
              <Field label="Status">
                <select name="status" defaultValue={r?.status || "idea"}>
                  <option value="idea">Idea</option>
                  <option value="given">Given</option>
                  <option value="received">Received</option>
                </select>
              </Field>
              <Field label="Occasion">
                <input
                  name="occasion"
                  defaultValue={r?.occasion}
                  placeholder="Birthday, thank you…"
                />
              </Field>
              <Field label="Date (optional)">
                <input type="date" name="date" defaultValue={r?.date || ""} />
              </Field>
            </>
          )}
          {kind === "connections" && (
            <>
              <Field label="This person">
                <select required name="otherId" defaultValue={r?.otherId || ""}>
                  <option value="" disabled>
                    Choose a person
                  </option>
                  {data.people
                    .filter((p) => p.id !== personId)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field
                label={
                  "How " +
                  data.people
                    .find((p) => p.id === personId)
                    ?.name.split(" ")[0] +
                  " relates to them"
                }
              >
                <select name="label" defaultValue={r?.label || "colleague"}>
                  <option value="partner">Is their partner</option>
                  <option value="parent">Is their parent</option>
                  <option value="child">Is their child</option>
                  <option value="sibling">Is their sibling</option>
                  <option value="colleague">Is their colleague</option>
                  <option value="introduced">Introduced them to me</option>
                </select>
              </Field>
            </>
          )}
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer>
          <button className="secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy
              ? "Saving…"
              : kind === "interactions"
                ? "Save interaction"
                : kind === "reminders"
                  ? "Save reminder"
                  : "Save"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
const icons: Record<string, typeof Phone> = {
  call: Phone,
  message: MessageCircle,
  email: Mail,
  "meet-up": Coffee,
  other: Clock3,
  news: Newspaper,
  reminders: CheckCheck,
};
export function Feed({
  data,
  personId,
  type,
  onOpen,
  onEdit,
  limit,
}: {
  data: Snapshot;
  personId?: string;
  type?: string;
  onOpen: (id: string) => void;
  onEdit?: (editor: Editor) => void;
  limit?: number;
}) {
  const items = activity(data, personId, type).slice(0, limit);
  return (
    <div className="feed">
      {items.map((item) => {
        const p = data.people.find((p) => p.id === item.personId);
        if (!p) return null;
        const Icon =
          icons[
            item.kind === "interactions" ? (item as any).type : item.kind
          ] || Clock3;
        return (
          <article className="feed-item" key={item.kind + item.id}>
            <Avatar person={p} size="small" />
            <div className="feed-content">
              <div>
                <button className="inline-name" onClick={() => onOpen(p.id)}>
                  {p.name}
                </button>
                <small>{format(parseISO(item.date), "d MMM yyyy")}</small>
              </div>
              <p>
                <Icon size={14} />
                {item.label}
              </p>
              <span>{item.text}</span>
            </div>
            {onEdit && (
              <button
                className="icon"
                aria-label={"Edit " + item.label + " for " + p.name}
                onClick={() =>
                  onEdit({
                    kind: item.kind as Editor["kind"],
                    personId: p.id,
                    record: data[item.kind as keyof Snapshot].find(
                      (r) => r.id === item.id,
                    ),
                  })
                }
              >
                <Pencil size={14} />
              </button>
            )}
          </article>
        );
      })}
      {!items.length && (
        <Empty>No activity yet. Log an interaction to start the story.</Empty>
      )}
    </div>
  );
}
export function Timeline({
  data,
  onOpen,
  onEdit,
}: {
  data: Snapshot;
  onOpen: (id: string) => void;
  onEdit: (editor: Editor) => void;
}) {
  const [person, setPerson] = useState(""),
    [type, setType] = useState("");
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">THE MOMENTS THAT ADD UP</p>
          <h1>Your shared history.</h1>
          <p>
            Conversations, life updates, and the things you followed through on.
          </p>
        </div>
      </div>
      <div className="toolbar">
        <select
          aria-label="Timeline person"
          value={person}
          onChange={(e) => setPerson(e.target.value)}
        >
          <option value="">Everyone</option>
          {data.people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Timeline type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">All activity</option>
          <option value="interactions">Interactions</option>
          <option value="news">Life updates</option>
          <option value="reminders">Completed reminders</option>
        </select>
      </div>
      <section className="panel timeline-panel">
        <Feed
          data={data}
          personId={person}
          type={type}
          onOpen={onOpen}
          onEdit={onEdit}
        />
      </section>
    </>
  );
}
export function PersonRecords({
  person,
  data,
  onEdit,
  onOpen,
  onSaved,
  onError,
  onAsk,
}: {
  person: Person;
  data: Snapshot;
  onEdit: (editor: Editor) => void;
  onOpen: (id: string) => void;
  onSaved: () => Promise<void>;
  onError: (s: string) => void;
  onAsk: (id: string) => void;
}) {
  const own = (kind: keyof Snapshot) =>
    data[kind].filter((r: any) => r.personId === person.id) as any[];
  const [deleting, setDeleting] = useState<{ kind: Kind; id: string } | null>(
    null,
  );
  const add = (kind: Editor["kind"]) => onEdit({ kind, personId: person.id });
  const controls = (kind: Editor["kind"], r: any) => (
    <div className="row-actions">
      <button
        className="icon"
        aria-label={"Edit " + (r.text || r.label || "record")}
        onClick={() => onEdit({ kind, personId: person.id, record: r })}
      >
        <Pencil size={14} />
      </button>
      <button
        className="icon"
        aria-label={"Remove " + (r.text || r.label || "record")}
        onClick={() => setDeleting({ kind, id: r.id })}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
  const dates = own("dates");
  const near = upcoming(data).filter((d) => d.personId === person.id);
  const latest = own("news").sort((a, b) => b.date.localeCompare(a.date))[0];
  async function update(kind: Kind, r: any) {
    try {
      await saveRecord(kind, r, r.id);
      await onSaved();
    } catch (e) {
      onError((e as Error).message);
    }
  }
  return (
    <div className="person-records">
      <div className="detail-actions">
        <button className="primary" onClick={() => add("interactions")}>
          <Plus size={17} />
          Log interaction
        </button>
        <button className="secondary" onClick={() => onAsk(person.id)}>
          <Sparkles size={17} />
          Plan a catch-up
        </button>
      </div>
      {latest && (
        <section className="latest-news">
          <Newspaper size={21} />
          <div>
            <small>
              LATEST LIFE UPDATE · {format(parseISO(latest.date), "d MMM")}
            </small>
            <p>{latest.text}</p>
          </div>
        </section>
      )}
      <div className="records-grid">
        <Section title="Worth remembering" action={() => add("facts")}>
          {own("facts").map((r) => (
            <div className="record-line" key={r.id}>
              <p>{r.text}</p>
              {controls("facts", r)}
            </div>
          ))}
          {!own("facts").length && (
            <Empty>
              Their coffee order, a favourite book, a small detail that matters.
            </Empty>
          )}
        </Section>
        <Section title="Reminders" action={() => add("reminders")}>
          {own("reminders")
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((r) => (
              <div className="record-line" key={r.id}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={r.done}
                    onChange={() =>
                      update("reminders", { ...r, done: !r.done })
                    }
                  />
                  <span className={r.done ? "completed" : ""}>
                    {r.text}
                    <small>Due {format(parseISO(r.date), "d MMM yyyy")}</small>
                  </span>
                </label>
                {controls("reminders", r)}
              </div>
            ))}
          {!own("reminders").length && (
            <Empty>Nothing to follow up on just yet.</Empty>
          )}
        </Section>
        <Section title="Important dates" action={() => add("dates")}>
          {dates.map((d) => {
            const when = nextDate(d);
            const age = currentAge(d);
            const turns = d.year === null ? null : when.getFullYear() - d.year;
            return (
              <div className="record-line" key={d.id}>
                <div className="date-record">
                  <CalendarDays size={19} />
                  <div>
                    <strong>{d.label}</strong>
                    <small>
                      {format(when, "d MMM")}
                      {d.type === "birthday" && age !== null
                        ? ` · ${age} years old`
                        : ""}
                    </small>
                    {d.type === "birthday" && turns && turns % 10 === 0 ? (
                      <span className="milestone">
                        Turns {turns}{" "}
                        {when.getFullYear() === new Date().getFullYear()
                          ? "this year"
                          : "next year"}
                      </span>
                    ) : null}
                  </div>
                </div>
                {controls("dates", d)}
              </div>
            );
          })}
          {!dates.length && (
            <Empty>Add a birthday or another date worth celebrating.</Empty>
          )}
        </Section>
        <Section title="Gift list" action={() => add("gifts")}>
          {near.length > 0 && own("gifts").some((g) => g.status === "idea") && (
            <p className="gift-nudge">
              <Gift size={16} />
              {near[0].label} is coming up. A little inspiration:
            </p>
          )}
          {own("gifts").map((g) => (
            <div className="record-line" key={g.id}>
              <div>
                <strong>{g.text}</strong>
                <small>
                  {g.status} {g.occasion ? "· " + g.occasion : ""}
                </small>
                {g.status === "idea" && (
                  <button
                    className="text-button"
                    onClick={() =>
                      update("gifts", { ...g, status: "given", date: isoDay() })
                    }
                  >
                    Mark as given
                  </button>
                )}
              </div>
              {controls("gifts", g)}
            </div>
          ))}
          {!own("gifts").length && (
            <Empty>A good idea now. A thoughtful gift later.</Empty>
          )}
        </Section>
        <Section title="Connections" action={() => add("connections")}>
          {data.connections
            .filter((c) => c.personId === person.id || c.otherId === person.id)
            .map((c) => {
              const other = data.people.find(
                (p) =>
                  p.id === (c.personId === person.id ? c.otherId : c.personId),
              );
              return other ? (
                <div className="record-line" key={c.id}>
                  <button
                    className="person-link"
                    onClick={() => onOpen(other.id)}
                  >
                    <Avatar person={other} size="small" />
                    <span>
                      <strong>{other.name}</strong>
                      <small>{connectionText(c, person.id)}</small>
                    </span>
                  </button>
                  <button
                    className="icon"
                    aria-label={"Remove connection to " + other.name}
                    onClick={() =>
                      setDeleting({ kind: "connections", id: c.id })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null;
            })}
          {!data.connections.some(
            (c) => c.personId === person.id || c.otherId === person.id,
          ) && <Empty>Connect the people who know each other.</Empty>}
        </Section>
        <Section title="Life updates" action={() => add("news")}>
          {own("news")
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((r) => (
              <div className="record-line" key={r.id}>
                <div>
                  <p>{r.text}</p>
                  <small>{format(parseISO(r.date), "d MMM yyyy")}</small>
                </div>
                {controls("news", r)}
              </div>
            ))}
          {!own("news").length && (
            <Empty>
              A new job, a big move, something to ask about next time.
            </Empty>
          )}
        </Section>
      </div>
      <Section title="Your timeline" action={() => add("interactions")}>
        <Feed
          data={data}
          personId={person.id}
          onOpen={onOpen}
          onEdit={onEdit}
        />
      </Section>
      {deleting && (
        <Modal title="Remove this record?" onClose={() => setDeleting(null)}>
          <p>This removes the selected record from your Rolodex.</p>
          <footer>
            <button className="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </button>
            <button
              className="danger"
              onClick={async () => {
                try {
                  await deleteRecord(deleting.kind, deleting.id);
                  setDeleting(null);
                  await onSaved();
                } catch (e) {
                  onError((e as Error).message);
                }
              }}
            >
              Remove record
            </button>
          </footer>
        </Modal>
      )}
    </div>
  );
}
