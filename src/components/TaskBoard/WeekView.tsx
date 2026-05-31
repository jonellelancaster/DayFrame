import { useState } from "react";
import type { Task, Member } from "../../types";
import { DAY_NAMES } from "../../data/mockData";

interface Props {
	tasks: Task[];
	members: Member[];
	today: Date;
	onToggleComplete: (taskId: string) => void;
	onOpenAdd: (defaults: { days?: number[]; memberId?: string }) => void;
}

export function WeekView({ tasks, members, today, onToggleComplete, onOpenAdd }: Props) {
	const [focusMember, setFocusMember] = useState<string | null>(null);
	const todayDayIdx = (today.getDay() + 6) % 7;

	const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

	const tasksByDay = (dayIdx: number) =>
		tasks.filter((t) => t.active && t.days.includes(dayIdx));

	return (
		<div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
			{/* Member filter chips */}
			<div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid #f1f5f9", overflowX: "auto" }}>
				{members.map((m) => (
					<button
						key={m.id}
						onClick={() => setFocusMember(focusMember === m.id ? null : m.id)}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							padding: "5px 12px",
							borderRadius: 20,
							border: `2px solid ${focusMember === m.id ? m.color : "#e2e8f0"}`,
							background: focusMember === m.id ? m.color + "20" : "#fff",
							cursor: "pointer",
							whiteSpace: "nowrap",
							fontSize: 13,
							fontWeight: 600,
							color: focusMember === m.id ? m.color : "#64748b",
						}}
					>
						<div style={{ width: 16, height: 16, borderRadius: "50%", background: m.color }} />
						{m.name}
					</button>
				))}
			</div>

			{/* 7-day grid */}
			<div style={{ flex: 1, overflowX: "auto", padding: "0 8px" }}>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(120px, 1fr))", gap: 8, padding: "12px 8px", minWidth: 840, height: "100%" }}>
					{DAY_NAMES.map((day, dayIdx) => {
						const isToday = dayIdx === todayDayIdx;
						const dayTasks = tasksByDay(dayIdx);
						return (
							<div key={day} style={{ display: "flex", flexDirection: "column", gap: 0 }}>
								{/* Day header */}
								<div
									style={{
										textAlign: "center",
										padding: "8px 0",
										fontSize: 13,
										fontWeight: 700,
										color: isToday ? "#1D9E75" : "#94a3b8",
										background: isToday ? "#e8f8f2" : "#f8fafc",
										borderRadius: "8px 8px 0 0",
										marginBottom: 6,
										border: isToday ? "2px solid #1D9E75" : "2px solid transparent",
									}}
								>
									{day}
								</div>

								{/* Tasks */}
								<div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
									{dayTasks.map((task) => {
										const member = memberMap[task.memberId];
										const isDimmed = focusMember !== null && focusMember !== task.memberId;
										return (
											<div
												key={task.id}
												style={{
													display: "flex",
													alignItems: "center",
													gap: 0,
													background: "#fff",
													border: "1px solid #f1f5f9",
													borderRadius: 8,
													overflow: "hidden",
													opacity: isDimmed ? 0.2 : 1,
													transition: "opacity 0.2s",
												}}
											>
												<div style={{ width: 4, background: member?.color ?? "#94a3b8", alignSelf: "stretch" }} />
												<div style={{ padding: "7px 8px", flex: 1, minWidth: 0 }}>
													<div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 4 }}>
														<div>
															<div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", lineHeight: 1.3, wordBreak: "break-word" }}>
																{task.name}
															</div>
															<div style={{ fontSize: 11, color: member?.color ?? "#94a3b8", marginTop: 2 }}>
																{member?.name}
															</div>
														</div>
														{task.rewardEligible && (
															<span style={{ fontSize: 12, flexShrink: 0 }}>⭐</span>
														)}
													</div>
												</div>
												<button
													onClick={() => onToggleComplete(task.id)}
													style={{
														width: 28,
														height: "100%",
														minHeight: 44,
														background: task.completed ? "#dcfce7" : "#fff",
														border: "none",
														borderLeft: "1px solid #f1f5f9",
														cursor: "pointer",
														color: task.completed ? "#22c55e" : "#cbd5e1",
														fontSize: 14,
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
													}}
												>
													{task.completed ? "✓" : "○"}
												</button>
											</div>
										);
									})}

									{/* Add slot */}
									<div
										onClick={() => onOpenAdd({ days: [dayIdx] })}
									style={{
										border: "1px dashed #e2e8f0",
										borderRadius: 8,
										padding: "6px 10px",
										fontSize: 12,
										color: "#94a3b8",
										cursor: "pointer",
										textAlign: "center",
									}}
								>
									+ Add
								</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
