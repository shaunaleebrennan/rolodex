# Rolodex

A thoughtful personal CRM: keep track of your people, remember what matters, and reconnect before relationships drift. Built with React, TypeScript, Vite, Node.js, and MongoDB.

## Start here

Install **Node.js 24 LTS**. Open this project folder in VS Code, then open **Terminal → New Terminal**.

First-time setup:

```sh
npm install
```

Start the app:

```sh
npm start
```

Open **http://localhost:4173**. The app starts with 32 fictional contacts, conversation history, birthdays, facts, reminders, gifts, and connections. No database account or AI key is needed to try it. Changes persist in a local SQLite demo database (`data/rolodex.sqlite`), not in browser storage.

To use the compiled app, run `npm run build` once, then `npm start`. When a build exists, the server serves that build; rebuild after editing frontend code. Without a build, it serves Vite directly.

## Connect your MongoDB Atlas account

**The connection string goes in a file called `.env` in this project folder, beside `package.json`. It does not go in the React app or into MongoDB’s editor.**

1. In VS Code, duplicate `.env.example` and name the copy `.env`.
2. In Atlas, open your cluster → **Connect → Drivers** and select **Node.js**.
3. Copy the connection string into `MONGODB_URI` in `.env`. Replace the password placeholder with your **database user’s** password (not your Atlas website password). URL-encode special characters in the username or password.
4. In Atlas Network Access, allow the IP address of the computer running this app. Give the database user read/write access to the `rolodex` database.
5. Run `npm run check:db`. It checks connectivity without printing credentials.
6. Stop the running app with **Ctrl+C**, then start it again with `npm start`.

```dotenv
MONGODB_URI=mongodb+srv://YOUR_DATABASE_USER:YOUR_ENCODED_PASSWORD@YOUR_CLUSTER_HOST/?retryWrites=true&w=majority
MONGODB_DB=rolodex
SEED_DEMO=true
```

The sidebar changes to **MongoDB connected**. Collections and indexes are created on first startup. You can inspect records in Atlas’s data browser after saving a contact.

**Switching databases does not migrate data.** The local demo and MongoDB are separate stores. A new MongoDB database receives its own fictional sample data. Set `SEED_DEMO=false` before first launch against a fresh database if you want to start empty. The initialization marker prevents deleted demo contacts from reappearing after restarting.

Never commit `.env`, share a full connection string in chat, or put credentials in a `VITE_` variable. `.env` and local databases are ignored by Git. A configured-but-unreachable MongoDB connection stops startup; the app does not silently switch to a different database.

## Relationship assistant

Without a key, the app offers a clearly labelled **offline helper**: deterministic suggestions based on saved check-in dates, recent notes, and editable message templates. It is not an LLM.

For the AI assistant, add your own API key to `.env` and restart:

```dotenv
OPENAI_API_KEY=your_private_key
OPENAI_MODEL=gpt-4.1-mini
```

The AI assistant uses the OpenAI Responses API and three read-only tools:

- `list_due_contacts`: prioritize actual due/overdue people, respecting snoozes and opt-outs.
- `search_people`: search MongoDB’s text index for relevant names, companies, tags, and notes.
- `get_relationship_context`: retrieve recent conversations, facts, life updates, and upcoming dates.

Each AI request requires an in-app checkbox explaining that the question and relevant saved names/notes/history are shared with OpenAI. Email addresses, phone numbers and photos are excluded from retrieved context. `store:false` is sent to the Responses API; this is not a blanket guarantee of zero provider retention. Keep personal data out of a shared interview demo. Each prompt is independent; assistant chat history is not persisted.

The assistant shows the records it consulted and its tool steps. It cannot send messages or change records. Follow-up reminders are created through a separate form you review and save. API usage is billed by your provider. The app never exposes the API key to the browser.

## What works

- **Today:** prioritized catch-ups, upcoming dates, due reminders, recent activity and two charts.
- **People:** add/edit/delete, photos, name/company/email search, circle/tag filters, profiles and CSV/vCard import with field mapping, preview and duplicate decisions.
- **Circles:** drag contacts among Inner, Close, Wider and Distant; keyboard-accessible select controls also move contacts. Counts and due status update after saving.
- **Calendar:** month navigation, annual dates, unknown years, milestone ages and February 29 handling (February 28 in non-leap years).
- **Timeline:** interactions, life updates and completed reminders, filterable by person and type.
- **Profiles:** facts, notes, reminders, dates, gift ideas/given/received, connections visible from either person, and interaction history.
- **Check-ins:** monthly / quarterly / six-monthly / annual defaults, individual overrides, snoozing, and opt-out. Last contacted is always derived from logged interactions. New contacts appear as “First catch-up.”

## Database design

Each entity has its own MongoDB collection: `people`, `interactions`, `dates`, `facts`, `news`, `reminders`, `gifts`, `connections`. Records use UUID `id` fields. Child records reference `personId`; connections also have `otherId`. All input is validated with Zod on the server.

This keeps growing interaction history out of the contact document. Compound indexes support person/date queries and reminder dates. A text index supports assistant search; `/api/stats` demonstrates a MongoDB aggregation grouping interactions by month. Contact deletion uses a transaction to remove related records and both sides of connections (Atlas supports this; self-hosted MongoDB requires a replica set).

The current UI loads one snapshot, appropriate for a small, single-user address book. Larger datasets would need server-side pagination/querying and bounded histories; this is not claimed as an enterprise-scale architecture. This version uses MongoDB text search, **not vector search**.

See [INTERVIEW.md](INTERVIEW.md) for a five-minute demo and the product/architecture story.

## Tests and development

```sh
npm test             # unit and local persistence tests
npm run build       # typecheck + production build
npm run check:db     # read-only connectivity check using .env
npm run test:mongo   # opt-in real MongoDB integration suite
```

The MongoDB suite only runs when `MONGODB_TEST_URI` is supplied. Use a dedicated test deployment/user that can create and delete temporary databases. The suite creates an isolated `rolodex_test_<uuid>` database and deletes it afterward. It never uses `MONGODB_URI` or the application database. It tests CRUD, text search, aggregation, and transactional cascades.

The default server binds to `127.0.0.1`. It has no account/login system, as specified in the original single-user brief. Do not deploy it publicly or use it as a shared CRM without adding authentication, authorization, HTTPS, and a suitable hosting setup. State-changing requests require a per-process token and reject cross-site browser requests.

In a dev container, port 4173 is forwarded privately. The launch configuration binds to all interfaces inside that container so the forwarded browser URL can reach it. For ordinary local use, keep the default loopback binding.

## Project map

| File/folder | Responsibility |
| --- | --- |
| `server/store.ts` | MongoDB connection, indexes, CRUD, aggregation; local demo adapter |
| `server/index.ts` | Node server, validated API routes, request protections |
| `server/assistant.ts` | Offline helper and bounded AI tool loop |
| `shared/model.ts` | Data types and validation |
| `shared/logic.ts` | Cadence, dates, relationships and dashboard calculations |
| `shared/import.ts` | CSV/vCard parsing and duplicate matching |
| `src/` | React app and all five views |
| `.env.example` | Credential placeholders and configuration |
| `tests/` | Behavioral, persistence, import, assistant and MongoDB tests |

Reference docs: [MongoDB Node driver](https://www.mongodb.com/docs/drivers/node/current/connect/mongoclient/), [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses).
