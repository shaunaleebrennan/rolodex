import { useState } from "react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import {
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  MessageCircle,
  CalendarDays,
  Check,
  Users,
  Heart,
  Clock3,
  Phone,
  Plus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { Snapshot, Reminder } from "../shared/model";
import { whoToContact, upcoming, chartData, isoDay } from "../shared/logic";
import { Avatar, Empty, Section } from "./ui";
import { Status } from "./Circles";
import { Feed, type Editor } from "./Records";
import { saveRecord } from "./api";
export default function Today({
  data,
  canEdit,
  onOpen,
  onEdit,
  onAsk,
  onNavigate,
  onSaved,
  onError,
}: {
  data: Snapshot;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onEdit: (e: Editor) => void;
  onAsk: (id?: string) => void;
  onNavigate: (s: string) => void;
  onSaved: () => Promise<void>;
  onError: (s: string) => void;
}) {
  const due = whoToContact(data),
    dates = upcoming(data),
    charts = chartData(data),
    reminders = data.reminders
      .filter((r) => !r.done && r.date <= isoDay())
      .sort((a, b) => a.date.localeCompare(b.date));
  const [all, setAll] = useState(false);
  const overdue = due.filter((p) => p.status === "overdue").length;
  const thisMonth = data.interactions.filter((i) =>
    i.date.startsWith(isoDay().slice(0, 7)),
  ).length;
  const inTouch = charts.circles.reduce((a, c) => a + c.other, 0);
  const lead = due[0];
  async function complete(r: Reminder) {
    try {
      await saveRecord("reminders", { ...r, done: true }, r.id);
      await onSaved();
    } catch (e) {
      onError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-title today-title">
        <div>
          <p className="eyebrow">
            {format(new Date(), "EEEE, d MMMM yyyy").toUpperCase()}
          </p>
          <h1>A little closer, every day.</h1>
          <p>Your people. A few thoughtful ways to show up for them.</p>
        </div>
        {canEdit && (
          <button className="secondary assistant-button" onClick={() => onAsk()}>
            <Sparkles size={17} />
            Help me reconnect
          </button>
        )}
      </div>
      <div className="stats-row">
        <div className="stat">
          <span className="stat-icon amber">
            <MessageCircle size={19} />
          </span>
          <div>
            <strong>{due.length}</strong>
            <span>People to catch up with</span>
          </div>
          <small>{overdue} overdue</small>
        </div>
        <div className="stat">
          <span className="stat-icon blue">
            <CalendarDays size={19} />
          </span>
          <div>
            <strong>{dates.length}</strong>
            <span>Dates to remember</span>
          </div>
          <small>Next 30 days</small>
        </div>
        <div className="stat">
          <span className="stat-icon violet">
            <Heart size={19} />
          </span>
          <div>
            <strong>{thisMonth}</strong>
            <span>Conversations this month</span>
          </div>
          <small>Every one counts</small>
        </div>
      </div>
      <div className="today-grid">
        <div className="today-main">
          <section className="panel catchups">
            <header className="section-head">
              <div>
                <h2>
                  A good day to say hello
                  <span className="section-count">{due.length}</span>
                </h2>
                <p className="section-subtitle">
                  A little time goes a long way.
                </p>
              </div>
              <span className="priority-label">YOUR NEXT CATCH-UPS</span>
            </header>
            {lead && (
              <div className="featured-person">
                <div className="featured-top">
                  <Avatar person={lead.person} size="large" />
                  <div>
                    <span
                      className={
                        "circle-label " + lead.person.circle.toLowerCase()
                      }
                    >
                      {lead.person.circle} circle
                    </span>
                    <button
                      className="featured-name"
                      onClick={() => onOpen(lead.person.id)}
                    >
                      {lead.person.name}
                    </button>
                    <p>
                      {lead.person.company}
                      {lead.person.city ? " · " + lead.person.city : ""}
                    </p>
                  </div>
                  <Status person={lead.person} data={data} />
                </div>
                <p className="context-line">
                  {data.news
                    .filter((n) => n.personId === lead.person.id)
                    .sort((a, b) => b.date.localeCompare(a.date))[0]?.text ||
                    (lead.last
                      ? `Your last catch-up was ${format(parseISO(lead.last), "d MMMM")}. A simple hello is a good place to start.`
                      : "You haven’t logged a conversation yet. Start with a hello.")}
                </p>
                {canEdit && (
                  <div className="featured-actions">
                    <button
                      className="primary"
                      onClick={() =>
                        onEdit({ kind: "interactions", personId: lead.person.id })
                      }
                    >
                      <Plus size={16} />
                      Log a catch-up
                    </button>
                    <button
                      className="text-button"
                      onClick={() => onAsk(lead.person.id)}
                    >
                      <Sparkles size={15} />
                      Help me find the words
                      <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            )}
            {due.slice(1, all ? undefined : 5).map((d) => (
              <div className="catchup-row" key={d.person.id}>
                <button
                  className="person-link"
                  onClick={() => onOpen(d.person.id)}
                >
                  <Avatar person={d.person} />
                  <span>
                    <strong>{d.person.name}</strong>
                    <small>
                      {d.person.company || d.person.circle + " circle"}
                    </small>
                  </span>
                </button>
                <Status person={d.person} data={data} />
                {canEdit && (
                  <button
                    className="icon log-icon"
                    aria-label={"Log interaction with " + d.person.name}
                    onClick={() =>
                      onEdit({ kind: "interactions", personId: d.person.id })
                    }
                  >
                    <MessageCircle size={18} />
                  </button>
                )}
              </div>
            ))}
            {due.length > 5 && (
              <button className="show-more" onClick={() => setAll(!all)}>
                {all ? "Show fewer" : `See all ${due.length} people`}
                <ArrowRight size={15} />
              </button>
            )}
            {!due.length && (
              <Empty>
                You’re all caught up. Enjoy a little breathing room—or say hello
                just because.
              </Empty>
            )}
          </section>
          <div className="charts-grid">
            <Section title="Making time">
              <p className="chart-subtitle">
                Conversations over the last six months
              </p>
              <div
                className="chart"
                role="img"
                aria-label={charts.months
                  .map((m) => `${m.month}: ${m.count} interactions`)
                  .join(", ")}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.months}
                    margin={{ top: 10, right: 5, left: -30, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#edf0f2"
                    />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#829098" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#829098" }}
                    />
                    <Tooltip cursor={{ fill: "#f5f7f8" }} />
                    <Bar
                      dataKey="count"
                      name="Conversations"
                      fill="#edb733"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>
            <Section title="A pulse on your circles">
              <p className="chart-subtitle">
                A little balance, a little intention
              </p>
              <div
                className="chart"
                role="img"
                aria-label={charts.circles
                  .map(
                    (c) =>
                      `${c.circle}: ${c.total} people, ${c.overdue} overdue`,
                  )
                  .join(", ")}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={charts.circles}
                    layout="vertical"
                    margin={{ top: 5, right: 8, left: -13, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="circle"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "#71818a" }}
                      width={63}
                    />
                    <Tooltip />
                    <Bar
                      name="Not overdue"
                      dataKey="other"
                      stackId="a"
                      fill="#99cbe0"
                      barSize={16}
                    />
                    <Bar
                      name="Overdue"
                      dataKey="overdue"
                      stackId="a"
                      fill="#edbb67"
                      barSize={16}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-key">
                <span>
                  <i className="key-blue" />
                  Not overdue
                </span>
                <span>
                  <i className="key-amber" />
                  Overdue
                </span>
              </div>
            </Section>
          </div>
        </div>
        <div className="today-side">
          <section className="panel">
            <header className="section-head">
              <h2>Coming up</h2>
              <button
                className="icon"
                aria-label="Open calendar"
                onClick={() => onNavigate("Calendar")}
              >
                <ArrowUpRight size={19} />
              </button>
            </header>
            {dates.slice(0, 5).map((d) => (
              <button
                className="upcoming-row"
                key={d.id}
                onClick={() => onOpen(d.personId)}
              >
                <span className="date-tile">
                  <small>{format(d.when, "MMM").toUpperCase()}</small>
                  <strong>{format(d.when, "d")}</strong>
                </span>
                <Avatar person={d.person!} size="small" />
                <span>
                  <strong>{d.person!.name}</strong>
                  <small>
                    {d.label}
                    {d.year !== null && d.type === "birthday"
                      ? " · " + (d.when.getFullYear() - d.year)
                      : ""}
                  </small>
                </span>
              </button>
            ))}
            {!dates.length && (
              <Empty>No celebrations in the next 30 days.</Empty>
            )}
            {dates.length > 5 && (
              <button
                className="text-button"
                onClick={() => onNavigate("Calendar")}
              >
                See all dates
                <ArrowRight size={15} />
              </button>
            )}
          </section>
          <section className="panel">
            <header className="section-head">
              <h2>Little things to do</h2>
              <span className="section-count">{reminders.length}</span>
            </header>
            {reminders.map((r) => (
              <div className="reminder-row" key={r.id}>
                {canEdit && (
                  <button
                    className="reminder-check"
                    aria-label={"Complete " + r.text}
                    onClick={() => complete(r)}
                  >
                    <Check size={14} />
                  </button>
                )}
                <div>
                  <p>{r.text}</p>
                  <button
                    className="inline-name"
                    onClick={() => onOpen(r.personId)}
                  >
                    {data.people.find((p) => p.id === r.personId)?.name}
                  </button>
                  <small className={r.date < isoDay() ? "past-due" : ""}>
                    {r.date === isoDay()
                      ? "Due today"
                      : "Due " + format(parseISO(r.date), "d MMM")}
                  </small>
                </div>
              </div>
            ))}
            {!reminders.length && (
              <Empty>Nothing due. You’re on top of the little things.</Empty>
            )}
          </section>
          <section className="thought-card">
            <span className="thought-mark">“</span>
            <p>
              Relationships don’t need grand gestures. Just a little attention,
              often.
            </p>
            <span>MAKE ROOM FOR YOUR PEOPLE</span>
          </section>
        </div>
      </div>
      <section className="panel recent-panel">
        <header className="section-head">
          <h2>Recently, in your shauna-rolodex</h2>
          <button
            className="text-button"
            onClick={() => onNavigate("Timeline")}
          >
            View timeline
            <ArrowRight size={15} />
          </button>
        </header>
        <Feed data={data} onOpen={onOpen} limit={4} />
      </section>
    </>
  );
}
