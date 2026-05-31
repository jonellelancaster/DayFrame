import { useMemo } from "react";
import type { CalendarEvent, Member } from "../../types";
import { MemberChip } from "../common/MemberChip";
import { buildEventsByDay } from "../../utils/recurrence";
import { useTheme } from "../../theme";

interface Props {
	members: Member[];
	events: CalendarEvent[];
	today: Date;
	displayDate: string;
	onSelectDate: (date: string) => void;
}

export function LeftPanel({ members, events, today, displayDate, onSelectDate }: Props) {
	const { palette: t } = useTheme();
	const displayDateObj = new Date(displayDate + "T12:00:00");
	const year = displayDateObj.getFullYear();
	const month = displayDateObj.getMonth();

	const calendarDays = useMemo(() => {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startDow = (firstDay.getDay() + 6) % 7;
		const days: (number | null)[] = Array(startDow).fill(null);
		for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
		return days;
	}, [year, month]);

	const allEventsByDay = useMemo(() => buildEventsByDay(events), [events]);

	const eventsByDay = useMemo(() => {
		const map: Record<number, string[]> = {};
		Object.entries(allEventsByDay).forEach(([dateStr, evs]) => {
			const d = new Date(dateStr + "T12:00:00");
			if (d.getFullYear() === year && d.getMonth() === month) {
				const day = d.getDate();
				if (!map[day]) map[day] = [];
				evs.forEach((ev) => ev.memberIds.forEach((mid) => { if (!map[day].includes(mid)) map[day].push(mid); }));
			}
		});
		return map;
	}, [allEventsByDay, year, month]);

	const monthName = displayDateObj.toLocaleString("default", { month: "long", year: "numeric" });
	const todayStr = today.toISOString().split("T")[0];
	const todayDate = today.getDate();
	const todayMonth = today.getMonth();
	const todayYear = today.getFullYear();

	const selectedDay = displayDateObj.getDate();

	const memberMap = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);

	const handleDayClick = (day: number) => {
		const d = new Date(year, month, day);
		onSelectDate(d.toISOString().split("T")[0]);
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 24, height: "100%" }}>
			{/* Mini Calendar */}
			<div>
				<div style={{ fontSize: 16, fontWeight: 600, color: t.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
					{monthName}
				</div>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
					{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
						<div key={i} style={{ textAlign: "center", fontSize: 11, color: t.textSubtle, fontWeight: 600, paddingBottom: 4 }}>
							{d}
						</div>
					))}
					{calendarDays.map((day, i) => {
						const isToday = day !== null && day === todayDate && month === todayMonth && year === todayYear;
						const isSelected = day !== null && day === selectedDay && displayDate !== todayStr;
						const isSelectedToday = day !== null && day === selectedDay && displayDate === todayStr;
						const dots = day ? eventsByDay[day] ?? [] : [];
						return (
							<div key={i} style={{ textAlign: "center", padding: "3px 0" }}>
								{day ? (
									<div
										onClick={() => handleDayClick(day)}
										style={{ cursor: "pointer" }}
									>
										<div
											style={{
												width: 28,
												height: 28,
												borderRadius: "50%",
												background: isSelectedToday || isToday ? t.accent : isSelected ? t.borderStrong : "transparent",
												color: isSelectedToday || isToday || isSelected ? "#fff" : t.text,
												fontSize: 12,
												fontWeight: isToday || isSelected ? 700 : 400,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												margin: "0 auto",
												outline: isSelected && !isToday ? `2px solid ${t.accent}` : "none",
											}}
										>
											{day}
										</div>
										<div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2, height: 6 }}>
											{dots.slice(0, 3).map((mid) => (
												<div key={mid} style={{ width: 5, height: 5, borderRadius: "50%", background: memberMap[mid]?.color ?? "#fff" }} />
											))}
										</div>
									</div>
								) : null}
							</div>
						);
					})}
				</div>
			</div>

			{/* Member Legend */}
			<div>
				<div style={{ fontSize: 13, fontWeight: 600, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
					Household
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
					{members.map((m) => (
						<div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
							<MemberChip member={m} size="sm" />
							<span style={{ color: t.text, fontSize: 15, fontWeight: 500 }}>{m.name}</span>
							{m.role === "admin" && <span style={{ fontSize: 10, color: t.textSubtle, background: t.bgCard, padding: "1px 6px", borderRadius: 4 }}>admin</span>}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
