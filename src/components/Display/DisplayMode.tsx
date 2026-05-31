import { useState, useMemo } from "react";
import type { CalendarEvent, Household, RecurrenceRule } from "../../types";
import { buildEventsByDay } from "../../utils/recurrence";
import { LeftPanel } from "./LeftPanel";
import { CenterPanel } from "./CenterPanel";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { RightPanel } from "./RightPanel";
import { CATEGORY_ICONS } from "../../data/mockData";
import { useTheme } from "../../theme";

interface Props {
	household: Household;
	today: Date;
	onToggleTask: (taskId: string) => void;
	onAddEvent: (event: Omit<CalendarEvent, "id">) => void;
	onDeleteEvent: (eventId: string) => void;
	onUpdateEvent: (event: CalendarEvent) => void;
	onAddCategory: (name: string, emoji: string) => void;
}

const toDateStr = (d: Date) => d.toISOString().split("T")[0];
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

function fmt12(t?: string): string {
	if (!t) return "";
	const [h, m] = t.split(":").map(Number);
	return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function dateRangeLabel(ev: CalendarEvent): string {
	if (!ev.endDate || ev.endDate === ev.date) {
		return new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
	}
	const start = new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });
	const end = new Date(ev.endDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
	return `${start} – ${end}`;
}

const DEFAULT_CATEGORIES = ["School", "Music", "Medical", "Sports", "Work", "Social", "Chores", "Travel"];

const EMOJI_OPTIONS = ["🎵","🎸","🎮","🎯","🏋️","🧘","🍕","🍜","🛒","💇","💅","🐕","🐈","🌿","🚗","✂️","📦","🔧","💊","🎁","🏖️","🎭","🏠","💰","🎉","🎨","🏃","📸","🎬","🌟","🛁","🧴"];

const KEYWORD_MAP: [string[], string][] = [
	[["gym","workout","exercise","fitness","training","lift","weight"], "🏋️"],
	[["yoga","meditat","relax","wellness","mindful"], "🧘"],
	[["music","band","concert","song","sing","instrument","choir"], "🎵"],
	[["guitar","drum","piano","bass"], "🎸"],
	[["game","gaming","video game","esport"], "🎮"],
	[["food","dinner","lunch","breakfast","eat","restaurant","cook","meal","bake"], "🍕"],
	[["noodle","ramen","pasta","soup","asian"], "🍜"],
	[["shop","shopping","store","grocery","groceries","errand","market","target","walmart"], "🛒"],
	[["hair","salon","nail","manicure","pedicure","beauty","glam"], "💇"],
	[["dog","puppy","pup","canine","walk dog"], "🐕"],
	[["cat","kitten","pet","vet","animal"], "🐈"],
	[["garden","plant","yard","outdoor","lawn","mow"], "🌿"],
	[["car","drive","road","auto","mechanic","oil change"], "🚗"],
	[["cut","trim","barbershop","barber","haircut"], "✂️"],
	[["fix","repair","maintenance","handyman","plumb","electrician"], "🔧"],
	[["medicine","doctor","pharmacy","prescription","sick","ill","dentist","optometrist"], "💊"],
	[["gift","present","birthday","celebrat","anniversary"], "🎁"],
	[["vacation","beach","travel","trip","holiday","getaway","cruise"], "🏖️"],
	[["theater","show","perform","stage","musical","opera"], "🎭"],
	[["home","house","clean","chore","laundry","housework","declutter"], "🏠"],
	[["money","finance","budget","bill","bank","pay","tax","invest"], "💰"],
	[["party","social","hang","friend","happy hour","gathering"], "🎉"],
	[["art","paint","draw","craft","creat","sketch","pottery"], "🎨"],
	[["run","jog","walk","hike","marathon","5k"], "🏃"],
	[["photo","camera","picture","portrait","photoshoot"], "📸"],
	[["movie","cinema","stream","watch","film","tv","netflix"], "🎬"],
	[["star","special","highlight","important"], "🌟"],
	[["spa","bath","shower","sauna","massage","facial"], "🛁"],
];

function autoEmoji(name: string): string {
	const lower = name.toLowerCase();
	for (const [keys, emoji] of KEYWORD_MAP) {
		if (keys.some((k) => lower.includes(k))) return emoji;
	}
	return "";
}

export function DisplayMode({ household, today, onToggleTask, onAddEvent, onDeleteEvent, onUpdateEvent, onAddCategory }: Props) {
	const { palette: t } = useTheme();
	const [displayDate, setDisplayDate] = useState(toDateStr(today));
	const [viewMode, setViewMode] = useState<"day" | "week" | "month">("day");
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editingEventId, setEditingEventId] = useState<string | null>(null);
	const [confirmingDelete, setConfirmingDelete] = useState(false);

	// Form state
	const [evTitle, setEvTitle] = useState("");
	const [evDate, setEvDate] = useState(displayDate);
	const [evEndDate, setEvEndDate] = useState("");
	const [evStart, setEvStart] = useState("");
	const [evEnd, setEvEnd] = useState("");
	const [evMembers, setEvMembers] = useState<string[]>([household.members[0]?.id ?? ""]);
	const [evCategory, setEvCategory] = useState<CalendarEvent["category"]>("Social");
	const [evLocation, setEvLocation] = useState("");
	const [showAddCat, setShowAddCat] = useState(false);
	const [newCatName, setNewCatName] = useState("");
	const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
	const [recurrFreq, setRecurrFreq] = useState<"none" | RecurrenceRule["frequency"]>("none");
	const [recurrDays, setRecurrDays] = useState<number[]>([]);

	const memberMap = Object.fromEntries(household.members.map((m) => [m.id, m]));

	// Expand recurring events so all panels see individual occurrences
	const expandedEventsByDay = useMemo(() => buildEventsByDay(household.events), [household.events]);
	const expandedEvents = useMemo(() => {
		const seen = new Set<string>();
		return Object.values(expandedEventsByDay).flat().filter((ev) => {
			const key = ev.id + ev.date;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
	}, [expandedEventsByDay]);

	const categoryEmojis = household.categoryEmojis ?? {};
	const allCategories = [...DEFAULT_CATEGORIES, ...(household.customCategories ?? [])];
	const getIcon = (cat: string) => categoryEmojis[cat] ?? CATEGORY_ICONS[cat] ?? "🏷️";

	const addCat = () => {
		const name = newCatName.trim();
		if (!name || allCategories.includes(name)) return;
		const emoji = selectedEmoji ?? autoEmoji(name) ?? "🏷️";
		onAddCategory(name, emoji);
		setEvCategory(name);
		setNewCatName(""); setSelectedEmoji(null); setShowAddCat(false);
	};

	const openAdd = () => {
		setEditingEventId(null);
		setEvTitle(""); setEvDate(displayDate); setEvEndDate(""); setEvStart(""); setEvEnd("");
		setEvMembers([]); setEvCategory("Social"); setEvLocation("");
		setShowAddCat(false); setNewCatName(""); setSelectedEmoji(null);
		setRecurrFreq("none"); setRecurrDays([]);
		setShowForm(true);
	};

	const openEdit = (ev: CalendarEvent) => {
		// If clicking a recurring occurrence, find the base event for its original start date
		const base = ev.recurrence ? (household.events.find((e) => e.id === ev.id) ?? ev) : ev;
		setEditingEventId(base.id);
		setEvTitle(base.title);
		setEvDate(base.date);
		setEvEndDate(base.endDate ?? "");
		setEvStart(base.startTime ?? "");
		setEvEnd(base.endTime ?? "");
		setEvMembers([...base.memberIds]);
		setEvCategory(base.category);
		setEvLocation(base.location ?? "");
		setRecurrFreq(base.recurrence?.frequency ?? "none");
		setRecurrDays(base.recurrence?.days ?? []);
		setSelectedEvent(null);
		setConfirmingDelete(false);
		setShowAddCat(false); setNewCatName(""); setSelectedEmoji(null);
		setShowForm(true);
	};

	const handleSetRecurrFreq = (f: typeof recurrFreq) => {
		setRecurrFreq(f);
		if (f === "weekly" && recurrDays.length === 0) {
			setRecurrDays([(new Date(evDate + "T12:00:00").getDay() + 6) % 7]);
		}
	};
	const toggleRecurrDay = (d: number) =>
		setRecurrDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b));

	const submitForm = () => {
		if (!evTitle.trim()) return;
		const recurrence: RecurrenceRule | undefined = recurrFreq !== "none"
			? { frequency: recurrFreq, ...(recurrFreq === "weekly" ? { days: recurrDays } : {}) }
			: undefined;
		const payload: Omit<CalendarEvent, "id"> = {
			title: evTitle.trim(),
			date: evDate,
			endDate: !recurrence && evEndDate && evEndDate > evDate ? evEndDate : undefined,
			startTime: evStart || undefined,
			endTime: evEnd || undefined,
			memberIds: evMembers,
			category: evCategory,
			location: evLocation.trim() || undefined,
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

	const toggleEvMember = (id: string) =>
		setEvMembers((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

	const canSubmit = evTitle.trim().length > 0;

	return (
		<div style={{ width: "100vw", height: "100vh", background: t.bg, display: "grid", gridTemplateColumns: "280px 1fr 260px", overflow: "hidden", fontFamily: "'Inter', system-ui, sans-serif", color: t.text, position: "relative" }}>

			{/* Left */}
			<div style={{ padding: "32px 24px", borderRight: `1px solid ${t.border}`, overflowY: "auto", overflowX: "hidden" }}>
				<LeftPanel members={household.members} events={expandedEvents} today={today} displayDate={displayDate} onSelectDate={setDisplayDate} />
			</div>

			{/* Center */}
			<div style={{ padding: "32px 36px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
				{/* View toggle */}
				<div style={{ display: "flex", gap: 4, marginBottom: 20, justifyContent: "flex-end" }}>
					{(["day", "week", "month"] as const).map((mode) => (
						<button
							key={mode}
							onClick={() => setViewMode(mode)}
							style={{
								padding: "6px 16px",
								borderRadius: 8,
								border: `1.5px solid ${viewMode === mode ? t.accent : t.border}`,
								background: viewMode === mode ? t.bgAccentFaint : "transparent",
								color: viewMode === mode ? t.accent : t.textFaint,
								fontSize: 12,
								fontWeight: 700,
								cursor: "pointer",
								textTransform: "capitalize",
							}}
						>
							{mode.charAt(0).toUpperCase() + mode.slice(1)}
						</button>
					))}
				</div>

				{/* View content */}
				<div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
					{viewMode === "day" && (
						<CenterPanel
							events={expandedEvents}
							members={household.members}
							today={today}
							displayDate={displayDate}
							categoryEmojis={categoryEmojis}
							onSelectDate={setDisplayDate}
							onSelectEvent={setSelectedEvent}
							onAddEvent={openAdd}
							onPrevDay={() => setDisplayDate(toDateStr(addDays(new Date(displayDate + "T12:00:00"), -1)))}
							onNextDay={() => setDisplayDate(toDateStr(addDays(new Date(displayDate + "T12:00:00"), 1)))}
						/>
					)}
					{viewMode === "week" && (
						<WeekView
							events={expandedEvents}
							members={household.members}
							displayDate={displayDate}
							categoryEmojis={categoryEmojis}
							onSelectDate={(date) => { setDisplayDate(date); setViewMode("day"); }}
							onNavigate={setDisplayDate}
							onSelectEvent={setSelectedEvent}
							onAddEvent={openAdd}
						/>
					)}
					{viewMode === "month" && (
						<MonthView
							events={expandedEvents}
							members={household.members}
							displayDate={displayDate}
							categoryEmojis={categoryEmojis}
							onSelectDate={(date) => { setDisplayDate(date); setViewMode("day"); }}
							onNavigate={setDisplayDate}
							onSelectEvent={setSelectedEvent}
							onAddEvent={openAdd}
						/>
					)}
				</div>
			</div>

			{/* Right */}
			<div style={{ padding: "32px 24px", borderLeft: `1px solid ${t.border}`, overflowY: "auto" }}>
				<RightPanel tasks={household.tasks} members={household.members} today={today} weeklyPoints={household.weeklyPoints} redeemableRewards={household.redeemableRewards} onToggleTask={onToggleTask} />
			</div>

			{/* Event detail overlay */}
			{selectedEvent && (
				<div onClick={() => { setSelectedEvent(null); setConfirmingDelete(false); }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
					<div onClick={(e) => e.stopPropagation()} style={{ background: t.bgCard, borderRadius: 20, padding: "32px", width: 480, maxWidth: "90vw", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
						<div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20 }}>
							<span style={{ fontSize: 32 }}>{getIcon(selectedEvent.category)}</span>
							<div style={{ flex: 1 }}>
								<div style={{ fontSize: 28, fontWeight: 800, color: t.textHeading, lineHeight: 1.2 }}>{selectedEvent.title}</div>
								<div style={{ fontSize: 14, color: t.textSubtle, marginTop: 4 }}>{selectedEvent.category}</div>
							</div>
							<button onClick={() => { setSelectedEvent(null); setConfirmingDelete(false); }} style={{ background: t.borderStrong, border: "none", color: t.textMuted, borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
						</div>
						<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
							{selectedEvent.startTime ? (
								<Row icon="🕐" label={`${fmt12(selectedEvent.startTime)}${selectedEvent.endTime ? ` – ${fmt12(selectedEvent.endTime)}` : ""}`} textColor={t.textMuted} />
							) : (
								<Row icon="🕐" label="All day" textColor={t.textMuted} />
							)}
							<Row icon="📅" label={dateRangeLabel(selectedEvent)} textColor={t.textMuted} />
							{selectedEvent.location && <Row icon="📍" label={selectedEvent.location} textColor={t.textMuted} />}
							<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
								{selectedEvent.memberIds.map((mid) => {
									const m = memberMap[mid];
									return m ? (
										<span key={mid} style={{ padding: "4px 12px", borderRadius: 20, background: m.color + "25", color: m.color, fontSize: 13, fontWeight: 600 }}>{m.name}</span>
									) : null;
								})}
							</div>
						</div>
						<div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${t.borderStrong}`, display: "flex", flexDirection: "column", gap: 10 }}>
							{confirmingDelete ? (
								<>
									<div style={{ fontSize: 15, fontWeight: 600, color: "#f87171", textAlign: "center" }}>Delete this event?</div>
									<div style={{ display: "flex", gap: 10 }}>
										<button
											onClick={() => { onDeleteEvent(selectedEvent.id); setSelectedEvent(null); setConfirmingDelete(false); }}
											style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#ef4444", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
										>
											Yes, delete
										</button>
										<button
											onClick={() => setConfirmingDelete(false)}
											style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: t.borderStrong, color: t.textMuted, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
										>
											Cancel
										</button>
									</div>
								</>
							) : (
								<div style={{ display: "flex", gap: 10 }}>
									<button
										onClick={() => openEdit(selectedEvent)}
										style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#1e3a5f", color: "#60a5fa", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
									>
										✏️ Edit
									</button>
									<button
										onClick={() => setConfirmingDelete(true)}
										style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: "#450a0a", color: "#f87171", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
									>
										🗑 Delete
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Add / Edit event overlay */}
			{showForm && (
				<div onClick={() => { setShowForm(false); setEditingEventId(null); }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
					<div onClick={(e) => e.stopPropagation()} style={{ background: t.bgCard, borderRadius: 20, padding: "32px", width: 520, maxWidth: "90vw", display: "flex", flexDirection: "column", gap: 16 }}>
						<div style={{ fontSize: 22, fontWeight: 800, color: t.textHeading }}>{editingEventId ? "Edit Event" : "New Event"}</div>

						<input value={evTitle} onChange={(e) => setEvTitle(e.target.value)} placeholder="Event title" autoFocus style={{ padding: "10px 14px", background: t.bg, border: `1.5px solid ${t.borderStrong}`, borderRadius: 10, fontSize: 14, color: t.textHeading, outline: "none", width: "100%" }} />

						<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
							<div>
								<div style={{ fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Start date</div>
								<input type="date" value={evDate} onChange={(e) => setEvDate(e.target.value)} style={{ padding: "10px 14px", background: t.bg, border: `1.5px solid ${t.borderStrong}`, borderRadius: 10, fontSize: 14, color: t.textHeading, outline: "none", width: "100%" }} />
							</div>
							{recurrFreq === "none" && (
								<div>
									<div style={{ fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>End date <span style={{ fontWeight: 400, textTransform: "none" }}>(opt)</span></div>
									<input type="date" value={evEndDate} min={evDate} onChange={(e) => setEvEndDate(e.target.value)} style={{ padding: "10px 14px", background: t.bg, border: `1.5px solid ${t.borderStrong}`, borderRadius: 10, fontSize: 14, color: t.textHeading, outline: "none", width: "100%" }} />
								</div>
							)}
							<div>
								<div style={{ fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Start time <span style={{ fontWeight: 400, textTransform: "none" }}>(opt)</span></div>
								<input type="time" value={evStart} onChange={(e) => setEvStart(e.target.value)} style={{ padding: "10px 14px", background: t.bg, border: `1.5px solid ${t.borderStrong}`, borderRadius: 10, fontSize: 14, color: t.textHeading, outline: "none", width: "100%" }} />
							</div>
							<div>
								<div style={{ fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>End time <span style={{ fontWeight: 400, textTransform: "none" }}>(opt)</span></div>
								<input type="time" value={evEnd} onChange={(e) => setEvEnd(e.target.value)} style={{ padding: "10px 14px", background: t.bg, border: `1.5px solid ${t.borderStrong}`, borderRadius: 10, fontSize: 14, color: t.textHeading, outline: "none", width: "100%" }} />
							</div>
						</div>

						<div>
							<div style={{ fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Repeats</div>
							<div style={{ display: "flex", gap: 6 }}>
								{(["none", "daily", "weekly", "monthly"] as const).map((f) => (
									<button
										key={f}
										onClick={() => handleSetRecurrFreq(f)}
										style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: `1.5px solid ${recurrFreq === f ? t.accent : t.borderStrong}`, background: recurrFreq === f ? t.bgAccentFaint : "transparent", color: recurrFreq === f ? t.accent : t.textSubtle, fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}
									>
										{f === "none" ? "None" : f.charAt(0).toUpperCase() + f.slice(1)}
									</button>
								))}
							</div>
							{recurrFreq === "weekly" && (
								<div style={{ display: "flex", gap: 6, marginTop: 8 }}>
									{["Mo","Tu","We","Th","Fr","Sa","Su"].map((d, i) => (
										<button
											key={i}
											onClick={() => toggleRecurrDay(i)}
											style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: `1.5px solid ${recurrDays.includes(i) ? t.accent : t.borderStrong}`, background: recurrDays.includes(i) ? t.bgAccentFaint : "transparent", color: recurrDays.includes(i) ? t.accent : t.textSubtle, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
										>
											{d}
										</button>
									))}
								</div>
							)}
						</div>

						<div>
							<div style={{ fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Members</div>
							<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
								{household.members.map((m) => {
									const sel = evMembers.includes(m.id);
									return (
										<button key={m.id} onClick={() => toggleEvMember(m.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, border: `2px solid ${sel ? m.color : t.borderStrong}`, background: sel ? m.color + "25" : "transparent", color: sel ? m.color : t.textSubtle, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
											<div style={{ width: 12, height: 12, borderRadius: "50%", background: m.color }} />{m.name}
										</button>
									);
								})}
							</div>
						</div>

						<div>
							<div style={{ fontSize: 11, fontWeight: 700, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Category</div>
							<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
								{allCategories.map((c) => (
									<button key={c} onClick={() => setEvCategory(c)} style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px solid ${evCategory === c ? t.textHeading : t.borderStrong}`, background: evCategory === c ? t.textHeading : "transparent", color: evCategory === c ? t.bg : t.textSubtle, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
										{getIcon(c)} {c}
									</button>
								))}
								{showAddCat ? (
									<div style={{ flexBasis: "100%", marginTop: 6, display: "flex", flexDirection: "column", gap: 8, background: t.bg, border: `1px solid ${t.borderStrong}`, borderRadius: 10, padding: "12px" }}>
										<input
											value={newCatName}
											onChange={(e) => { setNewCatName(e.target.value); setSelectedEmoji(null); }}
											onKeyDown={(e) => e.key === "Enter" && addCat()}
											placeholder="Category name"
											autoFocus
											style={{ padding: "8px 12px", background: t.bgCard, border: `1.5px solid ${t.accent}`, borderRadius: 8, fontSize: 13, color: t.textHeading, outline: "none" }}
										/>
										<div>
											<div style={{ fontSize: 11, color: t.textSubtle, marginBottom: 6 }}>
												{selectedEmoji ? `Selected: ${selectedEmoji}` : newCatName && autoEmoji(newCatName) ? `Suggested: ${autoEmoji(newCatName)}` : "Pick an emoji"}
											</div>
											<div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
												{EMOJI_OPTIONS.map((e) => {
													const isAuto = !selectedEmoji && autoEmoji(newCatName) === e;
													const isPicked = selectedEmoji === e;
													return (
														<button key={e} onClick={() => setSelectedEmoji(isPicked ? null : e)} style={{ width: 30, height: 30, borderRadius: 6, border: isPicked ? `2px solid ${t.accent}` : isAuto ? "2px solid #60a5fa" : `1px solid ${t.borderStrong}`, background: isPicked ? t.bgAccentFaint : isAuto ? "#0c1f3f" : "transparent", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
															{e}
														</button>
													);
												})}
											</div>
										</div>
										<div style={{ display: "flex", gap: 8 }}>
											<button onClick={addCat} disabled={!newCatName.trim()} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: newCatName.trim() ? t.accent : t.borderStrong, color: newCatName.trim() ? "#fff" : t.textSubtle, fontSize: 13, fontWeight: 700, cursor: newCatName.trim() ? "pointer" : "default" }}>Add Category</button>
											<button onClick={() => { setShowAddCat(false); setNewCatName(""); setSelectedEmoji(null); }} style={{ padding: "8px 12px", borderRadius: 8, border: "none", background: t.borderStrong, color: t.textMuted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
										</div>
									</div>
								) : (
									<button onClick={() => setShowAddCat(true)} style={{ padding: "5px 12px", borderRadius: 8, border: `1.5px dashed ${t.borderStrong}`, background: "transparent", color: t.textSubtle, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
										+ New
									</button>
								)}
							</div>
						</div>

						<input value={evLocation} onChange={(e) => setEvLocation(e.target.value)} placeholder="Location (optional)" style={{ padding: "10px 14px", background: t.bg, border: `1.5px solid ${t.borderStrong}`, borderRadius: 10, fontSize: 14, color: t.textHeading, outline: "none", width: "100%" }} />

						<div style={{ display: "flex", gap: 10 }}>
							<button onClick={submitForm} disabled={!canSubmit} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: canSubmit ? t.accent : t.borderStrong, color: canSubmit ? "#fff" : t.textSubtle, fontSize: 15, fontWeight: 700, cursor: canSubmit ? "pointer" : "default" }}>
								{editingEventId ? "Save Changes" : "Add Event"}
							</button>
							<button onClick={() => { setShowForm(false); setEditingEventId(null); }} style={{ padding: "12px 20px", borderRadius: 10, border: "none", background: t.borderStrong, color: t.textMuted, fontSize: 15, cursor: "pointer" }}>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function Row({ icon, label, textColor }: { icon: string; label: string; textColor: string }) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
			<span style={{ fontSize: 18, width: 24 }}>{icon}</span>
			<span style={{ fontSize: 16, color: textColor }}>{label}</span>
		</div>
	);
}

