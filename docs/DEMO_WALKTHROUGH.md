# Rolodex: from a half-remembered conversation to a useful catch-up

This two-minute walkthrough shows how MongoDB supplies relationship context to an AI assistant. All six interview contacts are fictional. A recording is not included yet; the sequence below is ready to demonstrate or record locally.

## Prepare the interview demo

Stop your server with Control+C and wait for the terminal prompt. From the updated project folder, run each command in order:

```sh
git pull origin main
npm install
npm run build
npm run demo:add
npm run search:prepare -- --share-notes
```

`demo:add` adds six clearly labelled fictional contacts to your configured store. It does not replace or edit existing contacts, and skips demo contacts already present. Fresh local installations also have more varied sample stories. Existing generic sample records are intentionally left untouched.

Preparation sends the configured store's eligible notes to OpenAI for embeddings, including any real notes you have added; it is not limited to the six demo contacts. See [sharing and indexing details](SEMANTIC_SEARCH.md). Wait for the Atlas index to become queryable before continuing.

Optionally run the evaluation below, then start the app:

```sh
npm start -- --port 4174
```

Open http://127.0.0.1:4174. Use fictional profiles only in the recording. Check that no personal notes or credentials are visible in neighbouring panels or browser tabs. The app is local; this URL is not a shareable hosted demo.

## Two-minute walkthrough

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:15 | Today, then People | “I built Rolodex because remembering someone's name is only half the problem. The useful context—what they are working on, what we discussed, and why I should reconnect—gets scattered.” |
| 0:15–0:35 | Open **Morgan Ellis · Demo** and show their profile notes | “Here, Morgan is leaving employment to establish a consultancy. I've saved the conversation in my own words. I might remember the idea later, without remembering Morgan's name.” |
| 0:35–1:00 | Open the assistant → Find by memory. Ask **Who was thinking about starting their own business?** | “I can search for what I remember. MongoDB Vector Search looks for related meaning in the stored notes. It can retrieve a consultancy conversation without needing the exact phrase 'starting a business'.” |
| 1:00–1:20 | Show Morgan's matching excerpt; choose Prepare a catch-up | “The product shows the original evidence so I can check the match. I choose the person, then the assistant uses their relationship history to help me prepare.” |
| 1:20–1:40 | Submit the catch-up question and review the generated response | “MongoDB supplies the saved context; the language model composes the answer. The assistant cannot send messages. I decide whether the suggestion is useful and what to share.” |
| 1:40–2:00 | Return to the source excerpt or show the public README | “This is a working personal prototype. The next question is whether semantic search finds relevant people more reliably than the existing text search. I've included a small evaluation and made the limitations explicit.” |

Only say a result was found if the live search actually returns it. If Morgan is not among the first results, try the query during rehearsal and report the result honestly; don't describe a scripted expected result as measured performance. Index readiness, other records, and query wording affect rankings.

## Optional MongoDB close-up

Show `people`, `interactions`, and the derived `relationship_memory` collection in Atlas. Explain that each searchable excerpt has a source identifier, a vector, and a content hash. The app checks results against current records to avoid presenting edited or deleted excerpts as evidence. Don't display your connection string or database credentials.

## Record real retrieval results

Once the six contacts and index are ready:

```sh
npm run search:evaluate -- --share-queries
```

This sends ten fixed fictional queries to OpenAI for embeddings and prints a Markdown results table. It does not print real contact names or saved notes. Nine queries have an expected contact; one deliberately unrelated query tests whether the nearest matches are unsupported. You can save the report locally with:

```sh
npm run --silent search:evaluate -- --share-queries > search-evaluation.md
```

Check the command succeeded and review the file before sharing it. A failed run must not be presented as a completed evaluation. No live scores are included in this repository yet: they require your private Atlas/API setup.

The comparison is with the existing MongoDB profile text search, not an optimised lexical system over identical fields. Semantic retrieval covers more fields, including conversations and life updates. The fixture is small and hand-authored, so these results illustrate behaviour, not general superiority. Review the returned evidence and catch-up wording yourself; the automated score measures expected-contact retrieval only.

## Sharing

Share the [project README](../README.md) with the interviewer. A recording link can be added near the top after recording and reviewing it. The repository does not contain a deployed app or completed demo video. The prototype has no authentication and must not be exposed as a public service without adding appropriate access controls and a separate fictional dataset.
