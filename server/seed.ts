import { addMonths, subDays, format } from "date-fns";
import { Store } from "./store.js";
import { demoPeople } from "./demo.js";
import { circles } from "../shared/model.js";
const names = [
  "Aoife Murphy",
  "Daniel Chen",
  "Niamh O’Brien",
  "James Wilson",
  "Sofia Patel",
  "Conor Walsh",
  "Emma Laurent",
  "Oliver Brooks",
  "Maya Singh",
  "Jack Sullivan",
  "Isabella Rossi",
  "Liam Kelly",
  "Amelia Wright",
  "Noah Kim",
  "Grace O’Connor",
  "Ethan Clarke",
  "Chloe Martin",
  "Lucas Nguyen",
  "Freya Evans",
  "Adam Byrne",
  "Zoe Taylor",
  "Ben Gallagher",
  "Ava Thompson",
  "Sam Rivera",
  "Hannah Lee",
  "Finn Ryan",
  "Elena Garcia",
  "Alex Morgan",
  "Ruby Scott",
  "Leo Fischer",
  "Sarah Ahmed",
  "Oscar Hayes",
];
const companies = [
  "Brightside",
  "Northstar Studio",
  "Independent",
  "Fable",
  "Meridian",
  "Fieldwork",
  "Forma",
  "Horizon",
];
const interests = [
  "ceramics and wheel throwing",
  "urban birdwatching",
  "restoring old bicycles",
  "sourdough baking",
  "learning conversational Italian",
  "coastal landscape painting",
  "building balcony vegetable gardens",
  "community theatre",
  "repairing vintage radios",
  "jazz piano improvisation",
  "kayaking sheltered waterways",
  "learning Irish place names",
  "documentary film editing",
  "sewing and clothing repairs",
  "chess puzzles",
  "local history walking tours",
  "home composting",
  "cooking regional Mexican dishes",
  "amateur astronomy",
  "bookbinding",
  "indoor climbing",
  "sailing lessons",
  "choir arranging",
  "woodworking hand tools",
  "wildlife illustration",
  "board-game design",
];
export async function seed(store: Store, now = new Date()) {
  if ((await store.list("people")).length) return;
  const people = [];
  for (let i = 0; i < names.length; i++) {
    const circle = circles[i % 4];
    const p = await store.save("people", {
      name: names[i],
      company: companies[i % 8],
      title:
        i < demoPeople.length
          ? demoPeople[i].title
          : ["Product designer", "Marketing lead", "Founder", "Engineer"][
              i % 4
            ],
      email: `${names[i].split(" ")[0].toLowerCase()}${i}@example.com`,
      city: ["Dublin", "London", "Berlin", "Amsterdam"][i % 4],
      timezone: [
        "Europe/Dublin",
        "Europe/London",
        "Europe/Berlin",
        "Europe/Amsterdam",
      ][i % 4],
      circle,
      tags: [
        ["friends", "university", "design", "ex-colleagues"][i % 4],
        i % 3 === 0 ? "running" : "coffee",
      ],
      notes:
        i < demoPeople.length
          ? demoPeople[i].notes
          : `Interested in ${interests[i - demoPeople.length]}. Ask about their latest project.`,
      metWhere: [
        "University",
        "Previous job",
        "A friend’s dinner",
        "Design meetup",
      ][i % 4],
    });
    people.push(p);
    const age = [58, 114, 208, 390, 8, 24, 72, 120][i % 8];
    for (let j = 0; j < 4; j++)
      await store.save("interactions", {
        personId: p.id,
        type: ["call", "message", "meet-up", "email"][(i + j) % 4],
        date: format(subDays(now, age + j * (40 + i)), "yyyy-MM-dd"),
        notes:
          i < demoPeople.length
            ? [
                demoPeople[i].conversation,
                demoPeople[i].notes,
                demoPeople[i].fact,
                `We agreed to reconnect about: ${demoPeople[i].title.toLowerCase()} projects.`,
              ][j]
            : `${["Discussed a first attempt at", "Swapped recommendations about", "Compared notes on", "Made plans to try"][j]} ${interests[i - demoPeople.length]}. ${["They wanted a practical starting point.", "A local group could be a useful introduction.", "They had learned something worth sharing.", "Agreed to check in on progress next time."][j]}`,
      });
    const birthday = addMonths(subDays(now, -((i % 20) + 2)), i % 3);
    await store.save("dates", {
      personId: p.id,
      type: "birthday",
      label: "Birthday",
      month: birthday.getMonth() + 1,
      day: birthday.getDate(),
      year: i % 4 === 0 ? null : 1985 + (i % 12),
    });
    if (i < 12)
      await store.save("news", {
        personId: p.id,
        text:
          i < demoPeople.length
            ? demoPeople[i].update
            : [
                "Starting a new role at a design studio.",
                "Just moved into a new home.",
                "Training for their first half marathon.",
                "Planning a trip to Italy next month.",
              ][i % 4],
        date: format(subDays(now, i + 2), "yyyy-MM-dd"),
      });
    if (i < 10)
      await store.save("facts", {
        personId: p.id,
        text:
          i < demoPeople.length
            ? demoPeople[i].fact
            : [
                "Loves film photography.",
                "Coffee order: flat white, oat milk.",
                "Allergic to shellfish.",
                "Big Arsenal supporter.",
                "Partner’s name is Sam.",
              ][i % 5],
      });
    if (i < 5)
      await store.save("reminders", {
        personId: p.id,
        text: [
          "Send the book recommendation",
          "Ask how the new job is going",
          "Find a date for dinner",
          "Share the running route",
          "Check in after the move",
        ][i],
        date: format(subDays(now, 2 - i), "yyyy-MM-dd"),
      });
    if (i < 6)
      await store.save("gifts", {
        personId: p.id,
        text: ["Photography book", "Coffee tasting set", "A dinner together"][
          i % 3
        ],
        status: "idea",
        occasion: "Birthday",
      });
  }
  await store.save("connections", {
    personId: people[0].id,
    otherId: people[4].id,
    label: "sibling",
  });
  await store.save("connections", {
    personId: people[1].id,
    otherId: people[5].id,
    label: "colleague",
  });
}
