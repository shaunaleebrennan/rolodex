import type { Snapshot } from "../shared/model";
import { whoToContact } from "../shared/logic";
export function registerTools(
  getData: () => Snapshot,
  openPerson: (id: string) => void,
) {
  const context = (document as any).modelContext;
  if (!context?.registerTool) return () => {};
  const life = new AbortController();
  const tools = [
    {
      name: "list_due_contacts",
      title: "List people due for a catch-up",
      description:
        "Read contacts who are due, overdue, or have no logged interaction. Respects snoozing and opt-out.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute(input: unknown) {
        if (!input || typeof input !== "object" || Object.keys(input).length)
          throw new Error("Expected an empty object");
        return whoToContact(getData()).map((d) => ({
          id: d.person.id,
          name: d.person.name,
          status: d.status,
          daysUntilDue: d.days,
        }));
      },
    },
    {
      name: "open_contact",
      title: "Open a person",
      description:
        "Navigate to a saved person’s profile. Does not edit or send anything.",
      inputSchema: {
        type: "object",
        properties: { personId: { type: "string" } },
        required: ["personId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: any) {
        if (
          !input ||
          typeof input.personId !== "string" ||
          Object.keys(input).some((k) => k !== "personId")
        )
          throw new Error("Supply a personId");
        const p = getData().people.find((p) => p.id === input.personId);
        if (!p) throw new Error("Contact not found");
        openPerson(p.id);
        return { opened: p.id, name: p.name };
      },
    },
  ];
  for (const tool of tools)
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: life.signal }),
      ).catch(() => {});
    } catch {
      /* Unsupported experimental API: standard UI remains available. */
    }
  return () => life.abort();
}
