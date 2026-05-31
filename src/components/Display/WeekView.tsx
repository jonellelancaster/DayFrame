import type { CalendarEvent, Member } from "../../types";
import { CATEGORY_ICONS } from "../../data/mockData";
import { useTheme } from "../../theme";

interface Props {
	events: CalendarEvent[];
	members: Member[];
	displayDate: string;
	categoryEmojis: Record<string, string>;
	onSelectDate: (date: string) => void;
	onNavigate: (date: string) => void;
	onSelectEvent: (event: CalendarEvent) => void;
	onAddEvent: () => void;
}

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const toDateStr = (d: Date) => d.toISOString().split("T")[0];

function getWeekMonday(dateStr: string): Date {
	const d = new Date(dateStr + "T12:00:00");
	const dow = (d.getDay() + 6) % 7;
	return new Date(d.getTime() - dow * 86400000);
}

function fmt12(t?: string): string {
	if (!t) return "";
	const [h, m] = t.split(":").map(Number);
	return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeekView({ events, members, displayDate, categoryEmojis, onSelectDate, onNavigate, onSelectEvent, onAddEvent }: Props) {
	const { palette: t } = useTheme();
	const monday = getWeekMonday(displayDate);
	const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
	const todayStr = new Date().toISOString().split("T")[0];
	const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
	const getIcon = (cat: string) => categoryEmojis[cat] ?? CATEGORY_ICONS[cat] ?? "📅";

	const weekLabel = `${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(monday, 6).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
				<button onClick={() => onNavigate(toDateStr(addDays(monday, -7)))} style={navBtn}>‹</button>
				<div style={{ flex: 1 }}>
					<div style={{ fontSize: 13, fontWeight: 600, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1.5 }}>Week</div>
					<div style={{ fontSize: 22, fontWeight: 700, color: t.textHeading }}>{weekLabel}</div>
				</div>
				<button onClick={() => onNavigate(toDateStr(addDays(monday, 7)))} style={navBtn}>›</button>
				<button onClick={onAddEvent} style={addBtn}>+</button>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, flex: 1, minHeight: 0, overflowY: "auto" }}>
				{weekDays.map((day, i) => {
					const ds = toDateStr(day);
					const isToday = ds === todayStr;
					const isSelected = ds === displayDate;
					const dayEvents = events
						.filter((ev) => ds >= ev.date && ds <= (ev.endDate || ev.date))
						.sort((a, b) => {
							if (!a.startTime && !b.startTime) return 0;
							if (!a.startTime) return -1;
							if (!b.startTime) return 1;
							return a.startTime.localeCompare(b.startTime);
						});

					return (
						<div key={ds} style={{ display: "flex", flexDirection: "column" }}>
							<div
								onClick={() => onSelectDate(ds)}
								style={{
									textAlign: "center",
									cursor: "pointer",
									paddingBottom: 8,
									marginBottom: 6,
									borderBottom: `2px solid ${isToday ? t.accent : isSelected ? t.borderStrong : t.border}`,
								}}
							>
								<div style={{ fontSize: 11, fontWeight: 600, color: isToday ? t.accent : t.textSubtle, textTransform: "uppercase", letterSpacing: 1 }}>
									{DOW[i]}
								</div>
								<div style={{
									width: 30, height: 30, borderRadius: "50%",
									background: isToday ? t.accent : "transparent",
									color: isToday ? "#fff" : isSelected ? t.textHeading : t.textMuted,
									fontSize: 15, fontWeight: isToday || isSelected ? 700 : 400,
									display: "flex", alignItems: "center", justifyContent: "center",
									margin: "4px auto 0",
								}}>
									{day.getDate()}
								</div>
							</div>

							<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
								{dayEvents.slice(0, 7).map((ev) => {
									const color = memberMap[ev.memberIds[0]]?.color ?? ev.calendarColor ?? t.textSubtle;
									return (
										<div
											key={ev.id + ds}
											onClick={() => onSelectEvent(ev)}
											style={{ display: "flex", alignItems: "stretch", background: t.bgCard, borderRadius: 6, overflow: "hidden", cursor: "pointer" }}
											onMouseEnter={(e) => (e.currentTarget.style.background = t.bgCardHover)}
											onMouseLeave={(e) => (e.currentTarget.style.background = t.bgCard)}
										>
											<div style={{ width: 3, background: color, flexShrink: 0 }} />
											<div style={{ padding: "5px 6px", flex: 1, minWidth: 0 }}>
												<div style={{ fontSize: 11, fontWeight: 600, color: t.textHeading, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
													{getIcon(ev.category)} {ev.title}
												</div>
												{ev.startTime && (
													<div style={{ fontSize: 10, color: t.textSubtle, marginTop: 1 }}>{fmt12(ev.startTime)}</div>
												)}
											</div>
										</div>
									);
								})}
								{dayEvents.length > 7 && (
									<div style={{ fontSize: 10, color: t.textSubtle, textAlign: "center", paddingTop: 2 }}>+{dayEvents.length - 7} more</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

const navBtn: React.CSSProperties = { background: "transparent", border: "1px solid #cbd5e1", color: "inherit", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" };
const addBtn: React.CSSProperties = { background: "#1D9E75", border: "none", color: "#fff", borderRadius: 10, width: 40, height: 40, cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 };
