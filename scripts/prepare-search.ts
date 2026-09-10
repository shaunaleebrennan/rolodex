import "dotenv/config";
import { Store, InputError } from "../server/store.js";
import {
  memories,
  embed,
  dimensions,
  embeddingModel,
  vectorIndex,
} from "../server/semantic.js";
if (!process.argv.includes("--share-notes")) {
  console.log(
    "This command sends saved profile work details, tags, notes, conversations, facts and life updates to OpenAI for embeddings. Dedicated email/phone/photo fields are excluded; notes may contain personal details. API usage may incur charges. To proceed: npm run search:prepare -- --share-notes",
  );
  process.exit(1);
}
const store = new Store({
  uri: process.env.MONGODB_URI,
  database: process.env.MONGODB_DB,
});
try {
  if (!process.env.MONGODB_URI || !process.env.OPENAI_API_KEY)
    throw new InputError(
      "Set MONGODB_URI and OPENAI_API_KEY in your private .env first.",
    );
  await store.open();
  const c = store.memoryCollection();
  await c.createIndex({ id: 1 }, { unique: true });
  const docs = memories(await store.snapshot());
  await c.deleteMany({ id: { $nin: docs.map((d) => d.id) } });
  let updated = 0;
  for (const doc of docs) {
    if (await c.findOne({ id: doc.id, hash: doc.hash, model: embeddingModel }))
      continue;
    const embedding = await embed(doc.text, process.env.OPENAI_API_KEY);
    await c.replaceOne(
      { id: doc.id },
      { ...doc, embedding, model: embeddingModel },
      { upsert: true },
    );
    updated++;
    if (updated % 20 === 0)
      console.log(`Prepared ${updated} changed excerpts…`);
  }
  const indexes = await c.listSearchIndexes(vectorIndex).toArray();
  if (!indexes.length)
    await c.createSearchIndex({
      name: vectorIndex,
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: dimensions,
            similarity: "cosine",
          },
        ],
      },
    });
  console.log(
    `Prepared ${docs.length} excerpts; ${updated} embeddings updated. Wait until the Atlas index is queryable, then use Find by memory. Rerun after editing notes; unchanged excerpts are skipped.`,
  );
} catch (e) {
  console.error(
    e instanceof InputError
      ? e.message
      : "Search preparation failed. Check Atlas connectivity and search-index permissions. No raw provider error or credentials have been logged. See docs/SEMANTIC_SEARCH.md.",
  );
  process.exitCode = 1;
} finally {
  await store.close();
}
