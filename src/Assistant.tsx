import { useEffect, useState } from "react";
import {
  Sparkles,
  ArrowUp,
  ArrowRight,
  Check,
  Copy,
  Database,
  MessageCircle,
} from "lucide-react";
import type { Snapshot } from "../shared/model";
import type { AssistantResult } from "../server/assistant";
import type { MemoryMatch } from "../server/semantic";
import { askAssistant, findMemory } from "./api";
import { Modal, Avatar } from "./ui";
import type { Editor } from "./Records";
const consentKey = "rolodex.ai-sharing.v1";
function rememberedConsent() {
  try {
    return localStorage.getItem(consentKey) === "enabled";
  } catch {
    return false;
  }
}
export default function Assistant({
  data,
  personId,
  aiEnabled,
  onClose,
  onOpen,
  onEdit,
}: {
  data: Snapshot;
  personId?: string;
  aiEnabled: boolean;
  onClose: () => void;
  onOpen: (id: string) => void;
  onEdit: (e: Editor) => void;
}) {
  const [selectedId, setSelectedId] = useState(personId);
  const [memoryMode, setMemoryMode] = useState(false);
  const [matches, setMatches] = useState<MemoryMatch[] | null>(null);
  const person = data.people.find((p) => p.id === selectedId);
  const [question, setQuestion] = useState(
      person
        ? `Help me prepare a catch-up with ${person.name}, and draft a short message.`
        : "",
    ),
    [result, setResult] = useState<AssistantResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(rememberedConsent),
    [draft, setDraft] = useState(""),
    [copied, setCopied] = useState(false);
  const [manageSharing, setManageSharing] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === consentKey || event.key === null)
        setConsent(rememberedConsent());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function changeSharing(enabled: boolean) {
    setConsent(enabled);
    setManageSharing(false);
    setStorageNotice("");
    try {
      localStorage.setItem(consentKey, enabled ? "enabled" : "disabled");
    } catch {
      setStorageNotice(
        "Your browser couldn’t save this choice. It applies while this assistant is open.",
      );
    }
  }
  async function ask(q = question) {
    if (!q.trim() || busy || ((aiEnabled || memoryMode) && !consent)) return;
    setBusy(true);
    setError("");
    setResult(null);
    setMatches(null);
    setCopied(false);
    try {
      if (memoryMode) {
        const r = await findMemory(q, consent);
        setMatches(r.matches);
        return;
      }
      const r = await askAssistant(q, selectedId, consent);
      setResult(r);
      setDraft(r.draft || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="A thoughtful nudge" onClose={onClose} wide>
      <div className="assistant-intro">
        <span className="assistant-symbol">
          <Sparkles size={26} />
        </span>
        <div>
          <h3>
            {person
              ? "Make your next catch-up count."
              : "Who could use a hello?"}
          </h3>
          <p>
            {aiEnabled
              ? "Grounded in the people and moments you’ve saved."
              : "Offline helper · Uses saved records and message templates. Add an AI key to enable natural-language answers."}
          </p>
        </div>
      </div>
      {person && (
        <div className="assistant-person">
          <Avatar person={person} />
          <strong>{person.name}</strong>
          <span className={"circle-label " + person.circle.toLowerCase()}>
            {person.circle}
          </span>
        </div>
      )}
      <div className="prompt-chips" aria-label="Assistant mode">
        <button
          aria-pressed={!memoryMode}
          disabled={busy}
          onClick={() => {
            setMemoryMode(false);
            setMatches(null);
            setError("");
          }}
        >
          Prepare a catch-up
        </button>
        <button
          aria-pressed={memoryMode}
          disabled={busy}
          onClick={() => {
            setMemoryMode(true);
            setQuestion("");
            setResult(null);
            setError("");
          }}
        >
          Find by memory
        </button>
      </div>
      {memoryMode && (
        <p>
          Describe what you remember. Search by meaning across indexed notes,
          conversations, and life updates. Matches are suggestions—check the
          excerpts. New or edited notes appear after refreshing the search
          index.
        </p>
      )}
      <div className="prompt-chips">
        {(memoryMode
          ? [
              "Who has experience launching an AI product?",
              "Who was thinking about starting their own business?",
            ]
          : person
            ? ["What should I ask about?", "Draft a friendly catch-up message"]
            : [
                "Who should I reconnect with this week?",
                "Help me prepare my next catch-up",
              ]
        ).map((q) => (
          <button key={q} onClick={() => setQuestion(q)}>
            {q}
            <ArrowRight size={13} />
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <label className="assistant-input">
          <span className="sr-only">Ask your relationship assistant</span>
          <textarea
            autoFocus
            rows={3}
            maxLength={memoryMode ? 1000 : 2000}
            placeholder={
              memoryMode
                ? "Who was that person who…?"
                : "Who’s slipped off my radar?"
            }
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            className="primary"
            aria-label="Ask assistant"
            disabled={
              busy ||
              !question.trim() ||
              ((aiEnabled || memoryMode) && !consent)
            }
          >
            <ArrowUp size={19} />
          </button>
        </label>
        {(aiEnabled || memoryMode || consent) && (
          <div className="ai-consent">
            {consent ? (
              <p>
                AI enabled ·{" "}
                <button
                  type="button"
                  className="text-button"
                  aria-expanded={manageSharing}
                  onClick={() => setManageSharing(!manageSharing)}
                >
                  Manage
                </button>
              </p>
            ) : (
              <h3>Enable AI features?</h3>
            )}
            {(!consent || manageSharing) && (
              <div>
                <p>
                  Your questions and relevant saved names, notes, conversations,
                  facts, and dates will be shared with OpenAI when you use AI
                  features. Find by memory shares your search query to find
                  matching notes.
                </p>
                <p>
                  Remember this choice in this browser. You can turn sharing off
                  here anytime.
                </p>
                <button
                  type="button"
                  className={consent ? "secondary" : "primary"}
                  disabled={busy}
                  onClick={() => changeSharing(!consent)}
                >
                  {consent ? "Turn off AI sharing" : "Enable AI features"}
                </button>
                {consent && busy && (
                  <p>
                    The current request has already been sent. You can turn off
                    sharing when it finishes.
                  </p>
                )}
              </div>
            )}
            {storageNotice && <p role="status">{storageNotice}</p>}
          </div>
        )}
      </form>
      {busy && (
        <div className="assistant-loading">
          <Sparkles size={19} />
          <p>Looking through your saved relationship history…</p>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {matches && (
        <div className="source-list" aria-live="polite">
          <h3>
            {matches.length
              ? "People to explore"
              : "No current indexed memories found"}
          </h3>
          <p>
            {matches.length
              ? "Ranked by semantic similarity, not proof of expertise. Read the saved evidence before choosing."
              : "Try different wording or refresh the index after adding notes. This does not mean nobody in your network fits."}
          </p>
          {matches.map((m) => (
            <div className="source-row" key={m.personId}>
              <strong>{m.name}</strong>
              {m.evidence.map((e, i) => (
                <div key={i}>
                  <small>{e.label}</small>
                  <p>{e.text}</p>
                </div>
              ))}
              <button
                className="secondary"
                onClick={() => {
                  setSelectedId(m.personId);
                  setMemoryMode(false);
                  setMatches(null);
                  setQuestion(
                    `Help me prepare a catch-up with ${m.name} about: ${question}. Use saved notes, and distinguish evidence from assumptions.`,
                  );
                }}
              >
                Prepare a catch-up <ArrowRight size={13} />
              </button>
              <button
                className="text-button"
                onClick={() => {
                  onOpen(m.personId);
                  onClose();
                }}
              >
                Open profile
              </button>
            </div>
          ))}
        </div>
      )}
      {result && (
        <div className="assistant-result">
          <div className="result-label">
            <Sparkles size={16} />
            {result.mode === "ai" ? "AI answer" : "From your saved records"}
          </div>
          <div className="answer-text">{result.answer}</div>
          {result.draft && (
            <div className="draft-card">
              <h3>A starting point for your message</h3>
              <textarea
                aria-label="Message draft"
                rows={4}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="draft-actions">
                <small>Edit it to sound like you.</small>
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(draft);
                      setCopied(true);
                    } catch {
                      setError("Select the message text and copy it manually.");
                    }
                  }}
                >
                  <Copy size={15} />
                  {copied ? "Copied" : "Copy draft"}
                </button>
              </div>
            </div>
          )}
          <details className="source-list" open>
            <summary>
              <Database size={15} />
              Based on {result.sources.length} saved{" "}
              {result.sources.length === 1 ? "relationship" : "relationships"}
            </summary>
            {result.sources.map((s) => (
              <div key={s.id} className="source-row">
                <button
                  onClick={() => {
                    onOpen(s.id);
                    onClose();
                  }}
                >
                  {s.name}
                  <ArrowRight size={13} />
                </button>
                {s.details.map((d, i) => (
                  <small key={i}>{d}</small>
                ))}
              </div>
            ))}
          </details>
          <details className="assistant-steps">
            <summary>How this was prepared</summary>
            {Array.from(new Set(result.steps)).map((s) => (
              <p key={s}>
                <Check size={13} />
                {s}
              </p>
            ))}
          </details>
          <p className="assistant-note">
            Nothing has been sent. Review the wording and any personal details
            before sharing.
          </p>
          {(result.personId || selectedId) && (
            <button
              className="text-button"
              onClick={() => {
                onEdit({
                  kind: "reminders",
                  personId: result.personId || selectedId!,
                });
                onClose();
              }}
            >
              Set a follow-up reminder
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
