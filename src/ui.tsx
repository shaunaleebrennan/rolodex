import { useEffect, useRef, type ReactNode } from "react";
import { X, Plus } from "lucide-react";
import type { Person } from "../shared/model";
export function Avatar({
  person,
  size = "normal",
}: {
  person: Pick<Person, "name" | "photo">;
  size?: "normal" | "large" | "small";
}) {
  const hue = [205, 34, 270, 165][
    Array.from(person.name).reduce((a, b) => a + b.charCodeAt(0), 0) % 4
  ];
  return person.photo ? (
    <img className={"avatar " + size} src={person.photo} alt="" />
  ) : (
    <span
      className={"avatar " + size}
      style={{
        background: `hsl(${hue} 48% 92%)`,
        color: `hsl(${hue} 55% 30%)`,
      }}
      aria-hidden="true"
    >
      {person.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join("")}
    </span>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? "modal wide" : "modal"}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button className="icon" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "field span2" : "field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <header className="section-head">
        <h2>{title}</h2>
        {action && (
          <button
            className="icon"
            aria-label={"Add " + title.toLowerCase()}
            onClick={action}
          >
            <Plus size={18} />
          </button>
        )}
      </header>
      {children}
    </section>
  );
}
