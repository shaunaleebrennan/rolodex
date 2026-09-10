# Rolodex: a five-minute interview demo

## The product problem

Relationships fade because context and follow-up are scattered. Rolodex turns a static address book into a small, actionable relationship memory: who to contact, why now, and what to remember.

For a PMM, the same pattern can support relationships with customer advocates, design partners, analysts, and collaborators. This build remains a personal CRM; it does not pretend to be connected to a company’s customer data.

## Demo sequence

1. **Today:** explain how the app turns stored history into a prioritized next action. Open the top person and point to the overdue calculation and latest life update.
2. **People:** add a fictional contact, record a useful fact and a life update. The profile combines stable details with changing context.
3. **Circles:** move the contact to Inner. Explain the change in cadence. Log a conversation and show that status updates across the app.
4. **Assistant:** ask who to reconnect with, or prepare a catch-up for one person. Show the tool steps and source records. If no API key is configured, explicitly call it an offline helper, not AI.
5. **MongoDB Atlas:** with Atlas configured, show the saved contact and interaction in their collections. Explain how persistent memory grounds the assistant.

## Why MongoDB belongs here

- **Flexible records:** contact context varies; records include tags and optional profile fields without adding a field for every possible fact.
- **Persistent relationship memory:** interactions and updates survive sessions and are retrieved when the assistant needs them.
- **Useful retrieval:** MongoDB text search finds candidate contacts; context tools fetch the actual records needed for a response.
- **Aggregation:** monthly interaction counts demonstrate deriving a useful view from the event history.
- **Consistency:** indexes support lookup patterns; transactional contact deletion avoids orphaned histories or one-sided connections.

These are product-driven reasons. “It’s an AI app” alone is not a database rationale.

## What makes the AI workflow agentic?

With an API key, the model chooses among three bounded, read-only tools and can use their results in subsequent steps before answering. The app, not the model, controls the available tools, input validation, loop limit, and access to saved records. It is a tool-using assistant, not an autonomous outreach agent.

## Honest boundaries

- Atlas and the OpenAI API need private credentials; do not claim a live connection before verifying it.
- The local demo uses SQLite. The offline helper uses deterministic logic and message templates.
- No vector search, background outreach, email sending, or calendar/contact syncing is implemented.
- Source cards show consulted records; they are not a proof that every generated sentence is correct.
- API requests require consent to send relevant relationship context to OpenAI.
- Single-user and local-first. Authentication and tenant isolation would be prerequisites for a shared product.

## Product judgement to discuss

**North-star hypothesis:** increase meaningful follow-through, not messages sent. Possible early measures: whether users return weekly, log real conversations, complete follow-up reminders, and find suggestions relevant. These are proposed measures; this app does not collect usage telemetry.

**Next experiment:** compare a plain overdue list with a list that explains “why now” using a recent life event. Validate whether context improves useful follow-through before adding more automation.
