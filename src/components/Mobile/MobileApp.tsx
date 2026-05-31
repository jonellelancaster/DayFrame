import { useState } from "react";
import type { Household, Task, CalendarEvent, GoogleAccount } from "../../types";
import { CalendarView } from "./CalendarView";
import { TaskBoard } from "../TaskBoard/TaskBoard";
import { GoogleCalendarSection } from "./GoogleCalendarSection";

type Tab = "calendar" | "tasks" | "settings";

interface Props {
	household: Household;
	today: Date;
	onToggleTask: (taskId: string) => void;
	onRenameMember: (memberId: string, name: string) => void;
	onAddMember: (name: string, color: string) => void;
	onAddTask: (task: Omit<Task, "id" | "completed">) => void;
	onAddEvent: (event: Omit<CalendarEvent, "id">) => void;
	onDeleteEvent: (eventId: string) => void;
	onUpdateEvent: (event: CalendarEvent) => void;
	onAddCategory: (name: string, emoji: string) => void;
	onAddRedeemableReward: (name: string, pointCost: number) => void;
	onDeleteRedeemableReward: (id: string) => void;
	onRedeemReward: (rewardId: string, memberId: string) => void;
	onConnectGoogle: (account: GoogleAccount) => void;
	onDisconnectGoogle: (email: string) => void;
	onToggleGoogleCalendar: (email: string, calendarId: string) => void;
	onRefreshGoogleToken: (email: string, accessToken: string, tokenExpiry: number) => void;
	onSetGoogleCalendarFilter: (email: string, calendarId: string, filter: string) => void;
	onTagGoogleEvent: (eventId: string, memberIds: string[]) => void;
}

export function MobileApp({ household, today, onToggleTask, onRenameMember, onAddMember, onAddTask, onAddEvent, onDeleteEvent, onUpdateEvent, onAddCategory, onAddRedeemableReward, onDeleteRedeemableReward, onRedeemReward, onConnectGoogle, onDisconnectGoogle, onToggleGoogleCalendar, onRefreshGoogleToken, onSetGoogleCalendarFilter, onTagGoogleEvent }: Props) {
	const [tab, setTab] = useState<Tab>("calendar");

	const navItems: { id: Tab; icon: string; label: string }[] = [
		{ id: "calendar", icon: "📅", label: "Calendar" },
		{ id: "tasks", icon: "✅", label: "Tasks" },
		{ id: "settings", icon: "⚙️", label: "Settings" },
	];

	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				background: "#fff",
				fontFamily: "'Inter', system-ui, sans-serif",
				position: "relative",
				overflow: "hidden",
			}}
		>
			{/* Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "16px 20px 12px",
					background: "#fff",
					borderBottom: "1px solid #f1f5f9",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<div style={{ width: 28, height: 28, background: "#1D9E75", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
						<span style={{ fontSize: 14 }}>🏠</span>
					</div>
					<div>
						<div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>DayFrame</div>
						<div style={{ fontSize: 11, color: "#94a3b8" }}>{household.name}</div>
					</div>
				</div>
				<div style={{ display: "flex", gap: -6 }}>
					{household.members.map((m) => (
						<div
							key={m.id}
							style={{
								width: 28,
								height: 28,
								borderRadius: "50%",
								background: m.color,
								border: "2px solid #fff",
								marginLeft: -6,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontSize: 10,
								fontWeight: 700,
								color: "#fff",
							}}
						>
							{m.initials}
						</div>
					))}
				</div>
			</div>

			{/* Content */}
			<div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
				{tab === "calendar" && (
					<CalendarView events={household.events} members={household.members} today={today} customCategories={household.customCategories ?? []} categoryEmojis={household.categoryEmojis ?? {}} onAddEvent={onAddEvent} onDeleteEvent={onDeleteEvent} onUpdateEvent={onUpdateEvent} onAddCategory={onAddCategory} onTagGoogleEvent={onTagGoogleEvent} />
				)}
				{tab === "tasks" && (
					<TaskBoard
						tasks={household.tasks}
						members={household.members}
						redeemableRewards={household.redeemableRewards}
						weeklyPoints={household.weeklyPoints}
						today={today}
						onToggleComplete={onToggleTask}
						onAddTask={onAddTask}
						onRedeemReward={onRedeemReward}
					/>
				)}
				{tab === "settings" && (
					<SettingsView
						household={household}
						onRenameMember={onRenameMember}
						onAddMember={onAddMember}
						onAddRedeemableReward={onAddRedeemableReward}
						onDeleteRedeemableReward={onDeleteRedeemableReward}
						onConnectGoogle={onConnectGoogle}
						onDisconnectGoogle={onDisconnectGoogle}
						onToggleGoogleCalendar={onToggleGoogleCalendar}
						onRefreshGoogleToken={onRefreshGoogleToken}
						onSetGoogleCalendarFilter={onSetGoogleCalendarFilter}
					/>
				)}
			</div>

			{/* Bottom nav */}
			<div
				style={{
					display: "flex",
					borderTop: "1px solid #f1f5f9",
					background: "#fff",
				}}
			>
				{navItems.map((item) => (
					<button
						key={item.id}
						onClick={() => setTab(item.id)}
						style={{
							flex: 1,
							padding: "10px 0",
							border: "none",
							background: "none",
							cursor: "pointer",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: 2,
						}}
					>
						<span style={{ fontSize: 20 }}>{item.icon}</span>
						<span
							style={{
								fontSize: 11,
								fontWeight: 600,
								color: tab === item.id ? "#1D9E75" : "#94a3b8",
							}}
						>
							{item.label}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

const PALETTE = ["#1D9E75", "#D4537E", "#378ADD", "#EF9F27", "#7C3AED", "#EA580C", "#16A34A", "#DC2626"];

function SettingsView({ household, onRenameMember, onAddMember, onAddRedeemableReward, onDeleteRedeemableReward, onConnectGoogle, onDisconnectGoogle, onToggleGoogleCalendar, onRefreshGoogleToken, onSetGoogleCalendarFilter }: {
	household: Household;
	onRenameMember: (memberId: string, name: string) => void;
	onAddMember: (name: string, color: string) => void;
	onAddRedeemableReward: (name: string, pointCost: number) => void;
	onDeleteRedeemableReward: (id: string) => void;
	onConnectGoogle: (account: GoogleAccount) => void;
	onDisconnectGoogle: (email: string) => void;
	onToggleGoogleCalendar: (email: string, calendarId: string) => void;
	onRefreshGoogleToken: (email: string, accessToken: string, tokenExpiry: number) => void;
	onSetGoogleCalendarFilter: (email: string, calendarId: string, filter: string) => void;
}) {
	const [editingName, setEditingName] = useState<string | null>(null);
	const [nameText, setNameText] = useState("");
	const [addingMember, setAddingMember] = useState(false);
	const [newName, setNewName] = useState("");
	const [newColor, setNewColor] = useState("");
	const [showRewardForm, setShowRewardForm] = useState(false);
	const [newRewardName, setNewRewardName] = useState("");
	const [newRewardCost, setNewRewardCost] = useState(50);

	const submitReward = () => {
		if (!newRewardName.trim() || newRewardCost < 1) return;
		onAddRedeemableReward(newRewardName.trim(), newRewardCost);
		setNewRewardName("");
		setNewRewardCost(50);
		setShowRewardForm(false);
	};

	const startNameEdit = (memberId: string, currentName: string) => {
		setEditingName(memberId);
		setNameText(currentName);
	};

	const saveNameEdit = (memberId: string) => {
		if (nameText.trim()) onRenameMember(memberId, nameText.trim());
		setEditingName(null);
	};

	const openAddForm = () => {
		const usedColors = new Set(household.members.map((m) => m.color));
		const next = PALETTE.find((c) => !usedColors.has(c)) ?? PALETTE[0];
		setNewColor(next);
		setNewName("");
		setAddingMember(true);
	};

	const submitNewMember = () => {
		if (!newName.trim()) return;
		onAddMember(newName.trim(), newColor);
		setAddingMember(false);
	};

	return (
		<div style={{ flex: 1, minHeight: 0, padding: "20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 28 }}>
			<div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Settings</div>

			{/* Household Members */}
			<section>
				<div style={sectionLabel}>Household Members</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
					{household.members.map((m) => (
						<div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8fafc", padding: "12px", borderRadius: 10 }}>
							<div style={{ width: 44, height: 44, borderRadius: "50%", background: m.color, color: "#fff", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
								{m.initials}
							</div>
							<div style={{ flex: 1, minWidth: 0 }}>
								{editingName === m.id ? (
									<input
										value={nameText}
										onChange={(e) => setNameText(e.target.value)}
										onBlur={() => saveNameEdit(m.id)}
										onKeyDown={(e) => {
											if (e.key === "Enter") saveNameEdit(m.id);
											if (e.key === "Escape") setEditingName(null);
										}}
										autoFocus
										style={{ width: "100%", fontSize: 15, fontWeight: 600, color: "#0f172a", border: "none", borderBottom: `2px solid ${m.color}`, background: "transparent", outline: "none", padding: "2px 0" }}
									/>
								) : (
									<div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>{m.name}</div>
								)}
								<div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{m.role}{m.isChild ? " · child account" : ""}</div>
							</div>
							{editingName === m.id ? (
								<button
									onClick={() => saveNameEdit(m.id)}
									style={{ background: m.color, color: "#fff", border: "none", borderRadius: 7, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
								>
									Save
								</button>
							) : (
								<button
									onClick={() => startNameEdit(m.id, m.name)}
									style={{ background: "#e2e8f0", color: "#64748b", border: "none", borderRadius: 7, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
								>
									Edit
								</button>
							)}
						</div>
					))}
				</div>

				{addingMember ? (
					<div style={{ marginTop: 10, background: "#f8fafc", borderRadius: 10, padding: "14px 12px", border: "1px solid #e2e8f0" }}>
						<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
							<div style={{ width: 44, height: 44, borderRadius: "50%", background: newColor, color: "#fff", fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
								{newName.trim().split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
							</div>
							<input
								value={newName}
								onChange={(e) => setNewName(e.target.value)}
								onKeyDown={(e) => { if (e.key === "Enter") submitNewMember(); if (e.key === "Escape") setAddingMember(false); }}
								placeholder="Member name"
								autoFocus
								style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#0f172a", border: "none", borderBottom: "2px solid #e2e8f0", background: "transparent", outline: "none", padding: "2px 0" }}
							/>
						</div>
						<div style={{ marginBottom: 12 }}>
							<div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Color</div>
							<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
								{PALETTE.map((c) => {
									const taken = household.members.some((m) => m.color === c);
									return (
										<button
											key={c}
											onClick={() => !taken && setNewColor(c)}
											disabled={taken}
											style={{
												width: 30,
												height: 30,
												borderRadius: "50%",
												background: c,
												border: newColor === c ? "3px solid #0f172a" : "3px solid transparent",
												cursor: taken ? "not-allowed" : "pointer",
												opacity: taken ? 0.3 : 1,
												padding: 0,
												outline: "none",
											}}
										/>
									);
								})}
							</div>
						</div>
						<div style={{ display: "flex", gap: 8 }}>
							<button
								onClick={submitNewMember}
								disabled={!newName.trim()}
								style={{ flex: 1, background: newName.trim() ? newColor : "#e2e8f0", color: newName.trim() ? "#fff" : "#94a3b8", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 14, fontWeight: 700, cursor: newName.trim() ? "pointer" : "default" }}
							>
								Add Member
							</button>
							<button
								onClick={() => setAddingMember(false)}
								style={{ background: "#e2e8f0", color: "#64748b", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 14, cursor: "pointer" }}
							>
								Cancel
							</button>
						</div>
					</div>
				) : household.members.length < 8 && (
					<button
						onClick={openAddForm}
						style={{ marginTop: 10, width: "100%", padding: "10px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 10, color: "#64748b", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
					>
						+ Add Member
					</button>
				)}
			</section>

			{/* Reward Store */}
			<section>
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
					<div style={sectionLabel}>Reward Store</div>
					{!showRewardForm && (
						<button
							onClick={() => { setNewRewardName(""); setNewRewardCost(50); setShowRewardForm(true); }}
							style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: 7, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
						>
							+ Add
						</button>
					)}
				</div>

				{showRewardForm && (
					<div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "14px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
						<input
							value={newRewardName}
							onChange={(e) => setNewRewardName(e.target.value)}
							onKeyDown={(e) => { if (e.key === "Enter") submitReward(); if (e.key === "Escape") setShowRewardForm(false); }}
							placeholder="Reward name (e.g. Movie Night)"
							autoFocus
							style={{ padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", color: "#0f172a" }}
						/>
						<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
							<span style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap" }}>Point cost ⭐</span>
							<input
								type="number"
								min={1}
								max={9999}
								value={newRewardCost}
								onChange={(e) => setNewRewardCost(Math.max(1, Number(e.target.value)))}
								style={{ width: 80, padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, textAlign: "center", outline: "none" }}
							/>
							<button
								onClick={submitReward}
								disabled={!newRewardName.trim()}
								style={{ flex: 1, padding: "9px", background: newRewardName.trim() ? "#1D9E75" : "#e2e8f0", color: newRewardName.trim() ? "#fff" : "#94a3b8", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: newRewardName.trim() ? "pointer" : "default" }}
							>
								Add
							</button>
							<button onClick={() => setShowRewardForm(false)} style={{ padding: "9px 12px", background: "#e2e8f0", color: "#64748b", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
								✕
							</button>
						</div>
					</div>
				)}

				{household.redeemableRewards.length === 0 && !showRewardForm ? (
					<div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
						No rewards yet — add one above
					</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
						{household.redeemableRewards.map((rr) => (
							<div
								key={rr.id}
								style={{ background: "#f8fafc", border: "1.5px solid #f1f5f9", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}
							>
								<span style={{ fontSize: 18, flexShrink: 0 }}>🎁</span>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{rr.name}</div>
									<div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginTop: 1 }}>⭐ {rr.pointCost} pts</div>
								</div>
								<button
									onClick={() => onDeleteRedeemableReward(rr.id)}
									style={{ background: "none", border: "none", color: "#cbd5e1", fontSize: 18, cursor: "pointer", padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
								>
									✕
								</button>
							</div>
						))}
					</div>
				)}
			</section>

			{/* Google Calendar */}
			<section>
				<div style={sectionLabel}>Google Calendar</div>
				<GoogleCalendarSection
					accounts={household.googleAccounts ?? []}
					onConnect={onConnectGoogle}
					onDisconnect={onDisconnectGoogle}
					onToggleCalendar={onToggleGoogleCalendar}
					onRefreshToken={onRefreshGoogleToken}
					onSetFilter={onSetGoogleCalendarFilter}
				/>
			</section>
		</div>
	);
}

const sectionLabel: React.CSSProperties = {
	fontSize: 12,
	fontWeight: 700,
	color: "#94a3b8",
	textTransform: "uppercase",
	letterSpacing: 0.5,
	marginBottom: 12,
};
