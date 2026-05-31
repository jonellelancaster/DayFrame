import { useState, useEffect } from "react";
import type { Task, Member, RedeemableReward } from "../../types";
import { useTheme } from "../../theme";

interface Props {
	tasks: Task[];
	members: Member[];
	today: Date;
	weeklyPoints: Record<string, number>;
	redeemableRewards: RedeemableReward[];
	onToggleTask: (taskId: string) => void;
}

const todayDayIndex = (d: Date) => (d.getDay() + 6) % 7;

export function RightPanel({ tasks, members, today, weeklyPoints, redeemableRewards, onToggleTask }: Props) {
	const { palette: t } = useTheme();
	const [now, setNow] = useState(new Date());
	const [panel, setPanel] = useState<"chores" | "rewards">("chores");

	useEffect(() => {
		const t = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(t);
	}, []);

	// Auto-rotate every 8 seconds when there are rewards to show
	useEffect(() => {
		if (redeemableRewards.length === 0) return;
		const t = setInterval(() => setPanel((p) => p === "chores" ? "rewards" : "chores"), 8000);
		return () => clearInterval(t);
	}, [redeemableRewards.length]);

	const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
	const dayIdx = todayDayIndex(today);
	const todayTasks = tasks.filter((t) => t.active && (t.days.includes(dayIdx) || t.oneTime));

	const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
	const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

	const leaderboard = members
		.map((m) => ({ member: m, points: weeklyPoints[m.id] ?? 0 }))
		.sort((a, b) => b.points - a.points);

	const canToggle = redeemableRewards.length > 0;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 28, height: "100%" }}>
			{/* Clock */}
			<div>
				<div style={{ fontSize: 56, fontWeight: 800, color: t.textHeading, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
					{timeStr}
				</div>
				<div style={{ fontSize: 16, color: t.textSubtle, marginTop: 4 }}>{dateStr}</div>
			</div>

			{/* Weather widget (mock) */}
			<div style={{ background: t.bgCard, borderRadius: 12, padding: "14px 16px" }}>
				<div style={{ fontSize: 12, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
					Weather
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
					<span style={{ fontSize: 36 }}>⛅</span>
					<div>
						<div style={{ fontSize: 28, fontWeight: 700, color: t.textHeading }}>72°F</div>
						<div style={{ fontSize: 13, color: t.textMuted }}>Partly cloudy</div>
					</div>
				</div>
			</div>

			{/* Toggling panel: chores ↔ rewards */}
			<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
				{/* Section header with toggle dots */}
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
					<div style={{ fontSize: 13, fontWeight: 600, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1 }}>
						{panel === "chores" ? "Chores Due Today" : "Rewards Store"}
					</div>
					{canToggle && (
						<button
							onClick={() => setPanel((p) => p === "chores" ? "rewards" : "chores")}
							style={{ background: "none", border: "none", cursor: "pointer", display: "flex", gap: 5, padding: 4 }}
							title="Switch view"
						>
							<span style={{ width: 6, height: 6, borderRadius: "50%", background: panel === "chores" ? t.accent : t.borderStrong, display: "block", transition: "background 0.3s" }} />
							<span style={{ width: 6, height: 6, borderRadius: "50%", background: panel === "rewards" ? t.accent : t.borderStrong, display: "block", transition: "background 0.3s" }} />
						</button>
					)}
				</div>

				{panel === "chores" ? (
					todayTasks.length === 0 ? (
						<div style={{ color: t.textFaint, fontSize: 15 }}>No chores today!</div>
					) : (
						<div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
							{todayTasks.map((task) => {
								const member = memberMap[task.memberId];
								return (
									<div
										key={task.id}
										style={{
											display: "flex",
											alignItems: "center",
											gap: 10,
											background: t.bgCard,
											borderRadius: 8,
											padding: "8px 12px",
											opacity: task.completed ? 0.5 : 1,
											borderLeft: `4px solid ${member?.color ?? t.textSubtle}`,
										}}
									>
										<button
											onClick={() => onToggleTask(task.id)}
											style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: task.completed ? "#22c55e" : t.textSubtle, padding: 0, lineHeight: 1, display: "flex", alignItems: "center" }}
										>
											{task.completed ? "✓" : "○"}
										</button>
										<div style={{ flex: 1 }}>
											<div style={{ fontSize: 14, color: task.completed ? t.textSubtle : t.text, textDecoration: task.completed ? "line-through" : "none" }}>
												{task.name}
											</div>
											<div style={{ fontSize: 12, color: member?.color ?? t.textSubtle }}>{member?.name}</div>
										</div>
										{task.rewardEligible && <span style={{ fontSize: 14 }}>⭐</span>}
									</div>
								);
							})}
						</div>
					)
				) : (
					redeemableRewards.length === 0 ? (
						<div style={{ color: t.textFaint, fontSize: 15 }}>No rewards set up yet.</div>
					) : (
						<div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
							{redeemableRewards.map((rr) => (
								<div key={rr.id} style={{ display: "flex", alignItems: "center", gap: 10, background: t.bgCard, borderRadius: 8, padding: "10px 14px" }}>
									<span style={{ fontSize: 20 }}>🎁</span>
									<span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: t.text }}>{rr.name}</span>
									<span style={{ fontSize: 14, fontWeight: 800, color: "#f59e0b" }}>⭐ {rr.pointCost} pts</span>
								</div>
							))}
						</div>
					)
				)}
			</div>

			{/* Points leaderboard */}
			<div>
				<div style={{ fontSize: 13, fontWeight: 600, color: t.textSubtle, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
					This Week
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
					{leaderboard.map((entry, i) => (
						<div key={entry.member.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<span style={{ fontSize: 13, color: t.textFaint, width: 16 }}>#{i + 1}</span>
							<div style={{ width: 22, height: 22, borderRadius: "50%", background: entry.member.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>
								{entry.member.initials}
							</div>
							<span style={{ flex: 1, fontSize: 13, color: t.textMuted }}>{entry.member.name}</span>
							<span style={{ fontSize: 13, fontWeight: 700, color: entry.points > 0 ? t.textHeading : t.textFaint }}>
								{entry.points} pts
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
