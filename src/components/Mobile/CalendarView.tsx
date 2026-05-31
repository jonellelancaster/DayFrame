import { useState, useMemo } from "react";
import type { CalendarEvent, Member, EventCategory, RecurrenceRule } from "../../types";
import { CATEGORY_ICONS } from "../../data/mockData";
import { buildEventsByDay } from "../../utils/recurrence";

interface Props {
	events: CalendarEvent[];
	members: Member[];
	today: Date;
	customCategories: string[];
	categoryEmojis: Record<string, string>;
	onAddEvent: (event: Omit<CalendarEvent, "id">) => void;
	onDeleteEvent: (eventId: string) => void;
	onUpdateEvent: (event: CalendarEvent) => void;
	onAddCategory: (name: string, emoji: string) => void;
	onTagGoogleEvent?: (eventId: string, memberIds: string[]) => void;
}

const EMOJI_OPTIONS = ["🎵","🎸","🎮","🎯","🏋️","🧘","🍕","🍜","🛒","💇","💅","🐕","🐈","🌿","🚗","✂️","📦","🔧","💊","🎁","🏖️","🎭","🏠","💰","🎉","🎨","🏃","📸","🎬","🌟","🛁","🧴"];
const KEYWORD_MAP: [string[], string][] = [
	[["gym","workout","exercise","fitness","training","lift","weight"], "🏋️"],
	[["yoga","meditat","relax","wellness","mindful"], "🧘"],
	[["music","song","band","concert","guitar","piano","sing"], "🎵"],
	[["game","gaming","play","video game","esport"], "🎮"],
	[["food","eat","dinner","lunch","breakfast","meal","cook","bake","pizza","restaurant"], "🍕"],
	[["shop","groceri","store","market","buy","purchase"], "🛒"],
	[["hair","salon","nail","spa","beauty","groom"], "💇"],
	[["dog","pet","walk","vet","animal"], "🐕"],
	[["cat","kitten","feline"], "🐈"],
	[["garden","plant","flower","lawn","yard"], "🌿"],
	[["car","drive","auto","mechanic","oil change"], "🚗"],
	[["craft","sew","knit","art","paint","draw"], "🎨"],
	[["run","jog","walk","hike","marathon"], "🏃"],
	[["photo","camera","picture","portrait"], "📸"],
	[["movie","film","cinema","watch","theater"], "🎬"],
	[["party","celebrat","birthday","holiday"], "🎉"],
	[["gift","present","surprise"], "🎁"],
	[["beach","vacation","trip","travel","resort"], "🏖️"],
	[["money","finance","budget","bill","bank","pay"], "💰"],
	[["clean","bath","shower","laundry"], "🛁"],
	[["target","goal","aim","archery","dart"], "🎯"],
	[["repair","fix","tool","handyman","plumb","electr"], "🔧"],
	[["medicine","pill","health","pharmacy","prescription"], "💊"],
	[["house","home","moving","rent","mortgage"], "🏠"],
	[["theater","perform","show","stage"], "🎭"],
	[["package","ship","deliver","mail","box","move"], "📦"],
];

function autoEmoji(name: string): string {
	const lower = name.toLowerCase();
	for (const [keys, emoji] of KEYWORD_MAP) {
		if (keys.some((k) => lower.includes(k))) return emoji;
	}
	return "";
}

type CalView = "month" | "week" | "day";
const DEFAULT_CATEGORIES: EventCategory[] = ["School", "Music", "Medical", "Sports", "Work", "Social", "Chores", "Travel"];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am – 10pm

const toDateStr = (d: Date) => d.toISOString().split("T")[0];
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

function fmt12(t?: string): string {
	if (!t) return "";
	const [h, m] = t.split(":").map(Number);
	return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function sortEvents(evs: CalendarEvent[]): CalendarEvent[] {
	return [...evs].sort((a, b) => {
		if (!a.startTime && !b.startTime) return a.title.localeCompare(b.title);
		if (!a.startTime) return -1;
		if (!b.startTime) return 1;
		return a.startTime.localeCompare(b.startTime);
	});
}

function dateRangeLabel(ev: CalendarEvent): string {
	if (!ev.endDate || ev.endDate === ev.date) return "";
	const start = new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
	const end = new Date(ev.endDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
	return `${start} – ${end}`;
}

function weekStart(d: Date) {
	const day = (d.getDay() + 6) % 7;
	return addDays(d, -day);
}

export function CalendarView({ events, members, today, customCategories, categoryEmojis, onAddEvent, onDeleteEvent, onUpdateEvent, onAddCategory, onTagGoogleEvent }: Props) {
	const [calView, setCalView] = useState<CalView>("month");
	const [selectedDate, setSelectedDate] = useState(toDateStr(today));
	const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
	const [showForm, setShowForm] = useState(false);
	const [editingEventId, setEditingEventId] = useState<string | null>(null);
	const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	// Form state
	const [title, setTitle] = useState("");
	const [formDate, setFormDate] = useState(selectedDate);
	const [formEndDate, setFormEndDate] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
	const [memberIds, setMemberIds] = useState<string[]>([]);
	const [category, setCategory] = useState<string>("Social");
	const [location, setLocation] = useState("");
	const [showAddCat, setShowAddCat] = useState(false);
	const [newCatName, setNewCatName] = useState("");
	const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
	const [recurrFreq, setRecurrFreq] = useState<"none" | RecurrenceRule["frequency"]>("none");
	const [recurrDays, setRecurrDays] = useState<number[]>([]);

	const memberMap = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);
	const getIcon = (cat: string) => categoryEmojis[cat] ?? CATEGORY_ICONS[cat] ?? "🏷️";

	const eventsByDay = useMemo(() => buildEventsByDay(events), [events]);

	const todayStr = toDateStr(today);
	const year = viewMonth.getFullYear();
	const month = viewMonth.getMonth();

	const wkStart = weekStart(new Date(selectedDate + "T12:00:00"));
	const weekDays = Array.from({ length: 7 }, (_, i) => addDays(wkStart, i));

	const goToPrev = () => {
		if (calView === "month") setViewMonth(new Date(year, month - 1, 1));
		else if (calView === "week") setSelectedDate(toDateStr(addDays(new Date(selectedDate + "T12:00:00"), -7)));
		else setSelectedDate(toDateStr(addDays(new Date(selectedDate + "T12:00:00"), -1)));
	};
	const goToNext = () => {
		if (calView === "month") setViewMonth(new Date(year, month + 1, 1));
		else if (calView === "week") setSelectedDate(toDateStr(addDays(new Date(selectedDate + "T12:00:00"), 7)));
		else setSelectedDate(toDateStr(addDays(new Date(selectedDate + "T12:00:00"), 1)));
	};

	const navLabel = () => {
		if (calView === "month") return viewMonth.toLocaleString("default", { month: "long", year: "numeric" });
		if (calView === "week") {
			const end = addDays(wkStart, 6);
			return `${wkStart.toLocaleString("default", { month: "short", day: "numeric" })} – ${end.toLocaleString("default", { month: "short", day: "numeric", year: "numeric" })}`;
		}
		return new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
	};

	const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

	const addCat = () => {
		const name = newCatName.trim();
		if (!name || allCategories.includes(name)) return;
		const emoji = selectedEmoji ?? autoEmoji(name) ?? "🏷️";
		onAddCategory(name, emoji);
		setCategory(name);
		setNewCatName("");
		setSelectedEmoji(null);
		setShowAddCat(false);
	};

	const openAdd = (date = selectedDate) => {
		setEditingEventId(null);
		setTitle(""); setFormDate(date); setFormEndDate(""); setStartTime(""); setEndTime("");
		setMemberIds([]);
		setCategory("Social"); setLocation("");
		setShowAddCat(false); setNewCatName(""); setSelectedEmoji(null);
		setRecurrFreq("none"); setRecurrDays([]);
		setShowForm(true);
	};

	const openEdit = (ev: CalendarEvent) => {
		const base = ev.recurrence ? (events.find((e) => e.id === ev.id) ?? ev) : ev;
		setEditingEventId(base.id);
		setTitle(base.title);
		setFormDate(base.date);
		setFormEndDate(base.endDate ?? "");
		setStartTime(base.startTime ?? "");
		setEndTime(base.endTime ?? "");
		setMemberIds([...base.memberIds]);
		setCategory(base.category);
		setLocation(base.location ?? "");
		setRecurrFreq(base.recurrence?.frequency ?? "none");
		setRecurrDays(base.recurrence?.days ?? []);
		setDetailEvent(null);
		setConfirmingDelete(false);
		setShowAddCat(false); setNewCatName(""); setSelectedEmoji(null);
		setShowForm(true);
	};

	const handleSetRecurrFreq = (f: typeof recurrFreq) => {
		setRecurrFreq(f);
		if (f === "weekly" && recurrDays.length === 0) {
			setRecurrDays([(new Date(formDate + "T12:00:00").getDay() + 6) % 7]);
		}
	};
	const toggleRecurrDay = (d: number) =>
		setRecurrDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b));

	const toggleMember = (id: string) =>
		setMemberIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

	const submitForm = () => {
		if (!title.trim()) return;
		const recurrence: RecurrenceRule | undefined = recurrFreq !== "none"
			? { frequency: recurrFreq, ...(recurrFreq === "weekly" ? { days: recurrDays } : {}) }
			: undefined;
		const payload: Omit<CalendarEvent, "id"> = {
			title: title.trim(),
			date: formDate,
			endDate: !recurrence && formEndDate && formEndDate > formDate ? formEndDate : undefined,
			startTime: startTime || undefined,
			endTime: endTime || undefined,
			memberIds,
			category,
			location: location.trim() || undefined,
			recurrence,
			source: "local",
		};
		if (editingEventId) {
			onUpdateEvent({ ...payload, id: editingEventId });
		} else {
			onAddEvent(payload);
		}
		setShowForm(false);
		setEditingEventId(null);
	};

	const canSubmit = title.trim().length > 0;
	const primaryColor = memberIds.length > 0 ? (memberMap[memberIds[0]]?.color ?? "#1D9E75") : "#1D9E75";

	const calendarDays = useMemo(() => {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startDow = (firstDay.getDay() + 6) % 7;
		const days: (Date | null)[] = Array(startDow).fill(null);
		for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
		return days;
	}, [year, month]);

	return (
		<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#fff", position: "relative" }}>
			{/* Header */}
			<div style={{ padding: "12px 16px 0", borderBottom: "1px solid #f1f5f9" }}>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
					<button onClick={goToPrev} style={navBtn}>‹</button>
					<span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", textAlign: "center", flex: 1 }}>{navLabel()}</span>
					<button onClick={goToNext} style={navBtn}>›</button>
				</div>
				<div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
					{(["month", "week", "day"] as CalView[]).map((v) => (
						<button
							key={v}
							onClick={() => setCalView(v)}
							style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "none", background: calView === v ? "#1D9E75" : "#f1f5f9", color: calView === v ? "#fff" : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}
						>
							{v}
						</button>
					))}
				</div>
			</div>

			{/* ── MONTH VIEW ──────────────────────────────── */}
			{calView === "month" && (
				<>
					<div style={{ padding: "8px 16px 4px" }}>
						<div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
							{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
								<div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "#94a3b8", paddingBottom: 4 }}>{d}</div>
							))}
							{calendarDays.map((day, i) => {
								if (!day) return <div key={`e${i}`} />;
								const ds = toDateStr(day);
								const isToday = ds === todayStr;
								const isSelected = ds === selectedDate;
								const dotColors = (() => { const seen = new Set<string>(); const res: string[] = []; for (const e of (eventsByDay[ds] ?? [])) { const c = memberMap[e.memberIds[0]]?.color ?? e.calendarColor ?? "#cbd5e1"; if (!seen.has(c)) { seen.add(c); res.push(c); } if (res.length >= 3) break; } return res; })();
								return (
									<div key={ds} onClick={() => setSelectedDate(ds)} style={{ textAlign: "center", cursor: "pointer" }}>
										<div style={{ width: 32, height: 32, borderRadius: "50%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: isToday || isSelected ? 700 : 400, background: isSelected ? "#1D9E75" : isToday ? "#e8f8f2" : "transparent", color: isSelected ? "#fff" : isToday ? "#1D9E75" : "#0f172a" }}>
											{day.getDate()}
										</div>
										<div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2, height: 5 }}>
											{dotColors.map((c, ci) => <div key={ci} style={{ width: 5, height: 5, borderRadius: "50%", background: c }} />)}
										</div>
									</div>
								);
							})}
						</div>
					</div>
					<div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
						<div style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 10 }}>
							{new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
						</div>
						<EventList events={eventsByDay[selectedDate] ?? []} memberMap={memberMap} categoryEmojis={categoryEmojis} onSelect={setDetailEvent} />
					</div>
				</>
			)}

			{/* ── WEEK VIEW ──────────────────────────────── */}
			{calView === "week" && (
				<div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
					<div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(100px, 1fr))", minWidth: 700, height: "100%" }}>
						{weekDays.map((day) => {
							const ds = toDateStr(day);
							const isToday = ds === todayStr;
							const isSelected = ds === selectedDate;
							const dayEvents = sortEvents(eventsByDay[ds] ?? []);
							return (
								<div key={ds} style={{ borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column" }}>
									<div onClick={() => setSelectedDate(ds)} style={{ padding: "10px 8px", textAlign: "center", cursor: "pointer", borderBottom: "1px solid #f1f5f9", background: isSelected ? "#e8f8f2" : "#fff", position: "sticky", top: 0 }}>
										<div style={{ fontSize: 11, fontWeight: 600, color: isToday ? "#1D9E75" : "#94a3b8" }}>
											{day.toLocaleString("default", { weekday: "short" })}
										</div>
										<div style={{ width: 30, height: 30, borderRadius: "50%", margin: "2px auto 0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, background: isToday ? "#1D9E75" : "transparent", color: isToday ? "#fff" : "#0f172a" }}>
											{day.getDate()}
										</div>
									</div>
									<div style={{ flex: 1, padding: "6px 4px", display: "flex", flexDirection: "column", gap: 4 }}>
										{dayEvents.map((ev) => {
											const evColor = memberMap[ev.memberIds[0]]?.color ?? ev.calendarColor ?? "#64748b";
											const isMultiDay = ev.endDate && ev.endDate > ev.date;
											return (
												<div key={ev.id} onClick={() => setDetailEvent(ev)} style={{ background: evColor + "18", borderLeft: `3px solid ${evColor}`, borderRadius: "0 6px 6px 0", padding: "4px 6px", cursor: "pointer" }}>
													<div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{isMultiDay ? "↔ " : ""}{ev.recurrence ? "↻ " : ""}{ev.title}</div>
													<div style={{ fontSize: 10, color: "#64748b" }}>{ev.startTime ? fmt12(ev.startTime) : "All day"}</div>
												</div>
											);
										})}
										<div onClick={() => openAdd(ds)} style={{ border: "1px dashed #e2e8f0", borderRadius: 6, padding: "4px 6px", fontSize: 11, color: "#cbd5e1", cursor: "pointer", textAlign: "center" }}>
											+
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* ── DAY VIEW ──────────────────────────────── */}
			{calView === "day" && (
				<div style={{ flex: 1, overflowY: "auto" }}>
					{(() => {
						const allForDay = sortEvents(eventsByDay[selectedDate] ?? []);
						const allDayEvents = allForDay.filter((ev) => !ev.startTime);
						const timedEvents = allForDay.filter((ev) => !!ev.startTime);
						const SLOT_H = 56;

						const positioned = timedEvents.map((ev) => {
							const [sh, sm] = ev.startTime!.split(":").map(Number);
							const [eh, em] = (ev.endTime ?? `${sh + 1}:${ev.startTime!.split(":")[1]}`).split(":").map(Number);
							const top = (sh + sm / 60 - 6) * SLOT_H;
							const height = Math.max((eh + em / 60 - (sh + sm / 60)) * SLOT_H, 24);
							return { ev, top, height };
						});

						return (
							<>
								{allDayEvents.length > 0 && (
									<div style={{ padding: "8px 16px", borderBottom: "1px solid #f1f5f9", background: "#fafafa" }}>
										<div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>All day</div>
										<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
											{allDayEvents.map((ev) => {
												const evColor = memberMap[ev.memberIds[0]]?.color ?? ev.calendarColor ?? "#64748b";
												return (
													<div key={ev.id} onClick={() => setDetailEvent(ev)} style={{ background: evColor + "18", borderLeft: `3px solid ${evColor}`, borderRadius: "0 6px 6px 0", padding: "5px 8px", cursor: "pointer" }}>
														<div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{ev.title}</div>
													</div>
												);
											})}
										</div>
									</div>
								)}
								<div style={{ position: "relative", paddingLeft: 52 }}>
									{HOURS.map((h) => (
										<div key={h} style={{ height: SLOT_H, borderBottom: "1px solid #f1f5f9", position: "relative" }}>
											<span style={{ position: "absolute", left: -50, top: -8, width: 44, textAlign: "right", fontSize: 11, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
												{h % 12 || 12}{h < 12 ? "am" : "pm"}
											</span>
										</div>
									))}
									{positioned.map(({ ev, top, height }) => {
										const evColor = memberMap[ev.memberIds[0]]?.color ?? ev.calendarColor ?? "#64748b";
										const isMultiDay = ev.endDate && ev.endDate > ev.date;
										return (
											<div
												key={ev.id}
												onClick={() => setDetailEvent(ev)}
												style={{ position: "absolute", top: top + 2, left: 56, right: 8, height: height - 4, background: evColor + "22", borderLeft: `4px solid ${evColor}`, borderRadius: "0 8px 8px 0", padding: "4px 8px", overflow: "hidden", cursor: "pointer" }}
											>
												<div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>{isMultiDay ? "↔ " : ""}{ev.title}</div>
												<div style={{ fontSize: 11, color: "#64748b" }}>{fmt12(ev.startTime)}{ev.endTime ? ` – ${fmt12(ev.endTime)}` : ""}</div>
												{ev.memberIds.map((mid) => memberMap[mid]).filter(Boolean).map((mem) => (
													<span key={mem!.id} style={{ fontSize: 10, fontWeight: 600, color: mem!.color, marginRight: 4 }}>{mem!.name}</span>
												))}
											</div>
										);
									})}
								</div>
							</>
						);
					})()}
				</div>
			)}

			{/* FAB */}
			<div onClick={() => openAdd()} style={{ position: "absolute", bottom: 80, right: 20, width: 52, height: 52, borderRadius: "50%", background: "#1D9E75", color: "#fff", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(29,158,117,0.4)", cursor: "pointer", userSelect: "none", zIndex: 5 }}>
				+
			</div>

			{/* Event detail bottom sheet */}
			{detailEvent && (
				<>
					<div onClick={() => { setDetailEvent(null); setConfirmingDelete(false); }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 10 }} />
					<div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 20px 32px", zIndex: 11 }}>
						<div style={{ width: 36, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto 16px" }} />
						<div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
							<span style={{ fontSize: 28 }}>{getIcon(detailEvent.category)}</span>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{detailEvent.title}</div>
								<div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{detailEvent.category}</div>
							</div>
							<button onClick={() => { setDetailEvent(null); setConfirmingDelete(false); }} style={{ background: "#f1f5f9", border: "none", color: "#64748b", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
							<div style={{ fontSize: 14, color: "#475569" }}>
								🕐 {detailEvent.startTime ? `${fmt12(detailEvent.startTime)}${detailEvent.endTime ? ` – ${fmt12(detailEvent.endTime)}` : ""}` : "All day"}
							</div>
							<div style={{ fontSize: 14, color: "#475569" }}>
								📅 {(() => {
									const span = dateRangeLabel(detailEvent);
									if (span) return span;
									return new Date(detailEvent.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
								})()}
							</div>
							{detailEvent.location && <div style={{ fontSize: 14, color: "#475569" }}>📍 {detailEvent.location}</div>}
							<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
								{detailEvent.memberIds.map((mid) => {
									const m = memberMap[mid];
									return m ? <span key={mid} style={{ padding: "3px 10px", borderRadius: 20, background: m.color + "20", color: m.color, fontSize: 12, fontWeight: 600 }}>{m.name}</span> : null;
								})}
							</div>
						</div>
						{confirmingDelete ? (
							<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
								<div style={{ fontSize: 14, fontWeight: 600, color: "#ef4444", textAlign: "center" }}>Delete this event?</div>
								<div style={{ display: "flex", gap: 10 }}>
									<button onClick={() => { onDeleteEvent(detailEvent.id); setDetailEvent(null); setConfirmingDelete(false); }} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
										Yes, delete
									</button>
									<button onClick={() => setConfirmingDelete(false)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: "#f1f5f9", color: "#64748b", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
										Cancel
									</button>
								</div>
							</div>
						) : detailEvent.source === "google" ? (
							<div>
								<div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
									☁ Synced from Google · Tag members
								</div>
								<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
									{members.map((m) => {
										const sel = detailEvent.memberIds.includes(m.id);
										return (
											<button
												key={m.id}
												onClick={() => {
													const next = sel ? detailEvent.memberIds.filter((id) => id !== m.id) : [...detailEvent.memberIds, m.id];
													setDetailEvent({ ...detailEvent, memberIds: next });
													onTagGoogleEvent?.(detailEvent.id, next);
												}}
												style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 20, border: `2px solid ${sel ? m.color : "#e2e8f0"}`, background: sel ? m.color + "18" : "#fff", color: sel ? m.color : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
											>
												<div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color }} />
												{m.name}
											</button>
										);
									})}
								</div>
							</div>
						) : (
							<div style={{ display: "flex", gap: 10 }}>
								<button onClick={() => openEdit(detailEvent)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: "#eff6ff", color: "#3b82f6", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
									✏️ Edit
								</button>
								<button onClick={() => setConfirmingDelete(true)} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: "#fef2f2", color: "#ef4444", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
									🗑 Delete
								</button>
							</div>
						)}
					</div>
				</>
			)}

			{/* Add / Edit Event bottom sheet */}
			{showForm && (
				<>
					<div onClick={() => { setShowForm(false); setEditingEventId(null); }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 10 }} />
					<div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderRadius: "16px 16px 0 0", padding: "20px 20px 28px", zIndex: 11, display: "flex", flexDirection: "column", gap: 14, maxHeight: "92%", overflowY: "auto" }}>
						<div style={{ width: 36, height: 4, background: "#e2e8f0", borderRadius: 2, margin: "0 auto -6px" }} />
						<div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{editingEventId ? "Edit Event" : "New Event"}</div>

						<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" autoFocus style={{ padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 15, outline: "none", color: "#0f172a" }} />

						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
							<div>
								<div style={lbl}>Start date</div>
								<input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} style={timeInput} />
							</div>
							{recurrFreq === "none" && (
							<div>
								<div style={lbl}>End date <span style={{ fontWeight: 400, textTransform: "none" }}>(opt)</span></div>
								<input type="date" value={formEndDate} min={formDate} onChange={(e) => setFormEndDate(e.target.value)} style={timeInput} />
							</div>
						)}
							<div>
								<div style={lbl}>Start time <span style={{ fontWeight: 400, textTransform: "none" }}>(opt)</span></div>
								<input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={timeInput} />
							</div>
							<div>
								<div style={lbl}>End time <span style={{ fontWeight: 400, textTransform: "none" }}>(opt)</span></div>
								<input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={timeInput} />
							</div>
						</div>

						<div>
							<div style={lbl}>Repeats</div>
							<div style={{ display: "flex", gap: 6 }}>
								{(["none", "daily", "weekly", "monthly"] as const).map((f) => (
									<button
										key={f}
										onClick={() => handleSetRecurrFreq(f)}
										style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1.5px solid ${recurrFreq === f ? "#1D9E75" : "#e2e8f0"}`, background: recurrFreq === f ? "#e8f8f2" : "#fff", color: recurrFreq === f ? "#1D9E75" : "#64748b", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}
									>
										{f === "none" ? "None" : f.charAt(0).toUpperCase() + f.slice(1)}
									</button>
								))}
							</div>
							{recurrFreq === "weekly" && (
								<div style={{ display: "flex", gap: 5, marginTop: 8 }}>
									{["Mo","Tu","We","Th","Fr","Sa","Su"].map((d, i) => (
										<button
											key={i}
											onClick={() => toggleRecurrDay(i)}
											style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1.5px solid ${recurrDays.includes(i) ? "#1D9E75" : "#e2e8f0"}`, background: recurrDays.includes(i) ? "#e8f8f2" : "#fff", color: recurrDays.includes(i) ? "#1D9E75" : "#94a3b8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
										>
											{d}
										</button>
									))}
								</div>
							)}
						</div>

						<div>
							<div style={lbl}>Members</div>
							<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
								{members.map((m) => {
									const sel = memberIds.includes(m.id);
									return (
										<button key={m.id} onClick={() => toggleMember(m.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, border: `2px solid ${sel ? m.color : "#e2e8f0"}`, background: sel ? m.color + "18" : "#fff", color: sel ? m.color : "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
											<div style={{ width: 14, height: 14, borderRadius: "50%", background: m.color }} />
											{m.name}
										</button>
									);
								})}
							</div>
						</div>

						<div>
							<div style={lbl}>Category</div>
							<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
								{allCategories.map((c) => (
									<button key={c} onClick={() => setCategory(c)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1.5px solid ${category === c ? "#0f172a" : "#e2e8f0"}`, background: category === c ? "#0f172a" : "#fff", color: category === c ? "#fff" : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
										{getIcon(c)} {c}
									</button>
								))}
								{showAddCat ? (
									<div style={{ flexBasis: "100%", marginTop: 6, display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px", border: "1.5px solid #1D9E75", borderRadius: 10, background: "#f0fdf9" }}>
										<div style={{ display: "flex", gap: 6, alignItems: "center" }}>
											<span style={{ fontSize: 22, width: 32, textAlign: "center" }}>
												{selectedEmoji ?? (newCatName.trim() ? autoEmoji(newCatName) || "🏷️" : "🏷️")}
											</span>
											<input
												value={newCatName}
												onChange={(e) => setNewCatName(e.target.value)}
												onKeyDown={(e) => e.key === "Enter" && addCat()}
												placeholder="Category name"
												autoFocus
												style={{ flex: 1, padding: "6px 10px", border: "1.5px solid #1D9E75", borderRadius: 8, fontSize: 13, outline: "none", color: "#0f172a", background: "#fff" }}
											/>
											<button onClick={addCat} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#1D9E75", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Add</button>
											<button onClick={() => { setShowAddCat(false); setNewCatName(""); setSelectedEmoji(null); }} style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "#f1f5f9", color: "#64748b", fontSize: 13, cursor: "pointer" }}>✕</button>
										</div>
										<div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4 }}>
											{EMOJI_OPTIONS.map((em) => {
												const isAuto = !selectedEmoji && newCatName.trim() && autoEmoji(newCatName) === em;
												const isPicked = selectedEmoji === em;
												return (
													<button
														key={em}
														onClick={() => setSelectedEmoji(isPicked ? null : em)}
														style={{ fontSize: 18, padding: 4, borderRadius: 6, border: `2px solid ${isPicked ? "#1D9E75" : isAuto ? "#93c5fd" : "transparent"}`, background: isPicked ? "#f0fdf9" : isAuto ? "#eff6ff" : "transparent", cursor: "pointer", lineHeight: 1 }}
														title={em}
													>
														{em}
													</button>
												);
											})}
										</div>
									</div>
								) : (
									<button onClick={() => setShowAddCat(true)} style={{ padding: "5px 10px", borderRadius: 8, border: "1.5px dashed #e2e8f0", background: "transparent", color: "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
										+ New
									</button>
								)}
							</div>
						</div>

						<div>
							<div style={lbl}>Location <span style={{ fontWeight: 400, textTransform: "none" }}>(opt)</span></div>
							<input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Bright Smiles Dental" style={{ padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 14, outline: "none", color: "#0f172a", width: "100%" }} />
						</div>

						<div style={{ display: "flex", gap: 10 }}>
							<button onClick={submitForm} disabled={!canSubmit} style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: canSubmit ? primaryColor : "#e2e8f0", color: canSubmit ? "#fff" : "#94a3b8", fontSize: 15, fontWeight: 700, cursor: canSubmit ? "pointer" : "default" }}>
								{editingEventId ? "Save Changes" : "Add Event"}
							</button>
							<button onClick={() => { setShowForm(false); setEditingEventId(null); }} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "#f1f5f9", color: "#64748b", fontSize: 15, cursor: "pointer" }}>
								Cancel
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

function EventList({ events, memberMap, categoryEmojis, onSelect }: { events: CalendarEvent[]; memberMap: Record<string, Member>; categoryEmojis: Record<string, string>; onSelect: (ev: CalendarEvent) => void }) {
	const getIcon = (cat: string) => categoryEmojis[cat] ?? CATEGORY_ICONS[cat] ?? "📅";
	const sorted = sortEvents(events);
	if (sorted.length === 0) return <div style={{ color: "#94a3b8", fontSize: 15, paddingTop: 8 }}>No events</div>;
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
			{sorted.map((ev) => {
				const evColor = memberMap[ev.memberIds[0]]?.color ?? ev.calendarColor ?? "#94a3b8";
				const span = dateRangeLabel(ev);
				return (
					<div key={ev.id} onClick={() => onSelect(ev)} style={{ display: "flex", borderRadius: 10, overflow: "hidden", background: "#f8fafc", border: "1px solid #f1f5f9", cursor: "pointer" }}>
						<div style={{ width: 4, background: evColor, flexShrink: 0 }} />
						<div style={{ padding: "10px 12px", flex: 1 }}>
							<div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
								<span>{getIcon(ev.category)}</span>
								<span style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>{ev.title}</span>
								{span && <span style={{ fontSize: 11, color: "#94a3b8", background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>↔ {span}</span>}
							</div>
							<div style={{ fontSize: 13, color: "#64748b" }}>
								{ev.startTime ? `${fmt12(ev.startTime)}${ev.endTime ? ` – ${fmt12(ev.endTime)}` : ""}` : "All day"}
								{ev.location ? ` · ${ev.location}` : ""}
							</div>
							<div style={{ display: "flex", gap: 6, marginTop: 4 }}>
								{ev.memberIds.map((mid) => { const m = memberMap[mid]; return m ? <span key={mid} style={{ fontSize: 11, fontWeight: 600, color: m.color }}>{m.name}</span> : null; })}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}

const navBtn: React.CSSProperties = { background: "none", border: "none", fontSize: 22, color: "#64748b", cursor: "pointer", padding: "0 8px", lineHeight: 1 };
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 };
const timeInput: React.CSSProperties = { padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 14, outline: "none", color: "#0f172a", width: "100%" };
