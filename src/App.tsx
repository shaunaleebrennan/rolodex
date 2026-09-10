import { useEffect, useState, useRef } from "react";
import {
  Sun,
  Users,
  Layers,
  CalendarDays,
  History,
  Plus,
  Sparkles,
  ArrowLeft,
  Database,
  Check,
  X,
  Pencil,
  Trash2,
  BookOpen,
} from "lucide-react";
import { type Person, emptySnapshot } from "../shared/model";
import { getState, deleteRecord } from "./api";
import { People, PersonForm, ImportContacts, PersonBasics } from "./People";
import { Modal, Empty } from "./ui";
import Circles, { CadenceForm, Status } from "./Circles";
import { RecordForm, PersonRecords, Timeline, type Editor } from "./Records";
import Calendar from "./Calendar";
import Today from "./Today";
import Assistant from "./Assistant";
import { registerTools } from "./webmcp";
const nav = [
  ["Today", Sun],
  ["People", Users],
  ["Circles", Layers],
  ["Calendar", CalendarDays],
  ["Timeline", History],
] as const;
export default function App() {
  const [state, setState] = useState({
      data: emptySnapshot(),
      mode: "local" as "local" | "mongodb",
      aiEnabled: false,
    }),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [view, setView] = useState("Today"),
    [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState<Person | null | undefined>(undefined),
    [removing, setRemoving] = useState<Person | null>(null),
    [importing, setImporting] = useState(false),
    [toast, setToast] = useState(""),
    [setup, setSetup] = useState(false),
    [rhythm, setRhythm] = useState<Person | null>(null),
    [editor, setEditor] = useState<Editor | null>(null),
    [assistant, setAssistant] = useState<{ personId?: string } | null>(null);
  const dataRef = useRef(state.data);
  dataRef.current = state.data;
  useEffect(
    () =>
      registerTools(
        () => dataRef.current,
        (id) => {
          setSelected(id);
          setView("People");
        },
      ),
    [],
  );
  const refresh = async () => {
    const s = await getState();
    setState(s);
    setLoaded(true);
  };
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const saved = async () => {
    await refresh();
    setToast("Saved to your Rolodex");
  };
  const open = (id: string) => {
    setSelected(id);
    setView("People");
  };
  const person = state.data.people.find((p) => p.id === selected);
  return (
    <div className="shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("Today");
            setSelected(null);
          }}
        >
          <span className="brand-icon">
            <BookOpen size={23} />
          </span>
          rolodex<span className="brand-dot">.</span>
        </a>
        <p className="nav-label">YOUR SPACE</p>
        <nav aria-label="Main navigation">
          {nav.map(([n, Icon]) => (
            <button
              className={view === n ? "nav-item active" : "nav-item"}
              key={n}
              onClick={() => {
                setView(n);
                setSelected(null);
              }}
            >
              <Icon size={20} />
              <span>{n}</span>
              {n === "People" && <small>{state.data.people.length}</small>}
            </button>
          ))}
        </nav>
        <button className="assistant-nav" onClick={() => setAssistant({})}>
          <Sparkles size={19} />
          Relationship assistant
        </button>
        <div className="sidebar-bottom">
          <button className="storage-status" onClick={() => setSetup(true)}>
            <Database size={16} />
            <span>
              {state.mode === "mongodb" ? "MongoDB connected" : "Local demo"}
              <small>
                {state.mode === "mongodb"
                  ? "Your relationships, saved"
                  : "Explore with sample contacts"}
              </small>
            </span>
          </button>
          <div className="profile">
            <span className="profile-avatar">ME</span>
            <span>
              My Rolodex<small>A little closer, every day</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            My workspace <span className="separator">/</span>{" "}
            <strong>{person ? person.name : view}</strong>
          </span>
          <button className="text-button" onClick={() => setEditing(null)}>
            <Plus size={17} />
            Add person
          </button>
        </header>
        <main>
          {error && (
            <div role="alert" className="error">
              {error}
              <button
                onClick={() => {
                  setError("");
                  refresh().catch((e) => setError(e.message));
                }}
              >
                Try again
              </button>
            </div>
          )}
          {!loaded ? (
            <Empty>Opening your Rolodex…</Empty>
          ) : person ? (
            <>
              <button
                className="text-button back"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft size={17} />
                All people
              </button>
              <div className="detail-layout">
                <section className="panel">
                  <PersonBasics person={person} />
                  <div className="rhythm-summary">
                    <Status person={person} data={state.data} />
                    <button
                      className="text-button"
                      onClick={() => setRhythm(person)}
                    >
                      Edit check-in rhythm
                    </button>
                  </div>
                  <div className="actions">
                    <button
                      className="secondary"
                      onClick={() => setEditing(person)}
                    >
                      <Pencil size={16} />
                      Edit person
                    </button>
                    <button
                      className="icon"
                      aria-label="Delete person"
                      onClick={() => setRemoving(person)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </section>
                <PersonRecords
                  person={person}
                  data={state.data}
                  onEdit={setEditor}
                  onOpen={open}
                  onSaved={saved}
                  onError={setError}
                  onAsk={(id) => setAssistant({ personId: id })}
                />
              </div>
            </>
          ) : view === "Today" ? (
            <Today
              data={state.data}
              onOpen={open}
              onEdit={setEditor}
              onAsk={(id) => setAssistant({ personId: id })}
              onNavigate={setView}
              onSaved={saved}
              onError={setError}
            />
          ) : view === "Calendar" ? (
            <Calendar data={state.data} onOpen={open} />
          ) : view === "Timeline" ? (
            <Timeline data={state.data} onOpen={open} onEdit={setEditor} />
          ) : view === "Circles" ? (
            <Circles
              data={state.data}
              onOpen={open}
              onSaved={saved}
              onError={setError}
            />
          ) : view === "People" ? (
            <People
              data={state.data}
              onOpen={open}
              onAdd={() => setEditing(null)}
              onEdit={setEditing}
              onDelete={setRemoving}
              onImport={() => setImporting(true)}
            />
          ) : (
            <>
              <div className="page-title">
                <div>
                  <p className="eyebrow">YOUR PEOPLE, KEPT CLOSE</p>
                  <h1>
                    {view === "Today"
                      ? "Make a little time for your people."
                      : view}
                  </h1>
                  <p>
                    A thoughtful home for {state.data.people.length}{" "}
                    relationships.
                  </p>
                </div>
              </div>
              <section className="panel">
                <h2>Your inner circle</h2>
                {state.data.people
                  .filter((p) => p.circle === "Inner")
                  .map((p) => (
                    <button
                      className="person-link simple-person"
                      key={p.id}
                      onClick={() => open(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
              </section>
            </>
          )}
        </main>
      </div>
      {assistant && (
        <Assistant
          data={state.data}
          personId={assistant.personId}
          aiEnabled={state.aiEnabled}
          onClose={() => setAssistant(null)}
          onOpen={open}
          onEdit={setEditor}
        />
      )}
      {editor && (
        <RecordForm
          editor={editor}
          data={state.data}
          onClose={() => setEditor(null)}
          onSaved={saved}
        />
      )}
      {rhythm && (
        <CadenceForm
          person={rhythm}
          onClose={() => setRhythm(null)}
          onSaved={saved}
        />
      )}
      {editing !== undefined && (
        <PersonForm
          person={editing || undefined}
          onClose={() => setEditing(undefined)}
          onSaved={saved}
        />
      )}
      {importing && (
        <ImportContacts
          data={state.data}
          onClose={() => setImporting(false)}
          onSaved={saved}
        />
      )}
      {removing && (
        <Modal
          title={"Delete " + removing.name + "?"}
          onClose={() => setRemoving(null)}
        >
          <p>
            This removes this person and their interactions, notes, dates,
            reminders, gifts, and connections. This cannot be undone.
          </p>
          <footer>
            <button className="secondary" onClick={() => setRemoving(null)}>
              Keep person
            </button>
            <button
              className="danger"
              onClick={async () => {
                try {
                  await deleteRecord("people", removing.id);
                  setRemoving(null);
                  setSelected(null);
                  await saved();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Delete person
            </button>
          </footer>
        </Modal>
      )}
      {setup && (
        <Modal title="Your Rolodex setup" onClose={() => setSetup(false)}>
          <p>
            Storage:{" "}
            <strong>
              {state.mode === "mongodb"
                ? "MongoDB connected"
                : "Local demo database"}
            </strong>
          </p>
          <p>
            The local demo saves changes on this computer. To connect your Atlas
            database, add your MongoDB connection string to{" "}
            <code>MONGODB_URI</code> in your private <code>.env</code> file,
            then restart Rolodex.
          </p>
          <p className="muted">
            Your database credentials stay on the server. Never paste them into
            your contacts or commit them to GitHub.
          </p>
        </Modal>
      )}
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
          <button
            className="icon"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
