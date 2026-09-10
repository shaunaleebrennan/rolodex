import type { Snapshot, Kind, Entities } from "../shared/model";
let token = "";
async function request(url: string, options: RequestInit = {}) {
  const r = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Rolodex-Token": token,
      ...options.headers,
    },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Unable to save. Please try again.");
  return data;
}
export type AuthSession = {
  authenticated: boolean;
  authEnabled: boolean;
  login?: string;
};
export async function getAuthSession(): Promise<AuthSession> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to check sign-in status.");
  return response.json();
}
export async function logout() {
  const response = await fetch("/auth/logout", {
    method: "POST",
    headers: { "X-Rolodex-Token": token },
  });
  if (!response.ok) throw new Error("Unable to sign out. Please try again.");
  token = "";
}
export async function getState(): Promise<{
  data: Snapshot;
  mode: "mongodb" | "local";
  aiEnabled: boolean;
}> {
  const data = await request("/api/state");
  token = data.token;
  return data;
}
export const saveRecord = <K extends Kind>(
  kind: K,
  data: unknown,
  id?: string,
): Promise<Entities[K]> =>
  request("/api/records/" + kind + (id ? "/" + id : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(data),
  });
export const deleteRecord = (kind: Kind, id: string) =>
  request("/api/records/" + kind + "/" + id, { method: "DELETE" });
export const askAssistant = (
  question: string,
  personId?: string,
  shareContext = false,
) =>
  request("/api/assistant", {
    method: "POST",
    body: JSON.stringify({ question, personId, shareContext }),
  });

export const findMemory = (query: string, shareContext: boolean) =>
  request("/api/memory-search", {
    method: "POST",
    body: JSON.stringify({ query, shareContext }),
  });
