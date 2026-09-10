import { useState } from "react";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import { format, isSameDay, isSameMonth, startOfDay } from "date-fns";
import { Gift, CalendarDays } from "lucide-react";
import type { Snapshot } from "../shared/model";
import { annualDate } from "../shared/logic";
import { Avatar, Empty } from "./ui";
import "react-day-picker/style.css";
export default function Calendar({
  data,
  onOpen,
}: {
  data: Snapshot;
  onOpen: (id: string) => void;
}) {
  const [month, setMonth] = useState(new Date()),
    [selected, setSelected] = useState<Date | undefined>();
  const dates = data.dates
    .map((d) => ({
      ...d,
      when: annualDate(d, month.getFullYear()),
      person: data.people.find((p) => p.id === d.personId),
    }))
    .filter((d) => d.person && isSameMonth(d.when, month))
    .sort((a, b) => a.day - b.day);
  const shown = selected
    ? dates.filter((d) => isSameDay(d.when, selected))
    : dates;
  function DayButton({ day, modifiers, ...props }: DayButtonProps) {
    const events = data.dates.filter((d) =>
      isSameDay(annualDate(d, day.date.getFullYear()), day.date),
    );
    return (
      <button {...props}>
        <span>{day.date.getDate()}</span>
        {events.length > 0 && (
          <span className="calendar-event-label">
            {
              data.people
                .find((p) => p.id === events[0].personId)
                ?.name.split(" ")[0]
            }
            {events.length > 1 ? " +" + (events.length - 1) : ""}
          </span>
        )}
      </button>
    );
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">GOOD THINGS ON THE HORIZON</p>
          <h1>Make the date matter.</h1>
          <p>Birthdays, anniversaries, and more reasons to show up.</p>
        </div>
        <button
          className="secondary"
          onClick={() => {
            setMonth(new Date());
            setSelected(undefined);
          }}
        >
          This month
        </button>
      </div>
      <div className="calendar-layout">
        <section className="panel calendar-panel">
          <DayPicker
            mode="single"
            month={month}
            onMonthChange={(m) => {
              setMonth(m);
              setSelected(undefined);
            }}
            selected={selected}
            onSelect={(d) => {
              setSelected(d);
              if (d) {
                const e = dates.filter((x) => isSameDay(x.when, d));
                if (e.length === 1) onOpen(e[0].personId);
              }
            }}
            showOutsideDays
            weekStartsOn={1}
            components={{ DayButton }}
          />
        </section>
        <section className="panel">
          <header className="section-head">
            <h2>
              {selected ? format(selected, "d MMMM") : format(month, "MMMM")}{" "}
              celebrations
            </h2>
            {selected && (
              <button
                className="text-button"
                onClick={() => setSelected(undefined)}
              >
                Show all
              </button>
            )}
          </header>
          {shown.map((d) => (
            <button
              className="calendar-person"
              key={d.id}
              onClick={() => onOpen(d.personId)}
            >
              <span className="date-tile">
                <strong>{d.when.getDate()}</strong>
                <small>{format(d.when, "EEE")}</small>
              </span>
              <Avatar person={d.person!} size="small" />
              <span>
                <strong>{d.person!.name}</strong>
                <small>
                  {d.label}
                  {d.type === "birthday" && d.year !== null
                    ? " · turns " + (month.getFullYear() - d.year)
                    : ""}
                </small>
              </span>
            </button>
          ))}
          {!shown.length && (
            <Empty>
              <CalendarDays size={28} />
              <p>No important dates here yet. Add them from a person’s page.</p>
            </Empty>
          )}
          <div className="calendar-note">
            <Gift size={18} />
            <p>A small gesture can make someone’s whole day.</p>
          </div>
        </section>
      </div>
    </>
  );
}
