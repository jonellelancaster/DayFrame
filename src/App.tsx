import { useState, useCallback, useEffect, useMemo } from "react";
import { household as initialHousehold } from "./data/mockData";
import type { Household, CalendarEvent, GoogleAccount } from "./types";
import { DisplayMode } from "./components/Display/DisplayMode";
import { MobileApp } from "./components/Mobile/MobileApp";
import { fetchCalendarEvents } from "./utils/googleCalendar";
import { ThemeProvider, useTheme } from "./theme";

const STORAGE_KEY = "dayframe_household";

function loadHousehold(): Household {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) return JSON.parse(saved) as Household;
	} catch {
		// corrupted storage — fall back to defaults
	}
	return initialHousehold;
}

type AppView = "display" | "mobile";

export default function App() {
	return (
		<ThemeProvider>
			<AppInner />
		</ThemeProvider>
	);
}

function AppInner() {
	const { mode, toggle } = useTheme();
	const [view, setView] = useState<AppView>("mobile");
	const [household, setHousehold] = useState<Household>(loadHousehold);
	const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(household));
	}, [household]);

	// Fetch events from all enabled, non-expired Google Calendars
	useEffect(() => {
		const accounts = household.googleAccounts ?? [];
		const valid = accounts.filter((a) => a.tokenExpiry > Date.now());
		if (!valid.length) { setGoogleEvents([]); return; }

		let cancelled = false;
		const now = new Date();
		const timeMin = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split("T")[0];
		const timeMax = new Date(now.getFullYear() + 2, now.getMonth(), 1).toISOString().split("T")[0];

		(async () => {
			const all: CalendarEvent[] = [];
			for (const account of valid) {
				for (const cal of account.calendars) {
					if (!cal.enabled) continue;
					try {
						const evs = await fetchCalendarEvents(account.accessToken, cal.id, timeMin, timeMax, cal.descriptionFilter);
						all.push(...evs.map((e) => ({ ...e, calendarColor: cal.color })));
					} catch { /* skip this calendar on error */ }
				}
			}
			if (!cancelled) setGoogleEvents(all);
		})();

		return () => { cancelled = true; };
	}, [household.googleAccounts]);

	const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth < 768);
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, []);

	const today = new Date();

	const handleToggleTask = useCallback((taskId: string) => {
		setHousehold((prev) => {
			const task = prev.tasks.find((t) => t.id === taskId);
			if (!task) return prev;

			const nowComplete = !task.completed;
			const delta = nowComplete ? task.points : -task.points;

			const tasks = prev.tasks.map((t) =>
				t.id === taskId ? { ...t, completed: nowComplete } : t
			);

			const weeklyPoints = {
				...prev.weeklyPoints,
				[task.memberId]: Math.max(0, (prev.weeklyPoints[task.memberId] ?? 0) + delta),
			};

			return { ...prev, tasks, weeklyPoints };
		});
	}, []);

	const handleConnectGoogle = useCallback((account: GoogleAccount) => {
		setHousehold((prev) => {
			const existing = (prev.googleAccounts ?? []).filter((a) => a.email !== account.email);
			return { ...prev, googleAccounts: [...existing, account] };
		});
	}, []);

	const handleDisconnectGoogle = useCallback((email: string) => {
		setHousehold((prev) => ({
			...prev,
			googleAccounts: (prev.googleAccounts ?? []).filter((a) => a.email !== email),
		}));
		setGoogleEvents((prev) => prev.filter((e) => !e.id.startsWith("g_")));
	}, []);

	const handleToggleGoogleCalendar = useCallback((email: string, calendarId: string) => {
		setHousehold((prev) => ({
			...prev,
			googleAccounts: (prev.googleAccounts ?? []).map((a) =>
				a.email !== email ? a : {
					...a,
					calendars: a.calendars.map((c) => c.id === calendarId ? { ...c, enabled: !c.enabled } : c),
				}
			),
		}));
	}, []);

	const handleSetGoogleCalendarFilter = useCallback((email: string, calendarId: string, filter: string) => {
		setHousehold((prev) => ({
			...prev,
			googleAccounts: (prev.googleAccounts ?? []).map((a) =>
				a.email !== email ? a : {
					...a,
					calendars: a.calendars.map((c) =>
						c.id !== calendarId ? c : { ...c, descriptionFilter: filter || undefined }
					),
				}
			),
		}));
	}, []);

	const handleRefreshGoogleToken = useCallback((email: string, accessToken: string, tokenExpiry: number) => {
		setHousehold((prev) => ({
			...prev,
			googleAccounts: (prev.googleAccounts ?? []).map((a) =>
				a.email !== email ? a : { ...a, accessToken, tokenExpiry }
			),
		}));
	}, []);

	const handleRenameMember = useCallback((memberId: string, name: string) => {
		setHousehold((prev) => ({
			...prev,
			members: prev.members.map((m) => m.id === memberId ? { ...m, name } : m),
		}));
	}, []);

	const handleAddRedeemableReward = useCallback((name: string, pointCost: number) => {
		setHousehold((prev) => ({
			...prev,
			redeemableRewards: [...prev.redeemableRewards, { id: `rr${Date.now()}`, name, pointCost }],
		}));
	}, []);

	const handleDeleteRedeemableReward = useCallback((id: string) => {
		setHousehold((prev) => ({
			...prev,
			redeemableRewards: prev.redeemableRewards.filter((r) => r.id !== id),
		}));
	}, []);

	const handleRedeemReward = useCallback((rewardId: string, memberId: string) => {
		setHousehold((prev) => {
			const reward = prev.redeemableRewards.find((r) => r.id === rewardId);
			if (!reward) return prev;
			const current = prev.weeklyPoints[memberId] ?? 0;
			if (current < reward.pointCost) return prev;
			return {
				...prev,
				weeklyPoints: { ...prev.weeklyPoints, [memberId]: current - reward.pointCost },
			};
		});
	}, []);

	const handleAddEvent = useCallback((event: Omit<import("./types").CalendarEvent, "id">) => {
		setHousehold((prev) => ({
			...prev,
			events: [...prev.events, { ...event, id: `e${Date.now()}` }],
		}));
	}, []);

	const handleDeleteEvent = useCallback((eventId: string) => {
		setHousehold((prev) => ({
			...prev,
			events: prev.events.filter((e) => e.id !== eventId),
		}));
	}, []);

	const handleAddCategory = useCallback((name: string, emoji: string) => {
		setHousehold((prev) => ({
			...prev,
			customCategories: [...(prev.customCategories ?? []), name],
			categoryEmojis: { ...(prev.categoryEmojis ?? {}), [name]: emoji },
		}));
	}, []);

	const handleUpdateEvent = useCallback((event: import("./types").CalendarEvent) => {
		setHousehold((prev) => ({
			...prev,
			events: prev.events.map((e) => e.id === event.id ? event : e),
		}));
	}, []);

	const handleAddTask = useCallback((task: Omit<import("./types").Task, "id" | "completed">) => {
		setHousehold((prev) => ({
			...prev,
			tasks: [...prev.tasks, { ...task, id: `t${Date.now()}`, completed: false }],
		}));
	}, []);

	const handleAddMember = useCallback((name: string, color: string) => {
		setHousehold((prev) => {
			const initials = name.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
			const newMember = {
				id: `m${Date.now()}`,
				name,
				color,
				initials,
				role: "member" as const,
			};
			return {
				...prev,
				members: [...prev.members, newMember],
				weeklyPoints: { ...prev.weeklyPoints, [newMember.id]: 0 },
			};
		});
	}, []);

	const handleTagGoogleEvent = useCallback((eventId: string, memberIds: string[]) => {
		setHousehold((prev) => ({
			...prev,
			googleEventTags: { ...(prev.googleEventTags ?? {}), [eventId]: memberIds },
		}));
	}, []);

	// Merge Google Calendar events with local events for display, applying local tags and name matching
	const mergedHousehold = useMemo(() => {
		const tags = household.googleEventTags ?? {};
		const memberList = household.members;
		const taggedGoogleEvents = googleEvents.map((e) => {
			if (tags[e.id]) return { ...e, memberIds: tags[e.id] };
			const lower = e.title.toLowerCase();
			const matched = memberList.filter((m) => lower.includes(m.name.toLowerCase())).map((m) => m.id);
			return matched.length > 0 ? { ...e, memberIds: matched } : e;
		});
		return { ...household, events: [...household.events, ...taggedGoogleEvents] };
	}, [household, googleEvents]);

	const mobileApp = (
		<MobileApp
			household={mergedHousehold}
			today={today}
			onToggleTask={handleToggleTask}
			onRenameMember={handleRenameMember}
			onAddMember={handleAddMember}
			onAddTask={handleAddTask}
			onAddEvent={handleAddEvent}
			onDeleteEvent={handleDeleteEvent}
			onUpdateEvent={handleUpdateEvent}
			onAddCategory={handleAddCategory}
			onAddRedeemableReward={handleAddRedeemableReward}
			onDeleteRedeemableReward={handleDeleteRedeemableReward}
			onRedeemReward={handleRedeemReward}
			onConnectGoogle={handleConnectGoogle}
			onDisconnectGoogle={handleDisconnectGoogle}
			onToggleGoogleCalendar={handleToggleGoogleCalendar}
			onRefreshGoogleToken={handleRefreshGoogleToken}
			onSetGoogleCalendarFilter={handleSetGoogleCalendarFilter}
			onTagGoogleEvent={handleTagGoogleEvent}
		/>
	);

	// On real mobile devices: full-screen, no frame, no toolbar
	if (isMobile) {
		return (
			<div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
				{mobileApp}
			</div>
		);
	}

	// On desktop/tablet: show toolbar with Mobile + Display toggle
	return (
		<div style={{ width: "100vw", height: "100vh", overflow: "hidden", position: "relative" }}>
			<div
				style={{
					position: "fixed",
					top: 12,
					right: 12,
					zIndex: 1000,
					display: "flex",
					gap: 4,
					background: "rgba(15,23,42,0.9)",
					backdropFilter: "blur(8px)",
					borderRadius: 10,
					padding: 4,
				}}
			>
				<button
					onClick={() => setView("mobile")}
					style={{ ...toggleBtn, background: view === "mobile" ? "#1D9E75" : "transparent", color: view === "mobile" ? "#fff" : "#64748b" }}
				>
					📱 Mobile
				</button>
				<button
					onClick={() => setView("display")}
					style={{ ...toggleBtn, background: view === "display" ? "#1D9E75" : "transparent", color: view === "display" ? "#fff" : "#64748b" }}
				>
					🖥️ Display
				</button>
				<button
					onClick={toggle}
					title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
					style={{ ...toggleBtn, background: "transparent", color: "#64748b", fontSize: 14 }}
				>
					{mode === "dark" ? "☀️" : "🌙"}
				</button>
			</div>

			{view === "display" && <DisplayMode household={mergedHousehold} today={today} onToggleTask={handleToggleTask} onAddEvent={handleAddEvent} onDeleteEvent={handleDeleteEvent} onUpdateEvent={handleUpdateEvent} onAddCategory={handleAddCategory} />}

			{view === "mobile" && (
				<div style={{ width: "100%", height: "100%", background: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>
					<div
						style={{
							width: 390,
							height: "min(844px, calc(100vh - 32px))",
							background: "#fff",
							borderRadius: 44,
							boxShadow: "0 40px 80px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.15)",
							overflow: "hidden",
							border: "8px solid #1e293b",
						}}
					>
						{mobileApp}
					</div>
				</div>
			)}
		</div>
	);
}

const toggleBtn: React.CSSProperties = {
	padding: "6px 12px",
	border: "none",
	borderRadius: 7,
	cursor: "pointer",
	fontSize: 12,
	fontWeight: 600,
	transition: "all 0.15s",
};
