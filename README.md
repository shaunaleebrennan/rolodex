# Rolodex

**A personal CRM that turns relationship history into thoughtful follow-up.**

Rolodex helps people remember what matters about their relationships, see who is due a catch-up, and prepare a relevant message. It combines a working personal CRM with MongoDB-backed memory and an AI assistant that retrieves saved context before responding.

Built by **Shauna Brennan**, with AI coding assistance, as a hands-on exploration of product design, MongoDB, and tool-using AI.

## The problem

An address book remembers who someone is. It rarely remembers what is happening in their life, what you last talked about, or when you meant to reconnect. Those details end up scattered across messages, notes, and memory—and follow-up slips.

Rolodex brings that context together around three questions:

- **Who should I reconnect with?** Check-in dates identify people who need attention.
- **Why now?** Life updates, important dates, and conversation history provide a reason to reach out.
- **What should I say?** The assistant uses saved context to help prepare a catch-up and draft a message.

The starting point is personal relationships. The same pattern could support customer advocates, design partners, analysts, and other professional relationships. Those are potential extensions; this prototype is a personal CRM, with no connected company systems.

## Explore the product

| View | What it enables |
| --- | --- |
| **Today** | Prioritized catch-ups, upcoming celebrations, due reminders, recent activity, and interaction charts. |
| **People** | Searchable contacts with profiles, photos, tags, notes, and CSV/vCard import with duplicate review. |
| **Circles** | Drag people between Inner, Close, Wider, and Distant to set a default check-in rhythm. |
| **Calendar** | Birthdays and recurring dates, including unknown years and milestone birthdays. |
| **Timeline** | Conversation history, life updates, and completed reminders, filterable by person and activity type. |

Each profile also holds facts worth remembering, gift ideas, and connections to other people. Last contacted is derived from logged interactions. Individual cadence overrides, snoozing, and opt-out keep nudges under the user's control.

### A short walkthrough

1. **Open Today.** The catch-up list is ordered by due date, with recent context alongside the suggested person.
2. **Add a fictional contact.** Record a conversation and a life update—for example, a new marketing role and an upcoming product launch.
3. **Open Plan a catch-up.** Ask: “What should I ask about? Draft a short, friendly message using my saved notes.” With an API key configured, the assistant retrieves relationship context and produces an answer with the records it consulted.
4. **Log the next conversation.** Check-in status recalculates across the profile, People, Circles, and Today.
5. **Inspect persistence.** With MongoDB configured, the contact and conversation can be found in Atlas under the `people` and `interactions` collections.

The central workflow is **capture context → identify a timely follow-up → retrieve relevant history → prepare a message → record the interaction**. The user decides what to send and when.

## Why MongoDB

MongoDB is the configured primary store for relationship memory. Its role extends beyond saving the contact list:

| Product requirement | Implementation |
| --- | --- |
| Store varied relationship context | Documents hold optional profile details and tags, alongside records for facts, dates, gifts, and life updates. Server-side validation keeps the supported structure consistent. |
| Retain a growing conversation history | Interactions are stored separately and reference a contact, keeping history from growing indefinitely inside one person document. |
| Find relevant people | A MongoDB text index supports assistant searches across names, companies, email, notes, and tags. |
| Retrieve context for a response | The assistant's tools select relevant contacts and return recent conversations, facts, updates, and upcoming dates. |
| Derive useful activity summaries | The `/api/stats` endpoint uses a MongoDB aggregation to group interactions by month. |
| Keep related records consistent | Unique IDs and query indexes support lookups; transactional contact deletion removes related records and connections. |

The data model uses eight collections: `people`, `interactions`, `dates`, `facts`, `news`, `reminders`, `gifts`, and `connections`. Records use UUID identifiers and explicit references between entities.

The optional **Find by memory** feature adds MongoDB Atlas Vector Search: describe an experience or topic, review matching saved excerpts, then prepare a catch-up with a selected person. For example: “Who has experience launching an AI product?” It uses an explicitly prepared embedding index and verifies retrieved excerpts against current records. [Enable semantic search and try the interview evaluation →](docs/SEMANTIC_SEARCH.md)

Ordinary text search and structured retrieval remain available. Live vector-search quality has not been measured in this build environment.

## How the AI assistant works

The assistant uses the OpenAI Responses API and a bounded loop of read-only tools:

| Tool | Purpose |
| --- | --- |
| `list_due_contacts` | Return people due for a catch-up, respecting snoozes and opt-outs. |
| `search_people` | Find candidate contacts in the stored data. |
| `search_relationship_memory` | Find candidates by meaning in indexed notes and return matching excerpts (MongoDB configuration required). |
| `get_relationship_context` | Retrieve a person's recent conversations, facts, updates, dates, and check-in status. |

The model chooses which tools to call and can use their results in subsequent steps before answering. The application defines the available tools, validates their inputs, and limits the number of steps. Deterministic code handles dates and cadence; the model helps interpret context and compose a response.

Source cards and tool steps make the answer inspectable. They show consulted records, rather than guaranteeing that every generated sentence is correct. The assistant cannot send messages or modify records. A follow-up reminder is saved through a separate form the user reviews.

The user enables AI sharing once after seeing what is sent to OpenAI. The choice is remembered in this browser for this app address; **AI enabled · Manage** lets them turn it off. Dedicated email, phone, and photo fields are excluded from retrieved context; freeform notes may still contain personal details. Keys remain server-side, and `.env` is excluded from Git.

## Design choices and boundaries

- **Useful before AI setup.** A persistent SQLite demo and clearly labelled offline helper make the product explorable without credentials. The offline helper uses rules and message templates, not an LLM.
- **Context before automation.** The aim is to make follow-up more relevant while leaving outreach decisions with the user. There is no autonomous messaging or background outreach.
- **Focused personal scope.** The app runs locally for one user. It has no authentication, multi-user permissions, or email/calendar/contact syncing.
- **A deliberate scale limit.** The UI currently loads a full snapshot. Larger datasets would require server-side querying and pagination. Some derived views are calculated in application code; the aggregation endpoint is a separate database example.
- **Separate data stores.** Switching from SQLite to MongoDB does not migrate local records. Each store initializes independently.

The next product experiment would compare an overdue list alone with one that explains **why now** using a recent life event. Relevant measures would include completed follow-ups, repeat weekly use, and the perceived usefulness of suggestions. These are proposed evaluation measures, not measured results; the app does not collect usage telemetry.

## Run it locally

Requires **Node.js 24 LTS**. Clone this repository, open a terminal in the project folder, then run:

```sh
npm install
npm start
```

Open **http://127.0.0.1:4173**. A fresh demo starts with 32 fictional contacts and sample history. No credentials are needed for local demo mode.

| Configuration | Storage | Assistant |
| --- | --- | --- |
| No credentials | Local SQLite | Offline helper |
| `MONGODB_URI` configured | MongoDB | Offline helper |
| `MONGODB_URI` and `OPENAI_API_KEY` configured | MongoDB | AI assistant |

To enable MongoDB and AI, copy [`.env.example`](.env.example) to a private `.env` file beside `package.json`, supply your own credentials, and restart. Keep credentials out of chat, screenshots, and Git. Provider usage may incur charges.

**[Full setup and troubleshooting guide →](docs/SETUP.md)**

## Validation

- **19 automated tests passed** during the build, covering record operations, local persistence, imports, date/cadence logic, validation, the assistant's mocked tool loop, and semantic retrieval consent, embedding validation, and source freshness. The TypeScript check and production build also passed.
- **Browser checks** exercised contact creation and editing, search, conversation logging, status changes, calendar navigation, gifts, connections, reminder completion, CSV import with duplicate skipping, circle dragging with persisted changes, and the offline assistant.
- **Live local setup:** the project author subsequently confirmed contact persistence in MongoDB Atlas and a successful AI assistant request using private credentials.
- **Remaining coverage:** the full MongoDB integration suite requires a dedicated test URI and was not run during the build. vCard parsing has unit coverage; its separate browser upload check was interrupted by a file-chooser timeout. Generated-answer quality has not been systematically evaluated.

```sh
npm test             # automated tests
npm run build       # typecheck and production build
npm run check:db     # MongoDB connectivity check
npm run test:mongo   # opt-in integration suite; requires MONGODB_TEST_URI
```

The integration suite uses an isolated temporary database. See the setup guide before running it.

## Code map

| Area | Entry point |
| --- | --- |
| Database connection, indexes, storage adapters | [`server/store.ts`](server/store.ts) |
| AI tools and offline helper | [`server/assistant.ts`](server/assistant.ts) |
| API routes and server | [`server/index.ts`](server/index.ts) |
| Data model and validation | [`shared/model.ts`](shared/model.ts) |
| Check-in, date, and dashboard logic | [`shared/logic.ts`](shared/logic.ts) |
| React interface | [`src/`](src/) |
| Behavioral tests | [`tests/`](tests/) |
