import { DatabaseSync } from "node:sqlite";
import { MongoClient, type Db } from "mongodb";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import {
  kinds,
  schemas,
  type Kind,
  type Entities,
  type Snapshot,
  emptySnapshot,
} from "../shared/model.js";
export class InputError extends Error {
  status = 400;
}
export class Store {
  readonly mode: "mongodb" | "local";
  private sql?: DatabaseSync;
  private mongo?: MongoClient;
  private db?: Db;
  constructor(
    private options: { uri?: string; database?: string; file?: string } = {},
  ) {
    this.mode = options.uri ? "mongodb" : "local";
  }
  async open() {
    if (this.options.uri) {
      this.mongo = new MongoClient(this.options.uri, {
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 10,
      });
      await this.mongo.connect();
      this.db = this.mongo.db(this.options.database || "rolodex");
      await this.db.command({ ping: 1 });
      for (const kind of kinds) {
        await this.db.collection(kind).createIndex({ id: 1 }, { unique: true });
        if (kind !== "people")
          await this.db.collection(kind).createIndex({ personId: 1 });
      }
      await this.db.collection("people").createIndex({ circle: 1, tags: 1 });
      await this.db.collection("people").createIndex({
        name: "text",
        company: "text",
        email: "text",
        notes: "text",
        tags: "text",
      });
      await this.db
        .collection("interactions")
        .createIndex({ personId: 1, date: -1 });
      await this.db.collection("reminders").createIndex({ done: 1, date: 1 });
      await this.db.collection("connections").createIndex({ otherId: 1 });
    } else {
      const file = this.options.file || "data/rolodex.sqlite";
      if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
      this.sql = new DatabaseSync(file);
      this.sql.exec(
        "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS documents (kind TEXT NOT NULL, id TEXT NOT NULL, body TEXT NOT NULL, PRIMARY KEY(kind,id))",
      );
    }
    return this;
  }
  async list<K extends Kind>(kind: K): Promise<Entities[K][]> {
    if (this.db)
      return (await this.db
        .collection(kind)
        .find({}, { projection: { _id: 0 } })
        .toArray()) as unknown as Entities[K][];
    return this.sql!.prepare("SELECT body FROM documents WHERE kind=?")
      .all(kind)
      .map((r) => JSON.parse(r.body as string));
  }
  async get<K extends Kind>(kind: K, id: string): Promise<Entities[K] | null> {
    if (this.db)
      return (await this.db
        .collection(kind)
        .findOne({ id }, { projection: { _id: 0 } })) as unknown as
        Entities[K] | null;
    const row = this.sql!.prepare(
      "SELECT body FROM documents WHERE kind=? AND id=?",
    ).get(kind, id);
    return row ? JSON.parse(row.body as string) : null;
  }
  async save<K extends Kind>(
    kind: K,
    input: unknown,
    id?: string,
  ): Promise<Entities[K]> {
    const data = schemas[kind].parse(input);
    const existing = id ? await this.get(kind, id) : null;
    if (id && !existing) throw new InputError("Record no longer exists");
    if ("personId" in data && !(await this.get("people", data.personId)))
      throw new InputError("Person no longer exists");
    if ("otherId" in data && !(await this.get("people", data.otherId)))
      throw new InputError("Connected person no longer exists");
    if (
      kind === "interactions" &&
      (data as Entities["interactions"]).date >
        new Date().toLocaleDateString("en-CA")
    )
      throw new InputError(
        "Log a past or current interaction; use a reminder for future plans",
      );
    if (kind === "reminders") {
      const r = data as Entities["reminders"];
      r.completedAt = r.done
        ? (existing as Entities["reminders"] | null)?.completedAt ||
          new Date().toISOString()
        : null;
    }
    const doc = {
      ...data,
      id: id || randomUUID(),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Entities[K];
    if (this.db)
      await this.db
        .collection(kind)
        .replaceOne({ id: doc.id }, doc as any, { upsert: true });
    else
      this.sql!.prepare(
        "INSERT OR REPLACE INTO documents(kind,id,body) VALUES(?,?,?)",
      ).run(kind, doc.id, JSON.stringify(doc));
    return doc;
  }
  async remove(kind: Kind, id: string) {
    if (this.db) {
      if (kind === "people") {
        const session = this.mongo!.startSession();
        try {
          await session.withTransaction(async () => {
            await this.db!.collection("people").deleteOne({ id }, { session });
            for (const k of kinds.filter((k) => k !== "people"))
              await this.db!.collection(k).deleteMany(
                k === "connections"
                  ? { $or: [{ personId: id }, { otherId: id }] }
                  : { personId: id },
                { session },
              );
          });
        } finally {
          await session.endSession();
        }
      } else await this.db.collection(kind).deleteOne({ id });
    } else {
      this.sql!.exec("BEGIN");
      try {
        this.sql!.prepare("DELETE FROM documents WHERE kind=? AND id=?").run(
          kind,
          id,
        );
        if (kind === "people")
          this.sql!.prepare(
            "DELETE FROM documents WHERE kind!='people' AND (json_extract(body,'$.personId')=? OR json_extract(body,'$.otherId')=?)",
          ).run(id, id);
        this.sql!.exec("COMMIT");
      } catch (e) {
        this.sql!.exec("ROLLBACK");
        throw e;
      }
    }
  }
  async snapshot(): Promise<Snapshot> {
    const data = emptySnapshot();
    await Promise.all(
      kinds.map(async (kind) => {
        (data[kind] as any) = await this.list(kind);
      }),
    );
    return data;
  }
  async searchPeople(query: string) {
    if (this.db && query.trim())
      return (await this.db
        .collection("people")
        .find(
          { $text: { $search: query } },
          { projection: { _id: 0, score: { $meta: "textScore" } } },
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(20)
        .toArray()) as unknown as Entities["people"][];
    const q = query.toLowerCase();
    return (await this.list("people"))
      .filter((p) =>
        [p.name, p.email, p.company, p.notes, ...p.tags]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 20);
  }
  memoryCollection() {
    if (!this.db)
      throw new InputError("Semantic search requires MongoDB Atlas");
    return this.db.collection("relationship_memory");
  }
  async requireMemoryIndex() {
    try {
      const indexes = (await this.memoryCollection()
        .listSearchIndexes("relationship_memory_v1")
        .toArray()) as { name: string; queryable?: boolean }[];
      if (!indexes.some((i) => i.queryable === true)) throw new Error();
    } catch {
      throw new InputError(
        "Find by memory is not ready. Run npm run search:prepare -- --share-notes, then wait for the Atlas search index to become queryable. See docs/SEMANTIC_SEARCH.md.",
      );
    }
  }
  async vectorMemories(vector: number[]) {
    try {
      return await this.memoryCollection()
        .aggregate<{ id: string; hash: string }>([
          {
            $vectorSearch: {
              index: "relationship_memory_v1",
              path: "embedding",
              queryVector: vector,
              numCandidates: 200,
              limit: 30,
            },
          },
          { $project: { _id: 0, id: 1, hash: 1 } },
        ])
        .toArray();
    } catch {
      throw new InputError(
        "Memory search is unavailable. Check the Atlas index and refresh it with search:prepare. Ordinary contact search still works.",
      );
    }
  }
  async monthlyInteractions() {
    if (this.db)
      return this.db
        .collection("interactions")
        .aggregate([
          {
            $group: {
              _id: { $substrBytes: ["$date", 0, 7] },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();
    const counts: Record<string, number> = {};
    for (const i of await this.list("interactions"))
      counts[i.date.slice(0, 7)] = (counts[i.date.slice(0, 7)] || 0) + 1;
    return Object.entries(counts)
      .sort()
      .map(([_id, count]) => ({ _id, count }));
  }
  async initialized() {
    if (this.db)
      return !!(await this.db
        .collection("_meta")
        .findOne({ id: "initialized" }));
    return !!this.sql!.prepare(
      "SELECT id FROM documents WHERE kind='_meta' AND id='initialized'",
    ).get();
  }
  async markInitialized() {
    if (this.db)
      await this.db
        .collection("_meta")
        .updateOne(
          { id: "initialized" },
          { $set: { date: new Date().toISOString() } },
          { upsert: true },
        );
    else
      this.sql!.prepare(
        "INSERT OR REPLACE INTO documents(kind,id,body) VALUES('_meta','initialized','{}')",
      ).run();
  }
  async close() {
    this.sql?.close();
    await this.mongo?.close();
  }
}
