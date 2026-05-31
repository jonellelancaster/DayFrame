import type { CalendarEvent, Member } from "../../types";
import { CATEGORY_ICONS } from "../../data/mockData";
import { useTheme } from "../../theme";

interface Props {
	events: CalendarEvent[];
	members: Member[];
	today: Date;
	displayDate: string;
	categoryEmojis: Record<string, string>;
	onSelectDate: (date: string) => void;
	onSelectEvent: (event: CalendarEvent) => void;
	onAddEvent: () => void;
	onPrevDay: () => void;
	onNextDay: () => void;
}

function coversDate(ev: CalendarEvent, dateStr: string): boolean {
	return dateStr >= ev.date && dateStr <= (ev.endDate || ev.date);
}

function dateRangeLabel(ev: CalendarEvent): string {
	if (!ev.endDate || ev.endDate === ev.date) return "";
	const start = new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
	const end = new Date(ev.endDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
	return `${start} – ${end}`;
}

function sortEvents(evs: CalendarEvent[]): CalendarEvent[] {
	return [...evs].sort((a, b) => {
		if (!a.startTime && !b.startTime) return a.title.localeCompare(b.title);
		if (!a.startTime) return -1;
		if (!b.startTime) return 1;
		return a.startTime.localeCompare(b.startTime);
	});
}

function fmt12(t?: string): string {
	if (!t) return "";
	const [h, m] = t.split(":").map(Number);
	return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function CenterPanel({ events, members, displayDate, categoryEmojis, onSelectEvent, onAddEvent, onPrevDay, onNextDay }: Props) {
	const { palette: t } = useTheme();
	const getIcon = (cat: string) => categoryEmojis[cat] ?? CATEGORY_ICONS[cat] ?? "📅";
	const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

	const displayEvents = sortEvents(events.filter((e) => coversDate(e, displayDate)));

	const displayDateObj = new Date(displayDate + "T12:00:00");
	const dayLabel = displayDateObj.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
	const todayStr = new Date().toISOString().split("T")[0];
	const isToday = displayDate === todayStr;

	return (
		<div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
			{/* Header with navigation */}
			<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
				<button
					onClick={onPrevDay}
					style={{ background: t.bgCard, border: "none", color: t.textMuted, borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}
				>
					‹
				</button>
				<div style={{ flex: 1 }}>
					<div style={{ fontSize: 15, fontWeight: 600, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1.5 }}>
						{isToday ? "Today" : displayDateObj.toLocaleDateString("en-US", { weekday: "long" })}
					</div>
					<div style={{ fontSize: 28, fontWeight: 700, color: t.textHeading }}>
						{dayLabel}
					</div>
				</div>
				<button
					onClick={onNextDay}
					style={{ background: t.bgCard, border: "none", color: t.textMuted, borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}
				>
					›
				</button>
				<button
					onClick={onAddEvent}
					style={{ background: "#1D9E75", border: "none", color: "#fff", borderRadius: 10, width: 40, height: 40, cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}
					title="Add event"
				>
					+
				</button>
			</div>

			{displayEvents.length === 0 ? (
				<div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: t.textFaint }}>
					<div style={{ fontSize: 20 }}>Nothing scheduled</div>
					<button
						onClick={onAddEvent}
						style={{ background: t.bgCard, border: `1.5px dashed ${t.borderStrong}`, color: t.textSubtle, borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
					>
						+ Add an event
					</button>
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", flex: 1 }}>
					{displayEvents.map((ev) => {
						const primaryMember = memberMap[ev.memberIds[0]];
						const color = primaryMember?.color ?? ev.calendarColor ?? t.textSubtle;
						const multiDayLabel = dateRangeLabel(ev);
						return (
							<div
								key={ev.id}
								onClick={() => onSelectEvent(ev)}
								style={{
									display: "flex",
									alignItems: "stretch",
									background: t.bgCard,
									borderRadius: 12,
									overflow: "hidden",
									minHeight: 72,
									cursor: "pointer",
								}}
								onMouseEnter={(e) => (e.currentTarget.style.background = t.bgCardHover)}
								onMouseLeave={(e) => (e.currentTarget.style.background = t.bgCard)}
							>
								<div style={{ width: 6, background: color, flexShrink: 0 }} />
								<div style={{ padding: "12px 16px", flex: 1 }}>
									<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
										<span style={{ fontSize: 18 }}>{getIcon(ev.category)}</span>
										<span style={{ fontSize: 24, fontWeight: 700, color: t.textHeading }}>{ev.title}</span>
										{ev.recurrence && <span style={{ fontSize: 14, color: t.textSubtle }}>↻</span>}
										{multiDayLabel && <span style={{ fontSize: 12, color: t.textSubtle, background: t.borderStrong, padding: "2px 8px", borderRadius: 6 }}>↔ {multiDayLabel}</span>}
									</div>
									<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
										{ev.startTime ? (
											<span style={{ fontSize: 18, color: t.textMuted, fontVariantNumeric: "tabular-nums" }}>
												{fmt12(ev.startTime)}{ev.endTime ? ` – ${fmt12(ev.endTime)}` : ""}
											</span>
										) : (
											<span style={{ fontSize: 14, color: t.textSubtle, fontStyle: "italic" }}>All day</span>
										)}
										{ev.location && <span style={{ fontSize: 14, color: t.textSubtle }}>📍 {ev.location}</span>}
									</div>
									<div style={{ display: "flex", gap: 6, marginTop: 6 }}>
										{ev.memberIds.map((mid) => {
											const m = memberMap[mid];
											return m ? <span key={mid} style={{ fontSize: 13, color: m.color, fontWeight: 600 }}>{m.name}</span> : null;
										})}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Upcoming */}
			<div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${t.border}` }}>
				<div style={{ fontSize: 13, fontWeight: 600, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
					Coming Up
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					{events
						.filter((e) => (e.endDate || e.date) > displayDate && e.date > displayDate)
						.sort((a, b) => {
							const aKey = a.date + (a.startTime ?? "00:00");
							const bKey = b.date + (b.startTime ?? "00:00");
							return aKey.localeCompare(bKey);
						})
						.slice(0, 3)
						.map((ev) => {
							const primaryMember = memberMap[ev.memberIds[0]];
							const evDate = new Date(ev.date + "T12:00:00");
							const label = evDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
							return (
								<div
									key={ev.id}
									onClick={() => onSelectEvent(ev)}
									style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderRadius: 6, padding: "4px 0" }}
								>
									<div style={{ width: 4, height: 4, borderRadius: "50%", background: primaryMember?.color ?? ev.calendarColor ?? t.textSubtle, flexShrink: 0 }} />
									<span style={{ fontSize: 15, color: t.textMuted, minWidth: 120 }}>{label}</span>
									<span style={{ fontSize: 15, color: t.text }}>{ev.title}</span>
								</div>
							);
						})}
				</div>
			</div>
		</div>
	);
}
