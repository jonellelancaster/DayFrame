import { useMemo } from "react";
import type { CalendarEvent, Member } from "../../types";
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

export function MonthView({ events, members, displayDate, categoryEmojis: _categoryEmojis, onSelectDate, onNavigate, onSelectEvent, onAddEvent }: Props) {
	const { palette: t } = useTheme();
	const displayDateObj = new Date(displayDate + "T12:00:00");
	const year = displayDateObj.getFullYear();
	const month = displayDateObj.getMonth();
	const todayStr = new Date().toISOString().split("T")[0];
	const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

	const calendarDays = useMemo(() => {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startDow = (firstDay.getDay() + 6) % 7;
		const days: (number | null)[] = Array(startDow).fill(null);
		for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
		while (days.length % 7 !== 0) days.push(null);
		return days;
	}, [year, month]);

	const eventsByDay = useMemo(() => {
		const map: Record<string, CalendarEvent[]> = {};
		const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
		const lastDayNum = new Date(year, month + 1, 0).getDate();
		const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;

		events.forEach((ev) => {
			const start = ev.date;
			const end = ev.endDate || ev.date;
			if (end < monthStart || start > monthEnd) return;

			let cur = new Date((start < monthStart ? monthStart : start) + "T12:00:00");
			const stopAt = new Date((end > monthEnd ? monthEnd : end) + "T12:00:00");
			while (cur <= stopAt) {
				const ds = toDateStr(cur);
				if (!map[ds]) map[ds] = [];
				if (!map[ds].find((e) => e.id === ev.id)) map[ds].push(ev);
				cur = addDays(cur, 1);
			}
		});
		return map;
	}, [events, year, month]);

	const monthName = displayDateObj.toLocaleString("default", { month: "long", year: "numeric" });
	const rowCount = calendarDays.length / 7;

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
				<button onClick={() => onNavigate(toDateStr(new Date(year, month - 1, 1)))} style={navBtn}>‹</button>
				<div style={{ flex: 1 }}>
					<div style={{ fontSize: 13, fontWeight: 600, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1.5 }}>Calendar</div>
					<div style={{ fontSize: 26, fontWeight: 700, color: t.textHeading }}>{monthName}</div>
				</div>
				<button onClick={() => onNavigate(toDateStr(new Date(year, month + 1, 1)))} style={navBtn}>›</button>
				<button onClick={onAddEvent} style={addBtn}>+</button>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
				{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
					<div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: t.textFaint, textTransform: "uppercase", letterSpacing: 1, paddingBottom: 6 }}>
						{d}
					</div>
				))}
			</div>

			<div style={{
				display: "grid",
				gridTemplateColumns: "repeat(7, 1fr)",
				gridTemplateRows: `repeat(${rowCount}, 1fr)`,
				gap: 4,
				flex: 1,
				minHeight: 0,
			}}>
				{calendarDays.map((day, i) => {
					if (!day) return <div key={i} style={{ background: t.bgDim, borderRadius: 8 }} />;

					const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
					const isToday = ds === todayStr;
					const isSelected = ds === displayDate;
					const dayEvents = (eventsByDay[ds] ?? []).sort((a, b) => {
						if (!a.startTime && !b.startTime) return 0;
						if (!a.startTime) return -1;
						if (!b.startTime) return 1;
						return a.startTime.localeCompare(b.startTime);
					});

					return (
						<div
							key={ds}
							onClick={() => onSelectDate(ds)}
							style={{
								background: isSelected && !isToday ? t.bgSelected : t.bg,
								borderRadius: 8,
								padding: "6px 6px 4px",
								cursor: "pointer",
								border: isToday ? `1.5px solid ${t.accent}` : isSelected ? `1.5px solid ${t.borderStrong}` : "1.5px solid transparent",
								display: "flex",
								flexDirection: "column",
								gap: 3,
								overflow: "hidden",
							}}
							onMouseEnter={(e) => (e.currentTarget.style.background = t.bgCard)}
							onMouseLeave={(e) => (e.currentTarget.style.background = isSelected && !isToday ? t.bgSelected : t.bg)}
						>
							<div style={{
								width: 22, height: 22, borderRadius: "50%",
								background: isToday ? t.accent : "transparent",
								color: isToday ? "#fff" : isSelected ? t.textHeading : t.textMuted,
								fontSize: 11, fontWeight: isToday || isSelected ? 700 : 400,
								display: "flex", alignItems: "center", justifyContent: "center",
								flexShrink: 0,
							}}>
								{day}
							</div>
							{dayEvents.slice(0, 3).map((ev) => {
								const color = memberMap[ev.memberIds[0]]?.color ?? ev.calendarColor ?? t.textSubtle;
								return (
									<div
										key={ev.id}
										onClick={(e) => { e.stopPropagation(); onSelectEvent(ev); }}
										style={{ display: "flex", alignItems: "center", gap: 3, background: color + "22", borderRadius: 3, padding: "2px 4px", overflow: "hidden" }}
									>
										<div style={{ width: 4, height: 4, borderRadius: "50%", background: color, flexShrink: 0 }} />
										<span style={{ fontSize: 10, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ev.title}</span>
									</div>
								);
							})}
							{dayEvents.length > 3 && (
								<div style={{ fontSize: 10, color: t.textFaint }}>+{dayEvents.length - 3}</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

const navBtn: React.CSSProperties = { background: "transparent", border: "1px solid #cbd5e1", color: "inherit", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" };
const addBtn: React.CSSProperties = { background: "#1D9E75", border: "none", color: "#fff", borderRadius: 10, width: 40, height: 40, cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 };
