import type { Task, Member } from "../../types";
import { DAY_NAMES } from "../../data/mockData";

interface Props {
	tasks: Task[];
	members: Member[];
	onToggleComplete: (taskId: string) => void;
	onOpenAdd: (defaults: { days?: number[]; memberId?: string }) => void;
}

export function ByMemberView({ tasks, members, onToggleComplete, onOpenAdd }: Props) {
	return (
		<div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
			{members.map((member) => {
				const memberTasks = tasks.filter((t) => t.active && t.memberId === member.id);
				const completed = memberTasks.filter((t) => t.completed).length;
				return (
					<div
						key={member.id}
						style={{
							background: "#fff",
							borderRadius: 12,
							border: "1px solid #f1f5f9",
							overflow: "hidden",
						}}
					>
						{/* Member header */}
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 12,
								padding: "12px 16px",
								background: member.color + "12",
								borderBottom: `3px solid ${member.color}`,
							}}
						>
							<div
								style={{
									width: 36,
									height: 36,
									borderRadius: "50%",
									background: member.color,
									color: "#fff",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontWeight: 700,
									fontSize: 13,
								}}
							>
								{member.initials}
							</div>
							<div>
								<div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{member.name}</div>
								<div style={{ fontSize: 12, color: "#64748b" }}>
									{completed}/{memberTasks.length} tasks done this week
								</div>
							</div>
							{/* Progress bar */}
							<div style={{ flex: 1 }}>
								<div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
									<div
										style={{
											height: "100%",
											width: memberTasks.length > 0 ? `${(completed / memberTasks.length) * 100}%` : "0%",
											background: member.color,
											borderRadius: 3,
											transition: "width 0.3s",
										}}
									/>
								</div>
							</div>
						</div>

						{/* Tasks */}
						{memberTasks.length === 0 ? (
							<div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: 14 }}>No tasks yet</div>
						) : (
							<div style={{ display: "flex", flexDirection: "column" }}>
								{memberTasks.map((task, i) => (
									<div
										key={task.id}
										style={{
											display: "flex",
											alignItems: "center",
											gap: 12,
											padding: "10px 16px",
											borderTop: i > 0 ? "1px solid #f8fafc" : "none",
										}}
									>
										<button
											onClick={() => onToggleComplete(task.id)}
											style={{
												width: 22,
												height: 22,
												borderRadius: "50%",
												border: `2px solid ${task.completed ? member.color : "#cbd5e1"}`,
												background: task.completed ? member.color : "#fff",
												color: "#fff",
												cursor: "pointer",
												fontSize: 11,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												flexShrink: 0,
											}}
										>
											{task.completed ? "✓" : ""}
										</button>

										<div style={{ flex: 1 }}>
											<div style={{ fontSize: 14, color: task.completed ? "#94a3b8" : "#0f172a", textDecoration: task.completed ? "line-through" : "none" }}>
												{task.name}
												{task.rewardEligible && <span style={{ marginLeft: 6 }}>⭐</span>}
											</div>
											{/* Day pills */}
											<div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
												{task.days.map((d) => (
													<span
														key={d}
														style={{
															fontSize: 10,
															fontWeight: 600,
															padding: "2px 7px",
															borderRadius: 10,
															background: member.color + "20",
															color: member.color,
														}}
													>
														{DAY_NAMES[d]}
													</span>
												))}
											</div>
										</div>

										<span style={{ fontSize: 11, color: "#94a3b8", background: "#f8fafc", padding: "2px 8px", borderRadius: 6 }}>
											{task.category}
										</span>
									</div>
								))}
							</div>
						)}

					{/* Add task */}
					<button
						onClick={() => onOpenAdd({ memberId: member.id })}
						style={{ width: "100%", padding: "10px", background: "none", border: "none", borderTop: `1px dashed ${member.color}50`, color: member.color, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
					>
						+ Add task
					</button>
				</div>
			);
		})}
		</div>
	);
}
