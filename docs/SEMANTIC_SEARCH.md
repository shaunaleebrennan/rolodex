# Find by memory

Find people from a description of something they discussed, even when you cannot remember their name or exact words. Rolodex uses MongoDB Atlas Vector Search to retrieve saved excerpts, then lets you choose a person for catch-up preparation.

## Enable on your laptop

1. Pull the latest project changes. Keep your private `.env` with `MONGODB_URI`, `MONGODB_DB`, and `OPENAI_API_KEY` in the project root.
2. Install and build:

   ```sh
   npm install
   npm run build
   ```

3. Prepare the search data:

   ```sh
   npm run search:prepare -- --share-notes
   ```

   This explicitly sends profile work details, tags, notes, conversation notes, facts, and life updates to OpenAI for embeddings. Dedicated email, phone, photo, and name fields are not included in the embedding text, but freeform notes can contain personal information. Use fictional demo contacts when sharing a demonstration. Embedding API usage may incur charges. No secrets or raw provider errors are printed.

4. The command creates `relationship_memory` and requests the `relationship_memory_v1` vector index. Index creation is asynchronous. In Atlas, wait until that index is queryable/ready. If your database user cannot create search indexes, create a **Vector Search** index on the `relationship_memory` collection with the name above and this definition:

   ```json
   {
     "fields": [
       {
         "type": "vector",
         "path": "embedding",
         "numDimensions": 1536,
         "similarity": "cosine"
       }
     ]
   }
   ```

5. Stop the existing server with Ctrl+C and run `npm start`. Open the assistant, choose **Find by memory**, describe what you remember, enable AI features once, and search. Review the excerpts, then choose **Prepare a catch-up**. Review the new question before sending it. Your sharing choice is remembered across searches and catch-ups; use **AI enabled · Manage** to turn it off. Clearing browser storage or changing the app address/port requires enabling it again.

Rerun `search:prepare` after adding, editing, or deleting notes. It skips unchanged excerpts and removes obsolete ones. This prototype does not continuously send updates for embedding. Changed/deleted excerpts are filtered against current records at query time, even before reindexing. Old derived entries remain in the collection until preparation runs again. For an empty collection there are no matches; add notes first.

## What this demonstrates

- OpenAI `text-embedding-3-small` converts text into 1,536-dimensional vectors.
- MongoDB stores those vectors with source identifiers and content hashes in a derived collection, separate from editable source records.
- `$vectorSearch` retrieves up to 30 excerpts with 200 candidates; the app groups current matches into up to five people and shows up to three excerpts each.
- The assistant also has a read-only `search_relationship_memory` tool when MongoDB is configured. It can use semantic retrieval before preparing an answer.
- This is semantic retrieval, not hybrid rank fusion. Ordinary People search remains available.

Similarity is not a probability or proof of expertise. There is no calibrated relevance threshold: even an unrelated query can return nearest neighbours. The UI labels them as candidates and displays actual evidence. Snooze and opt-out govern due-contact recommendations, not user-initiated memory lookup. The full snapshot verification is intentionally suitable for a small personal dataset, not a claim of large-scale performance.

## Sample dataset and evaluation

Use [the walkthrough and evaluation commands](DEMO_WALKTHROUGH.md) to add six fictional contacts and run ten fixed queries. The optional manual example below is a smaller alternative.

## Small retrieval evaluation

Create three fictional contacts with these profile notes:

| Name | Saved note |
| --- | --- |
| Alex Demo | Led go-to-market for a conversational software assistant, including the beta programme and commercial release. |
| Morgan Demo | Leaving salaried employment to establish an independent consultancy. |
| Taylor Demo | Organises a weekend photography club and teaches portrait lighting. |

Run preparation again and wait for indexing. Compare ordinary People search with Find by memory:

| Query | Expected candidate | What to check |
| --- | --- | --- |
| experience launching an AI product | Alex Demo | Whether meaning-based retrieval finds the relevant excerpt without the same words. |
| starting their own business | Morgan Demo | Whether the consultancy note is in the top three candidates. |
| someone who can help me take better headshots | Taylor Demo | Whether portrait lighting is retrieved as related context. |
| Alex Demo | Alex Demo in ordinary search | Exact names remain a strong use case for ordinary search. |
| deep sea submarine maintenance | No supported expertise in these notes | Similarity may still return candidates; do not present them as qualified experts. |

Record top-three retrieval success, usefulness of the evidence, and response time. Also edit a note and confirm its old excerpt disappears, then reindex and confirm the new one is searchable. Delete a test contact and confirm it cannot appear. These are evaluation instructions, not claimed live results. Automated tests validate request handling, source freshness, and embedding shape with mocks; live Atlas retrieval quality must be measured separately. The cloud browser could not access the local test server, so this addition has not received a full browser walkthrough.

## Troubleshooting

- **Not ready:** preparation must run successfully and the vector index must be queryable. Index visibility can lag behind writes.
- **Key or limit error:** check your private key and API billing locally; never paste credentials into a chat.
- **No current matches:** try a different description and reindex after edits. Results do not prove that no suitable person exists.
- **Index creation fails:** check Atlas deployment support and database-user search-index permissions; use the manual definition above if needed. Do not alter an unrelated index.
- **Local demo:** semantic search requires MongoDB and embeddings. SQLite contact search and the existing offline helper continue to work.

References: [MongoDB Vector Search](https://www.mongodb.com/docs/vector-search/) · [OpenAI embeddings](https://developers.openai.com/api/docs/guides/embeddings)
