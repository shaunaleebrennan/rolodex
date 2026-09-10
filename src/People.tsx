import { useMemo, useState, type FormEvent } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Search,
  Upload,
  Plus,
  Pencil,
  Trash2,
  Mail,
  MapPin,
} from "lucide-react";
import { circles, type Person, type Snapshot } from "../shared/model";
import { parseContacts, duplicateOf, type ImportRow } from "../shared/import";
import { Avatar, Modal, Field, Empty } from "./ui";
import { saveRecord } from "./api";
import { Status } from "./Circles";
export function PersonForm({
  person,
  onClose,
  onSaved,
}: {
  person?: Person;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [photo, setPhoto] = useState(person?.photo || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await saveRecord(
        "people",
        {
          ...person,
          name: f.get("name"),
          email: f.get("email"),
          phone: f.get("phone"),
          company: f.get("company"),
          title: f.get("title"),
          city: f.get("city"),
          timezone: f.get("timezone"),
          circle: f.get("circle"),
          metWhere: f.get("metWhere"),
          metDate: f.get("metDate") || null,
          notes: f.get("notes"),
          tags: String(f.get("tags"))
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          photo,
        },
        person?.id,
      );
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={person ? "Edit person" : "Add a person"} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="photo-edit">
          <Avatar
            person={{ name: person?.name || "New person", photo }}
            size="large"
          />
          <label className="button secondary">
            Choose photo
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 2_000_000) {
                  setError("Choose a photo smaller than 2 MB");
                  return;
                }
                const r = new FileReader();
                r.onload = () => setPhoto(String(r.result));
                r.readAsDataURL(f);
              }}
            />
          </label>
          {photo && (
            <button
              type="button"
              className="text-button"
              onClick={() => setPhoto("")}
            >
              Remove photo
            </button>
          )}
        </div>
        <div className="form-grid">
          <Field label="Full name">
            <input
              autoFocus
              name="name"
              required
              maxLength={150}
              defaultValue={person?.name}
            />
          </Field>
          <Field label="Circle">
            <select name="circle" defaultValue={person?.circle || "Close"}>
              {circles.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          {(
            ["email", "phone", "title", "company", "city", "timezone"] as const
          ).map((k) => (
            <Field
              key={k}
              label={
                {
                  email: "Email",
                  phone: "Phone",
                  title: "Job title",
                  company: "Company",
                  city: "City",
                  timezone: "Time zone",
                }[k]
              }
            >
              <input
                name={k}
                type={k === "email" ? "email" : "text"}
                defaultValue={
                  person?.[k] || (k === "timezone" ? "Europe/Dublin" : "")
                }
              />
            </Field>
          ))}
          <Field label="How you met">
            <input name="metWhere" defaultValue={person?.metWhere} />
          </Field>
          <Field label="When you met">
            <input
              type="date"
              name="metDate"
              defaultValue={person?.metDate || ""}
            />
          </Field>
          <Field label="Tags (comma separated)" wide>
            <input
              name="tags"
              placeholder="Friends, running, ex-colleagues"
              defaultValue={person?.tags.join(", ")}
            />
          </Field>
          <Field label="Notes" wide>
            <textarea name="notes" rows={3} defaultValue={person?.notes} />
          </Field>
        </div>
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
            {busy ? "Saving…" : "Save person"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export function People({
  data,
  onOpen,
  onAdd,
  onEdit,
  onDelete,
  onImport,
}: {
  data: Snapshot;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onEdit: (p: Person) => void;
  onDelete: (p: Person) => void;
  onImport: () => void;
}) {
  const [query, setQuery] = useState(""),
    [circle, setCircle] = useState(""),
    [tag, setTag] = useState("");
  const filtered = useMemo(
    () =>
      data.people.filter(
        (p) =>
          (!circle || p.circle === circle) &&
          (!tag || p.tags.includes(tag)) &&
          [p.name, p.email, p.company]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [data, query, circle, tag],
  );
  const columns: ColumnDef<Person>[] = [
    {
      header: "Person",
      cell: ({ row: { original: p } }) => (
        <button className="person-link" onClick={() => onOpen(p.id)}>
          <Avatar person={p} />
          <span>
            <strong>{p.name}</strong>
            <small>{p.title || p.email || "Add a little context"}</small>
          </span>
        </button>
      ),
    },
    { header: "Company", accessorKey: "company" },
    {
      header: "Circle",
      cell: ({ row: { original: p } }) => (
        <span className={"circle-label " + p.circle.toLowerCase()}>
          {p.circle}
        </span>
      ),
    },
    {
      header: "Last contacted",
      cell: ({ row: { original: p } }) =>
        data.interactions
          .filter((i) => i.personId === p.id)
          .sort((a, b) => b.date.localeCompare(a.date))[0]?.date ||
        "Not yet logged",
    },
    {
      header: "Check-in",
      cell: ({ row: { original: p } }) => <Status person={p} data={data} />,
    },
    {
      header: "Latest news",
      cell: ({ row: { original: p } }) => (
        <span className="table-news">
          {data.news
            .filter((i) => i.personId === p.id)
            .sort((a, b) => b.date.localeCompare(a.date))[0]?.text || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row: { original: p } }) => (
        <div className="row-actions">
          <button
            className="icon"
            aria-label={"Edit " + p.name}
            onClick={() => onEdit(p)}
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon"
            aria-label={"Delete " + p.name}
            onClick={() => onDelete(p)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];
  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">YOUR PERSONAL ADDRESS BOOK</p>
          <h1>
            Your people<span className="title-count">{data.people.length}</span>
          </h1>
          <p>All the people who make your world a little bigger.</p>
        </div>
        <div className="actions">
          <button className="secondary" onClick={onImport}>
            <Upload size={17} />
            Import contacts
          </button>
          <button className="primary" onClick={onAdd}>
            <Plus size={18} />
            Add person
          </button>
        </div>
      </div>
      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Search people"
            placeholder="Search by name, company or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter by circle"
          value={circle}
          onChange={(e) => setCircle(e.target.value)}
        >
          <option value="">All circles</option>
          {circles.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Filter by tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        >
          <option value="">All tags</option>
          {Array.from(new Set(data.people.flatMap((p) => p.tags)))
            .sort()
            .map((t) => (
              <option key={t}>{t}</option>
            ))}
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            {table.getHeaderGroups().map((g) => (
              <tr key={g.id}>
                {g.headers.map((h) => (
                  <th key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <td key={c.id}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <Empty>
            No people match these filters. Try another search, or add someone
            new.
          </Empty>
        )}
      </div>
      <p className="table-foot">
        {filtered.length} of {data.people.length} people
      </p>
    </>
  );
}
export function ImportContacts({
  data,
  onClose,
  onSaved,
}: {
  data: Snapshot;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [parsed, setParsed] = useState<{
      headers: string[];
      rows: ImportRow[];
    } | null>(null),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [allowed, setAllowed] = useState<Record<number, boolean>>({}),
    [done, setDone] = useState<number | null>(null);
  const rows =
    parsed?.rows.map((r) =>
      Object.fromEntries(
        ["name", "email", "phone", "company", "title", "city", "notes"].map(
          (k) => [k, r[mapping[k]] || ""],
        ),
      ),
    ) || [];
  const seen: { name: string; email?: string }[] = [...data.people];
  const duplicates = rows.map((r) => {
    const found = duplicateOf(r as { name: string }, seen);
    seen.push(r as { name: string });
    return found?.name;
  });
  const canImport = rows.filter(
    (r, i) => r.name.trim() && (!duplicates[i] || allowed[i]),
  ).length;
  async function run() {
    setBusy(true);
    setError("");
    let count = 0;
    try {
      for (let i = 0; i < rows.length; i++) {
        if (!rows[i].name.trim() || (duplicates[i] && !allowed[i])) continue;
        await saveRecord("people", rows[i]);
        count++;
      }
      await onSaved();
      setDone(count);
    } catch (e) {
      await onSaved();
      setError(
        `${count} contacts saved before an error: ${(e as Error).message}. Close and reopen the import to avoid importing them again.`,
      );
      setDone(count);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Bring your people with you" onClose={onClose} wide>
      {done !== null ? (
        <>
          <p className="success">{done} contacts imported.</p>
          {error && <p className="error">{error}</p>}
          <footer>
            <button className="primary" onClick={onClose}>
              Done
            </button>
          </footer>
        </>
      ) : (
        <>
          <p className="muted">
            Choose a CSV or vCard file, review the details, then import.
          </p>
          <label className="file-drop">
            <Upload size={24} />
            <strong>Choose a contact file</strong>
            <span>CSV or VCF · up to 2 MB</span>
            <input
              aria-label="Contact file"
              type="file"
              accept=".csv,.vcf"
              onChange={async (e) => {
                try {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const p = parseContacts(await f.text(), f.name);
                  setParsed(p);
                  const m: Record<string, string> = {};
                  for (const k of [
                    "name",
                    "email",
                    "phone",
                    "company",
                    "title",
                    "city",
                    "notes",
                  ])
                    m[k] =
                      p.headers.find(
                        (h) =>
                          h.toLowerCase() === k ||
                          (k === "name" &&
                            ["full name", "contact name"].includes(
                              h.toLowerCase(),
                            )),
                      ) || "";
                  setMapping(m);
                  setPreview(false);
                  setAllowed({});
                  setError("");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          </label>
          {parsed && !preview && (
            <>
              <h3>Match your columns</h3>
              <div className="form-grid">
                {[
                  "name",
                  "email",
                  "phone",
                  "company",
                  "title",
                  "city",
                  "notes",
                ].map((k) => (
                  <Field key={k} label={k === "name" ? "Name (required)" : k}>
                    <select
                      value={mapping[k] || ""}
                      onChange={(e) =>
                        setMapping({ ...mapping, [k]: e.target.value })
                      }
                    >
                      <option value="">Skip column</option>
                      {parsed.headers.map((h) => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                  </Field>
                ))}
              </div>
              <footer>
                <button
                  className="primary"
                  disabled={!mapping.name}
                  onClick={() => setPreview(true)}
                >
                  Preview {rows.length} contacts
                </button>
              </footer>
            </>
          )}
          {preview && (
            <>
              <div className="import-list">
                {rows.map((r, i) => (
                  <div className="import-row" key={i}>
                    <div>
                      <strong>{r.name || "Missing name — skipped"}</strong>
                      <small>
                        {r.email} {r.company}
                      </small>
                      {duplicates[i] && (
                        <span className="warning">
                          Possible duplicate of {duplicates[i]}
                        </span>
                      )}
                    </div>
                    {duplicates[i] && (
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={!!allowed[i]}
                          onChange={(e) =>
                            setAllowed({ ...allowed, [i]: e.target.checked })
                          }
                        />
                        Add anyway
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <p className="muted">
                Duplicates are skipped unless you choose “Add anyway”.
              </p>
              <footer>
                <button className="secondary" onClick={() => setPreview(false)}>
                  Back to mapping
                </button>
                <button
                  className="primary"
                  disabled={busy || !canImport}
                  onClick={run}
                >
                  {busy ? "Importing…" : `Import ${canImport} contacts`}
                </button>
              </footer>
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
export function PersonBasics({ person }: { person: Person }) {
  return (
    <div className="person-basics">
      <Avatar person={person} size="large" />
      <h1>{person.name}</h1>
      <p>{[person.title, person.company].filter(Boolean).join(" at ")}</p>
      {person.email && (
        <p>
          <Mail size={16} />
          {person.email}
        </p>
      )}
      {person.city && (
        <p>
          <MapPin size={16} />
          {person.city} ·{" "}
          {new Intl.DateTimeFormat("en-IE", {
            timeZone: person.timezone,
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date())}
        </p>
      )}
      <div className="tags">
        {person.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      {person.notes && <p className="notes">{person.notes}</p>}
    </div>
  );
}
