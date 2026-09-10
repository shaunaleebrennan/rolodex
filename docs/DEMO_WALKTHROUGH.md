# Product walkthrough

Rolodex connects relationship memory with thoughtful follow-up. This short tour shows how saved context becomes discoverable and useful. All named sample contacts below are fictional.

## 1. Capture the details worth remembering

Open **Morgan Ellis** in People. Morgan’s profile describes leaving salaried employment to establish an independent consultancy. The conversation history adds context about pricing, service packages, and finding the first clients.
<img width="1240" height="708" alt="Screenshot 2026-09-10 at 23 35 39" src="https://github.com/user-attachments/assets/708c3f72-0806-4f57-b314-c1ba732d18a0" />
Profiles bring these details together with facts, life updates, dates, and past conversations.

## 2. Find someone from a half-remembered conversation<img width="576" height="359" alt="Screenshot 2026-09-10 at 23 40 05" src="https://github.com/user-attachments/assets/28ab1b43-7541-4518-9192-1768f5aa4746" />

Open the assistant and choose **Find by memory**. Try:

> Who was thinking about starting their own business?
> <img width="576" height="359" alt="Screenshot 2026-09-10 at 23 40 05" src="https://github.com/user-attachments/assets/e9a034e3-851d-40ad-9d2b-60e1fd87d460" />
<img width="545" height="271" alt="Screenshot 2026-09-10 at 23 40 15" src="https://github.com/user-attachments/assets/76884187-261c-4d74-9250-32af798810a9" />


With the demo data indexed, Morgan is an expected candidate. MongoDB Atlas Vector Search retrieves related meaning, so the query does not need to repeat the saved wording. The original excerpts appear alongside each result so you can assess its relevance.

Results depend on the indexed data and query wording. Similarity identifies candidates; it does not establish that someone has a particular qualification or experience.

## 3. Prepare a relevant catch-up

Choose **Prepare a catch-up** on a matching person. Review the question and submit it with AI sharing enabled.

The assistant retrieves saved relationship context and helps compose a response. MongoDB supplies the records; the language model interprets that context and drafts wording. The user reviews the output and decides what to send. The assistant cannot send messages or change records.

## 4. Keep the relationship history current

Log the next conversation on the profile. Last-contacted dates and check-in status update from that record, helping identify when another catch-up is due.

New notes become available to semantic retrieval after refreshing the search data. Retrieved excerpts are checked against current source records so edited or deleted evidence is not presented as current.

## Other examples to explore

| Question | Expected sample contact | Relevant saved context |
| --- | --- | --- |
| Who has experience launching an AI product? | Alex Rowan | Bringing a conversational assistant from beta to commercial release. |
| Who could help me take better headshots? | Taylor Quinn | Portrait lighting and helping people feel comfortable on camera. |
| Who understands employee listening and retention? | Riley Shah | Workplace questionnaires, anonymous feedback, and why employees stay or leave. |

These are illustrative expected matches, not published benchmark results.

## Run and evaluate

Follow the [setup guide](SETUP.md) to run the app locally. Add the six fictional profiles with `npm run demo:add`, then follow the [semantic search guide](SEMANTIC_SEARCH.md) to prepare the index. Existing contacts are preserved; the command also removes the old “ · Demo” suffix from tagged sample contacts.

After preparation, `npm run search:evaluate -- --share-queries` runs ten fixed fictional questions and prints a results table. Nine have an expected contact; one tests an unrelated topic. It sends the questions to OpenAI for embeddings and may incur API charges.

The comparison uses the existing MongoDB profile text search. Semantic retrieval also covers conversations and updates, so the comparison does not isolate search algorithm quality over identical fields. This small fixture illustrates behaviour; it is not a general benchmark. No measured results are published yet.

The app currently runs locally. This repository provides source, documentation, and sample data; a hosted demo and recorded walkthrough are not currently available.

[Return to project overview](../README.md)
