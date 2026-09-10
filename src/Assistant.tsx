import { useState } from "react";
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
import { askAssistant } from "./api";
import { Modal, Avatar } from "./ui";
import type { Editor } from "./Records";
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
  const person = data.people.find((p) => p.id === personId);
  const [question, setQuestion] = useState(
      person
        ? `Help me prepare a catch-up with ${person.name}, and draft a short message.`
        : "",
    ),
    [result, setResult] = useState<AssistantResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false),
    [draft, setDraft] = useState(""),
    [copied, setCopied] = useState(false);
  async function ask(q = question) {
    if (!q.trim() || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    setCopied(false);
    try {
      const r = await askAssistant(q, personId, consent);
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
      <div className="prompt-chips">
        {(person
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
            maxLength={2000}
            placeholder="Who’s slipped off my radar?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            className="primary"
            aria-label="Ask assistant"
            disabled={busy || !question.trim() || (aiEnabled && !consent)}
          >
            <ArrowUp size={19} />
          </button>
        </label>
        {aiEnabled && (
          <label className="check ai-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            Share this question and relevant saved names, notes, conversations,
            facts, and dates with OpenAI for this request.
          </label>
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
          {(result.personId || personId) && (
            <button
              className="text-button"
              onClick={() => {
                onEdit({
                  kind: "reminders",
                  personId: result.personId || personId!,
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
