import "dotenv/config";
import express from "express";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createServer as createViteServer } from "vite";
import { ZodError } from "zod";
import { Store } from "./store.js";
import { seed } from "./seed.js";
import { searchMemory } from "./semantic.js";
import { respond } from "./assistant.js";
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE_SECONDS,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  cookieOptions,
  createOAuthState,
  createSignedValue,
  getAuthConfig,
  hasValidCsrfToken,
  isAuthorizedSession,
  isAllowedLogin,
  isPublicReadOnlyApiRequest,
  sessionFromCookie,
  validOAuthState,
} from "./auth.js";
import { kinds, type Kind } from "../shared/model.js";

const auth = getAuthConfig();
const app = express();
app.disable("x-powered-by");
const token = randomBytes(32).toString("hex");

function databaseFailureCode(error: unknown) {
  const codes: string[] = [];
  const names: string[] = [];
  let current = error;
  for (let depth = 0; depth < 3 && current && typeof current === "object"; depth++) {
    const detail = current as {
      code?: unknown;
      name?: unknown;
      cause?: unknown;
    };
    if (typeof detail.code === "string" || typeof detail.code === "number")
      codes.push(String(detail.code));
    if (typeof detail.name === "string") names.push(detail.name);
    current = detail.cause;
  }
  if (codes.includes("18")) return "AUTHENTICATION_18";
  if (codes.includes("ENOTFOUND")) return "DNS_ENOTFOUND";
  if (codes.some((code) => /TIMEOUT|ETIMEDOUT/.test(code)))
    return "NETWORK_TIMEOUT";
  if (codes.includes("ECONNREFUSED")) return "NETWORK_REFUSED";
  if (names.includes("MongoParseError")) return "URI_PARSE";
  if (names.includes("MongoServerSelectionError"))
    return "SERVER_SELECTION_TIMEOUT";
  return "CONNECTION_FAILED";
}

app.use((_req, res, next) => {
  res.set("Referrer-Policy", "no-referrer");
  res.set("X-Content-Type-Options", "nosniff");
  next();
});
app.use(express.json({ limit: "3mb" }));

const setCookie = (
  res: express.Response,
  name: string,
  value: string,
  maxAge: number,
) => res.append("Set-Cookie", `${name}=${value}; ${cookieOptions(maxAge, auth.production)}`);
const clearCookie = (res: express.Response, name: string) =>
  setCookie(res, name, "", 0);
const authFailure = (res: express.Response) =>
  res.redirect(303, "/?auth=failed");

app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/auth/session", (req, res) => {
  const session = sessionFromCookie(req.headers.cookie, auth);
  const authenticated = isAuthorizedSession(session, auth);
  res.set("Cache-Control", "no-store");
  res.json({
    authenticated,
    authEnabled: auth.enabled,
    login: auth.enabled && authenticated ? session?.login : undefined,
  });
});
app.get("/auth/login", (_req, res) => {
  if (!auth.enabled) return res.status(404).end();
  const state = createOAuthState();
  setCookie(
    res,
    OAUTH_STATE_COOKIE,
    createSignedValue(state, auth.secret),
    OAUTH_STATE_MAX_AGE_SECONDS,
  );
  const authorization = new URL("https://github.com/login/oauth/authorize");
  authorization.searchParams.set("client_id", auth.clientId);
  authorization.searchParams.set("redirect_uri", auth.callbackUrl);
  authorization.searchParams.set("scope", "read:user");
  authorization.searchParams.set("state", state.value);
  res.redirect(303, authorization.toString());
});
app.get("/auth/callback", async (req, res) => {
  if (
    !auth.enabled ||
    typeof req.query.state !== "string" ||
    !validOAuthState(req.query.state, req.headers.cookie, auth)
  ) {
    clearCookie(res, OAUTH_STATE_COOKIE);
    return authFailure(res);
  }
  clearCookie(res, OAUTH_STATE_COOKIE);
  if (typeof req.query.code !== "string" || req.query.error) return authFailure(res);
  try {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: auth.clientId,
          client_secret: auth.clientSecret,
          code: req.query.code,
          redirect_uri: auth.callbackUrl,
        }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const tokenData = (await tokenResponse.json()) as { access_token?: unknown };
    if (!tokenResponse.ok || typeof tokenData.access_token !== "string")
      return authFailure(res);
    const profileResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "shauna-rolodex",
      },
      signal: AbortSignal.timeout(10_000),
    });
    const profile = (await profileResponse.json()) as { login?: unknown };
    if (
      !profileResponse.ok ||
      !isAllowedLogin(profile.login, auth.allowedLogin)
    )
      return authFailure(res);
    setCookie(
      res,
      SESSION_COOKIE,
      createSignedValue(
        {
          login: profile.login,
          expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
        },
        auth.secret,
      ),
      SESSION_MAX_AGE_SECONDS,
    );
    res.redirect(303, "/");
  } catch {
    authFailure(res);
  }
});
app.post("/auth/logout", (req, res) => {
  const session = sessionFromCookie(req.headers.cookie, auth);
  if (!isAuthorizedSession(session, auth))
    return res.status(401).json({ error: "Sign in to edit this rolodex." });
  if (req.headers["sec-fetch-site"] === "cross-site")
    return res.status(403).json({ error: "Open shauna-rolodex directly to use it." });
  if (
    !hasValidCsrfToken(
      req.method,
      req.headers["x-rolodex-token"],
      token,
    )
  )
    return res.status(403).json({ error: "Refresh shauna-rolodex and try again." });
  clearCookie(res, SESSION_COOKIE);
  clearCookie(res, OAUTH_STATE_COOKIE);
  res.status(204).end();
});
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Content-Type-Options", "nosniff");
  if (isPublicReadOnlyApiRequest(req.method, req.path)) return next();
  if (req.headers["sec-fetch-site"] === "cross-site")
    return res.status(403).json({ error: "Open shauna-rolodex directly to use it." });
  if (!isAuthorizedSession(sessionFromCookie(req.headers.cookie, auth), auth))
    return res.status(401).json({ error: "Sign in to edit this rolodex." });
  if (
    !hasValidCsrfToken(
      req.method,
      req.headers["x-rolodex-token"],
      token,
    )
  )
    return res.status(403).json({ error: "Refresh shauna-rolodex and try again." });
  next();
});
const store = new Store({
  uri: process.env.MONGODB_URI,
  database: process.env.MONGODB_DB,
});
try {
  await store.open();
  if (!(await store.initialized())) {
    if (process.env.SEED_DEMO !== "false") await seed(store);
    await store.markInitialized();
  }
} catch (error) {
  console.error(
    `Database connection failed (${databaseFailureCode(error)}). Check your MongoDB URI, database user, and Atlas network access. No credentials have been logged.`,
  );
  process.exit(1);
}
app.get("/api/state", async (req, res) => {
  const authenticated = isAuthorizedSession(
    sessionFromCookie(req.headers.cookie, auth),
    auth,
  );
  res.json({
    data: await store.snapshot(),
    mode: store.mode,
    aiEnabled: authenticated && !!process.env.OPENAI_API_KEY,
    ...(authenticated ? { token } : {}),
  });
});
app.get("/api/stats", async (_req, res) =>
  res.json(await store.monthlyInteractions()),
);
app.post("/api/records/:kind", async (req, res) => {
  if (!kinds.includes(req.params.kind as Kind))
    return res.status(404).json({ error: "Unknown record type" });
  res.status(201).json(await store.save(req.params.kind as Kind, req.body));
});
app.put("/api/records/:kind/:id", async (req, res) => {
  if (!kinds.includes(req.params.kind as Kind))
    return res.status(404).json({ error: "Unknown record type" });
  res.json(await store.save(req.params.kind as Kind, req.body, req.params.id));
});
app.delete("/api/records/:kind/:id", async (req, res) => {
  if (!kinds.includes(req.params.kind as Kind))
    return res.status(404).json({ error: "Unknown record type" });
  await store.remove(req.params.kind as Kind, req.params.id);
  res.json({ ok: true });
});
// Additional feature routes are registered here before the frontend fallback.
let assistantBusy = false;
app.post("/api/memory-search", async (req, res, next) => {
  if (assistantBusy)
    return res
      .status(429)
      .json({ error: "One request is already running. Please wait." });
  assistantBusy = true;
  try {
    res.json({
      matches: await searchMemory(store, req.body, {
        key: process.env.OPENAI_API_KEY,
      }),
    });
  } catch (e) {
    next(e);
  } finally {
    assistantBusy = false;
  }
});
app.post("/api/assistant", async (req, res, next) => {
  if (assistantBusy)
    return res.status(429).json({
      error: "One request is already running. Please wait for it to finish.",
    });
  assistantBusy = true;
  try {
    res.json(
      await respond(store, req.body, {
        key: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL,
      }),
    );
  } catch (e) {
    next(e);
  } finally {
    assistantBusy = false;
  }
});
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Unknown endpoint" }),
);
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof ZodError)
      return res
        .status(400)
        .json({ error: err.issues.map((i) => i.message).join(". ") });
    res.status(err.status || 500).json({
      error:
        err.status === 400
          ? err.message
          : "Something went wrong. Your change was not confirmed. Please try again.",
    });
  },
);
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
};
const port = Number(arg("--port") || process.env.PORT || 4173);
const host = arg("--host") || process.env.HOST || "127.0.0.1";
if (existsSync("dist/index.html")) {
  app.use(express.static(resolve("dist")));
  app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: false },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const server = app.listen(port, host, () =>
  console.log(
    `shauna-rolodex is ready at http://${host}:${port} (${store.mode === "mongodb" ? "MongoDB connected" : "local demo"})`,
  ),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(async () => {
      await store.close();
      process.exit(0);
    }),
  );
