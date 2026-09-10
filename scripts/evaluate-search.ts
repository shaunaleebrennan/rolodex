import "dotenv/config";
import { Store } from "../server/store.js";
import { demoPeople, demoQueries, demoTag } from "../server/demo.js";
import { searchMemory } from "../server/semantic.js";
if (!process.argv.includes("--share-queries")) {
  console.log(
    "This evaluation sends ten fictional search questions to OpenAI for embeddings. It does not send your saved notes or generate AI answers. Usage may incur charges. Run npm run search:evaluate -- --share-queries",
  );
  process.exit(1);
}
const store = new Store({
  uri: process.env.MONGODB_URI,
  database: process.env.MONGODB_DB,
});
try {
  await store.open();
  const people = await store.list("people");
  const fixture = demoPeople.map((d) =>
    people.find(
      (p) =>
        (p.name === d.name || p.name === `${d.name} · Demo`) &&
        p.tags.includes(demoTag),
    ),
  );
  if (fixture.some((p) => !p)) throw new Error("missing fixture");
  const rows: string[] = [];
  let lexicalHits = 0,
    semanticHits = 0;
  for (const item of demoQueries) {
    const start = performance.now();
    const semantic = await searchMemory(
      store,
      { query: item.query, shareContext: true },
      { key: process.env.OPENAI_API_KEY },
    );
    const elapsed = Math.round(performance.now() - start);
    const lexical = await store.searchPeople(item.query);
    if (item.expected === null) {
      rows.push(
        `| ${item.query} | No supported expertise | — | ${semantic.length} candidates returned; inspect for irrelevance | ${elapsed} |`,
      );
      continue;
    }
    const id = fixture[item.expected]!.id;
    const l = lexical.slice(0, 3).some((p) => p.id === id),
      v = semantic.slice(0, 3).some((p) => p.personId === id);
    lexicalHits += Number(l);
    semanticHits += Number(v);
    rows.push(
      `| ${item.query} | ${demoPeople[item.expected].name} | ${l ? "Hit" : "Miss"} | ${v ? "Hit" : "Miss"} | ${elapsed} |`,
    );
  }
  console.log(
    "# Rolodex retrieval evaluation\n\nRun: " + new Date().toISOString(),
  );
  console.log(
    "\nSmall, hand-authored fixture; not a general benchmark. Baseline is the existing MongoDB text search over profiles, not hybrid search or the exact browser substring filter. Semantic search also covers conversations and updates. Other contacts in the database may affect ranking. Timing includes query embedding, Atlas retrieval, and freshness verification.\n",
  );
  console.log(
    "| Query | Expected | Profile text top 3 | Semantic top 3 | Semantic ms |\n| --- | --- | --- | --- | --- |",
  );
  console.log(rows.join("\n"));
  console.log(
    `\nPositive-query hits: profile text ${lexicalHits}/9; semantic ${semanticHits}/9. The unrelated tenth query is a qualitative false-positive check. Review excerpts and generated answers separately. No saved personal notes or non-fixture names are printed.`,
  );
} catch {
  console.error(
    "Evaluation could not finish. Confirm MongoDB and AI configuration, run demo:add, prepare the index, and wait until it is ready. No scores are claimed for an incomplete run.",
  );
  process.exitCode = 1;
} finally {
  await store.close();
}
