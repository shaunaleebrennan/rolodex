import { format, subDays } from "date-fns";
import type { Store } from "./store.js";
export const demoTag = "rolodex-interview-demo-v1";
export const demoPeople = [
  {
    name: "Alex Rowan",
    title: "Product marketing lead",
    company: "Lantern Labs (fictional)",
    notes:
      "Led go-to-market for a conversational software assistant: recruited beta customers, tested positioning, trained sellers, and coordinated the commercial release.",
    conversation:
      "The beta programme revealed buyers wanted answers grounded in their own documents. Alex rewrote the launch story around trust and saved time.",
    update:
      "Reviewing what converted trial users into paying customers after the release.",
    fact: "Happy to discuss positioning experiments and launch retrospectives.",
  },
  {
    name: "Morgan Ellis",
    title: "Independent adviser",
    company: "Ellis Advisory (fictional)",
    notes:
      "Leaving salaried employment to establish an independent consultancy. Working out service packages, an hourly rate, and how to find the first paying clients.",
    conversation:
      "Morgan is weighing a monthly retainer against project fees. Wants to interview former colleagues about the problems they would pay to solve.",
    update: "Booked the first discovery call with a potential client.",
    fact: "Prefers practical examples of proposal templates and pricing.",
  },
  {
    name: "Taylor Quinn",
    title: "Portrait photographer",
    company: "Quinn Studio (fictional)",
    notes:
      "Teaches flattering portrait lighting and helps people feel relaxed in front of a camera. Runs weekend workshops using window light and simple reflectors.",
    conversation:
      "Taylor explained how a soft light source and a natural pose improve professional profile pictures. Offered to share a home studio checklist.",
    update: "Planning a small portrait workshop for beginners.",
    fact: "Enjoys teaching people who only have a phone camera.",
  },
  {
    name: "Jamie Park",
    title: "Community organiser",
    company: "Harbour Collective (fictional)",
    notes:
      "Organises neighbourhood supper clubs and volunteer rotas. Experienced in making newcomers feel welcome and finding accessible event venues.",
    conversation:
      "Jamie tested smaller tables so guests could have proper conversations. A welcome buddy helped first-time attendees settle in.",
    update: "Looking for a step-free venue for the next community dinner.",
    fact: "Likes introductions to local venue owners.",
  },
  {
    name: "Riley Shah",
    title: "People research lead",
    company: "Meadow Works (fictional)",
    notes:
      "Designs staff questionnaires and turns anonymous workplace feedback into recommendations for managers. Studies why people stay at or leave their jobs.",
    conversation:
      "Riley compared written comments with engagement scores. Small teams needed stronger anonymity protections before results could be shared.",
    update: "Preparing a manager workshop on responding to employee feedback.",
    fact: "Can explain questionnaire design and the limits of small samples.",
  },
  {
    name: "Casey Byrne",
    title: "Running coach",
    company: "Steady Miles (fictional)",
    notes:
      "Helps first-time distance runners build stamina gradually. Designs training schedules with recovery days and conversational-pace sessions.",
    conversation:
      "Casey suggested increasing time on feet gradually before worrying about pace. The beginner group is preparing for a thirteen-mile event.",
    update: "Starting a gentle weekend training group for new runners.",
    fact: "Prefers morning catch-ups after a group run.",
  },
] as const;
export const demoQueries = [
  { query: "Who has experience launching an AI product?", expected: 0 },
  {
    query: "Who could help me recruit early users before a release?",
    expected: 0,
  },
  { query: "Who was thinking about starting their own business?", expected: 1 },
  {
    query: "Who is figuring out what to charge consulting clients?",
    expected: 1,
  },
  { query: "Who could help me take better headshots?", expected: 2 },
  { query: "Who teaches beginners to look good on camera?", expected: 2 },
  { query: "Who knows how to welcome people into a local group?", expected: 3 },
  { query: "Who understands employee listening and retention?", expected: 4 },
  {
    query: "Who could help me prepare for my first half marathon?",
    expected: 5,
  },
  {
    query: "Who has expertise in deep-sea submarine maintenance?",
    expected: null,
  },
] as const;
// Preserve existing records; only normalize the exact legacy name on tagged sample contacts.
export async function addDemo(store: Store, now = new Date()) {
  const existing = await store.list("people");
  let added = 0;
  for (const d of demoPeople) {
    const sample = existing.find(
      (p) =>
        p.tags.includes(demoTag) &&
        (p.name === d.name || p.name === `${d.name} · Demo`),
    );
    if (sample) {
      if (sample.name === `${d.name} · Demo`)
        await store.save("people", { ...sample, name: d.name }, sample.id);
      continue;
    }
    const p = await store.save("people", {
      name: d.name,
      title: d.title,
      company: d.company,
      notes: d.notes,
      tags: [demoTag, "fictional"],
      circle: "Close",
      city: "Dublin",
    });
    await store.save("interactions", {
      personId: p.id,
      type: "meet-up",
      date: format(subDays(now, 100), "yyyy-MM-dd"),
      notes: d.conversation,
    });
    await store.save("news", {
      personId: p.id,
      date: format(subDays(now, 4), "yyyy-MM-dd"),
      text: d.update,
    });
    await store.save("facts", { personId: p.id, text: d.fact });
    added++;
  }
  return added;
}
