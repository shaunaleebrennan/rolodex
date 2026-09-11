import { useState } from "react";
import {
  DndContext,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
} from "@dnd-kit/core";
import { GripVertical, ArrowRight, Clock3 } from "lucide-react";
import {
  circles,
  type Snapshot,
  type Person,
  type Circle,
} from "../shared/model";
import { checkIn, cadences } from "../shared/logic";
import { Avatar, Modal, Field, Empty } from "./ui";
import { saveRecord } from "./api";
export function Status({ person, data }: { person: Person; data: Snapshot }) {
  const c = checkIn(person, data.interactions);
  return (
    <span className={"status " + c.status.replaceAll(" ", "-")}>
      {c.status === "overdue"
        ? `${-c.days} days overdue`
        : c.status === "not contacted"
          ? "First catch-up"
          : c.status === "due soon"
            ? "Due " + (c.days === 0 ? "today" : `in ${c.days} days`)
            : c.status === "snoozed"
              ? "Snoozed"
              : c.status === "off"
                ? "Check-ins off"
                : "In touch"}
    </span>
  );
}
function Card({
  person,
  data,
  canEdit,
  onOpen,
  onMove,
}: {
  person: Person;
  data: Snapshot;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onMove: (p: Person, c: Circle) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: person.id,
    disabled: !canEdit,
  });
  const c = checkIn(person, data.interactions);
  return (
    <article
      ref={setNodeRef}
      className={"circle-card " + (isDragging ? "dragging" : "")}
    >
      <div className="card-person">
        <Avatar person={person} />
        {canEdit && (
          <button
            className="icon drag-handle"
            {...listeners}
            {...attributes}
            aria-label={"Drag " + person.name}
          >
            <GripVertical size={17} />
          </button>
        )}
      </div>
      <button className="card-name" onClick={() => onOpen(person.id)}>
        {person.name}
      </button>
      <p>{person.company || person.city || "Your people"}</p>
      <Status person={person} data={data} />
      <small className="last-contact">
        <Clock3 size={13} />
        {c.last ? "Last spoke " + c.last : "No interactions yet"}
      </small>
      {canEdit && (
        <select
          className="move-select"
          aria-label={"Move " + person.name + " to circle"}
          value={person.circle}
          onChange={(e) => onMove(person, e.target.value as Circle)}
        >
          {circles.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      )}
    </article>
  );
}
function Column({
  circle,
  data,
  canEdit,
  onOpen,
  onMove,
}: {
  circle: Circle;
  data: Snapshot;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onMove: (p: Person, c: Circle) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: circle });
  const people = data.people.filter((p) => p.circle === circle);
  const overdue = people.filter(
    (p) => checkIn(p, data.interactions).status === "overdue",
  ).length;
  return (
    <section
      ref={setNodeRef}
      className={"circle-column " + (isOver ? "over" : "")}
    >
      <header>
        <div>
          <span className={"circle-label " + circle.toLowerCase()}>
            {circle}
          </span>
          <span className="column-count">{people.length}</span>
        </div>
        <p>
          {cadences[circle] === 1
            ? "Every month"
            : `Every ${cadences[circle]} months`}{" "}
          <span>{overdue} overdue</span>
        </p>
      </header>
      <div className="card-stack">
        {people.map((p) => (
          <Card
            key={p.id}
            person={p}
            data={data}
            canEdit={canEdit}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))}
        {!people.length && (
          <Empty>
            {canEdit
              ? "Drop someone here to grow this circle."
              : "No one is in this circle."}
          </Empty>
        )}
      </div>
    </section>
  );
}
export default function Circles({
  data,
  canEdit,
  onOpen,
  onSaved,
  onError,
}: {
  data: Snapshot;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onSaved: () => Promise<void>;
  onError: (e: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 7 } }),
    useSensor(KeyboardSensor),
  );
  const [active, setActive] = useState<Person | null>(null);
  async function move(p: Person, c: Circle) {
    try {
      await saveRecord("people", { ...p, circle: c }, p.id);
      await onSaved();
    } catch (e) {
      onError((e as Error).message);
    }
  }
  function end(e: DragEndEvent) {
    setActive(null);
    if (!canEdit) return;
    const p = data.people.find((p) => p.id === e.active.id);
    if (p && e.over && circles.includes(e.over.id as Circle))
      void move(p, e.over.id as Circle);
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">MAKE ROOM FOR WHAT MATTERS</p>
          <h1>Keep your circles close.</h1>
          <p>
            {canEdit
              ? "Drag people between circles to set your rhythm for keeping in touch."
              : "Browse the relationship groups in this public read-only demo."}
          </p>
        </div>
      </div>
      <DndContext
        collisionDetection={(args) => { const hits = pointerWithin(args); return hits.length ? hits : rectIntersection(args); }}
        sensors={sensors}
        onDragStart={(e) =>
          setActive(data.people.find((p) => p.id === e.active.id) || null)
        }
        onDragEnd={end}
        onDragCancel={() => setActive(null)}
      >
        <div className="circles-board">
          {circles.map((c) => (
            <Column
              key={c}
              circle={c}
              data={data}
              canEdit={canEdit}
              onOpen={onOpen}
              onMove={move}
            />
          ))}
        </div>
        <DragOverlay>
          {active && (
            <div className="drag-preview">
              <Avatar person={active} />
              <strong>{active.name}</strong>
              <ArrowRight size={18} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
export function CadenceForm({
  person,
  onClose,
  onSaved,
}: {
  person: Person;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="Your check-in rhythm" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            await saveRecord(
              "people",
              {
                ...person,
                checkIns: f.get("checkIns") === "on",
                cadenceMonths: f.get("cadence")
                  ? Number(f.get("cadence"))
                  : null,
                snoozedUntil: f.get("snoozedUntil") || null,
              },
              person.id,
            );
            await onSaved();
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="muted">
          Choose how often you’d like to reconnect with{" "}
          {person.name.split(" ")[0]}.
        </p>
        <div className="form-grid">
          <Field label="Check in every">
            <select name="cadence" defaultValue={person.cadenceMonths || ""}>
              <option value="">
                Circle default ({cadences[person.circle]} months)
              </option>
              {[1, 2, 3, 6, 12, 24].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "Month" : n + " months"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Snooze until">
            <input
              type="date"
              name="snoozedUntil"
              defaultValue={person.snoozedUntil || ""}
            />
          </Field>
          <label className="check span2">
            <input
              name="checkIns"
              type="checkbox"
              defaultChecked={person.checkIns}
            />
            Include in check-in nudges
          </label>
        </div>
        <p className="muted">Clear the snooze date to resume nudges now.</p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <footer>
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            Save rhythm
          </button>
        </footer>
      </form>
    </Modal>
  );
}
