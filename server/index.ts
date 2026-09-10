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
import { kinds, type Kind } from "../shared/model.js";
const app = express();
app.disable("x-powered-by");
const token = randomBytes(32).toString("hex");
app.use(express.json({ limit: "3mb" }));
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Content-Type-Options", "nosniff");
  if (req.headers["sec-fetch-site"] === "cross-site")
    return res.status(403).json({ error: "Open Rolodex directly to use it." });
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers["x-rolodex-token"] !== token
  )
    return res.status(403).json({ error: "Refresh Rolodex and try again." });
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
} catch {
  console.error(
    "Database connection failed. Check your MongoDB URI, database user, and Atlas network access. No credentials have been logged.",
  );
  process.exit(1);
}
app.get("/api/state", async (_req, res) =>
  res.json({
    data: await store.snapshot(),
    mode: store.mode,
    aiEnabled: !!process.env.OPENAI_API_KEY,
    token,
  }),
);
app.get("/api/health", (_req, res) => res.json({ ok: true, mode: store.mode }));
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
    `Rolodex is ready at http://${host}:${port} (${store.mode === "mongodb" ? "MongoDB connected" : "local demo"})`,
  ),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(async () => {
      await store.close();
      process.exit(0);
    }),
  );
