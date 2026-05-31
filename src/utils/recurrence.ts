import type { CalendarEvent } from "../types";

const RANGE_START = "2023-01-01";
const RANGE_END   = "2029-12-31";

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const toDateStr = (d: Date) => d.toISOString().split("T")[0];

export function expandRecurringEvent(ev: CalendarEvent, rangeStart = RANGE_START, rangeEnd = RANGE_END): CalendarEvent[] {
	if (!ev.recurrence) return [];
	const { frequency, days } = ev.recurrence;

	// Don't generate before the event's own start date
	const genFrom = ev.date > rangeStart ? ev.date : rangeStart;
	const origDow = (new Date(ev.date + "T12:00:00").getDay() + 6) % 7; // 0=Mon
	const origDom = new Date(ev.date + "T12:00:00").getDate();

	const result: CalendarEvent[] = [];
	let cur = new Date(genFrom + "T12:00:00");
	const end = new Date(rangeEnd + "T12:00:00");

	while (cur <= end) {
		const ds = toDateStr(cur);
		const dow = (cur.getDay() + 6) % 7;

		const occurs =
			frequency === "daily" ? true
			: frequency === "weekly" ? (days && days.length > 0 ? days.includes(dow) : dow === origDow)
			: /* monthly */ cur.getDate() === origDom;

		if (occurs) result.push({ ...ev, date: ds, endDate: undefined });
		cur = addDays(cur, 1);
	}
	return result;
}

// Builds a day-keyed map including multi-day spans and recurring occurrences
export function buildEventsByDay(events: CalendarEvent[]): Record<string, CalendarEvent[]> {
	const map: Record<string, CalendarEvent[]> = {};

	const add = (date: string, ev: CalendarEvent) => {
		if (!map[date]) map[date] = [];
		// Use id+date as uniqueness key so two different occurrences on the same day can't collide
		if (!map[date].find((e) => e.id === ev.id && e.date === date)) map[date].push(ev);
	};

	events.forEach((ev) => {
		if (ev.recurrence) {
			expandRecurringEvent(ev).forEach((occ) => add(occ.date, occ));
		} else {
			let cur = new Date(ev.date + "T12:00:00");
			const end = new Date((ev.endDate || ev.date) + "T12:00:00");
			while (cur <= end) {
				add(toDateStr(cur), ev);
				cur = addDays(cur, 1);
			}
		}
	});

	return map;
}
