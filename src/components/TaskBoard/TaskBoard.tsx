import { useState } from "react";
import type { Task, Member, RedeemableReward, TaskCategory } from "../../types";
import { DAY_NAMES } from "../../data/mockData";
import { WeekView } from "./WeekView";
import { ByMemberView } from "./ByMemberView";
import { RewardsView } from "./RewardsView";

type View = "week" | "by-member" | "rewards";
type Sheet = "scheduled" | "quick" | null;

interface AddDefaults {
	memberId?: string;
	days?: number[];
}

interface Props {
	tasks: Task[];
	members: Member[];
	redeemableRewards: RedeemableReward[];
	weeklyPoints: Record<string, number>;
	today: Date;
	onToggleComplete: (taskId: string) => void;
	onAddTask: (task: Omit<Task, "id" | "completed">) => void;
	onRedeemReward: (rewardId: string, memberId: string) => void;
}

const CATEGORIES: TaskCategory[] = ["Chores", "School", "Pet", "Errands", "Other"];

export function TaskBoard({ tasks, members, redeemableRewards, weeklyPoints, today, onToggleComplete, onAddTask, onRedeemReward }: Props) {
	const [view, setView] = useState<View>("week");
	const [sheet, setSheet] = useState<Sheet>(null);

	// Scheduled task form
	const [taskName, setTaskName] = useState("");
	const [taskMember, setTaskMember] = useState("");
	const [taskDays, setTaskDays] = useState<number[]>([]);
	const [taskCategory, setTaskCategory] = useState<TaskCategory>("Chores");
	const [taskReward, setTaskReward] = useState(false);
	const [taskPoints, setTaskPoints] = useState(10);

	// Quick task form
	const [quickName, setQuickName] = useState("");
	const [quickMember, setQuickMember] = useState("");
	const [quickPoints, setQuickPoints] = useState(10);

	const openScheduled = (defaults: AddDefaults = {}) => {
		setTaskName("");
		setTaskMember(defaults.memberId ?? members[0]?.id ?? "");
		setTaskDays(defaults.days ?? []);
		setTaskCategory("Chores");
		setTaskReward(false);
		setTaskPoints(10);
		setSheet("scheduled");
	};

	const openQuick = () => {
		setQuickName("");
		setQuickMember(members[0]?.id ?? "");
		setQuickPoints(10);
		setSheet("quick");
	};

	const closeSheet = () => setSheet(null);

	const submitScheduled = () => {
		if (!taskName.trim() || !taskMember || taskDays.length === 0) return;
		onAddTask({
			name: taskName.trim(),
			memberId: taskMember,
			days: taskDays,
			rewardEligible: taskReward,
			category: taskCategory,
			createdBy: taskMember,
			active: true,
			points: taskReward ? taskPoints : 0,
		});
		closeSheet();
	};

	const submitQuick = () => {
		if (!quickName.trim() || !quickMember) return;
		onAddTask({
			name: quickName.trim(),
			memberId: quickMember,
			days: [],
			rewardEligible: true,
			category: "Other",
			createdBy: quickMember,
			active: true,
			points: quickPoints,
			oneTime: true,
		});
		closeSheet();
	};

	const toggleDay = (d: number) =>
		setTaskDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b));

	const scheduledMember = members.find((m) => m.id === taskMember);
	const quickMemberObj = members.find((m) => m.id === quickMember);
	const canSubmitScheduled = taskName.trim().length > 0 && taskMember && taskDays.length > 0;
	const canSubmitQuick = quickName.trim().length > 0 && quickMember;

	const pendingQuickTasks = tasks.filter((t) => t.oneTime && !t.completed && t.active);

	const tabs: { id: View; label: string }[] = [
		{ id: "week", label: "Week" },
		{ id: "by-member", label: "By Member" },
		{ id: "rewards", label: "Rewards" },
	];

	return (
		<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "#f8fafc", position: "relative" }}>
			{/* Tab bar + quick task button */}
			<div style={{ display: "flex", borderBottom: "2px solid #f1f5f9", background: "#fff", alignItems: "center" }}>
				<div style={{ display: "flex", flex: 1 }}>
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setView(tab.id)}
							style={{
								flex: 1, padding: "12px 0", border: "none", background: "none",
								fontSize: 14, fontWeight: 600,
								color: view === tab.id ? "#1D9E75" : "#94a3b8",
								borderBottom: view === tab.id ? "2px solid #1D9E75" : "2px solid transparent",
								marginBottom: -2, cursor: "pointer",
							}}
						>
							{tab.label}
						</button>
					))}
				</div>
				<button
					onClick={openQuick}
					title="Add a quick one-time task"
					style={{
						margin: "0 10px",
						padding: "6px 12px",
						background: "#fef9c3",
						border: "1.5px solid #fbbf24",
						borderRadius: 8,
						fontSize: 13,
						fontWeight: 700,
						color: "#92400e",
						cursor: "pointer",
						whiteSpace: "nowrap",
					}}
				>
					⚡ Quick
				</button>
			</div>

			{/* Pending quick tasks banner */}
			{pendingQuickTasks.length > 0 && (
				<div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", padding: "8px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
					<div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.5 }}>
						⚡ Quick Tasks ({pendingQuickTasks.length})
					</div>
					{pendingQuickTasks.map((task) => {
						const m = members.find((x) => x.id === task.memberId);
						return (
							<div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
								<div style={{ width: 4, alignSelf: "stretch", background: m?.color ?? "#fbbf24", borderRadius: 2, flexShrink: 0 }} />
								<div style={{ flex: 1 }}>
									<span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{task.name}</span>
									<span style={{ fontSize: 12, color: m?.color ?? "#64748b", marginLeft: 6 }}>{m?.name}</span>
								</div>
								<span style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b" }}>+{task.points} pts</span>
								<button
									onClick={() => onToggleComplete(task.id)}
									style={{
										padding: "4px 12px", borderRadius: 7, border: "none",
										background: "#1D9E75", color: "#fff",
										fontSize: 12, fontWeight: 700, cursor: "pointer",
									}}
								>
									Done ✓
								</button>
							</div>
						);
					})}
				</div>
			)}

			{/* Content */}
			<div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
				{view === "week" && (
					<WeekView tasks={tasks} members={members} today={today} onToggleComplete={onToggleComplete} onOpenAdd={openScheduled} />
				)}
				{view === "by-member" && (
					<ByMemberView tasks={tasks} members={members} onToggleComplete={onToggleComplete} onOpenAdd={openScheduled} />
				)}
				{view === "rewards" && (
					<RewardsView
						tasks={tasks}
						members={members}
						redeemableRewards={redeemableRewards}
						weeklyPoints={weeklyPoints}
						onRedeemReward={onRedeemReward}
					/>
				)}
			</div>

			{/* Sheets */}
			{sheet !== null && (
				<>
					<div onClick={closeSheet} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 10 }} />

					{/* Quick task sheet */}
					{sheet === "quick" && (
						<div style={sheetStyle}>
							<div style={handle} />
							<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
								<span style={{ fontSize: 20 }}>⚡</span>
								<div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Quick Task</div>
								<span style={{ fontSize: 12, color: "#94a3b8" }}>— earns points on completion</span>
							</div>

							<input
								value={quickName}
								onChange={(e) => setQuickName(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && submitQuick()}
								placeholder="What was done? (e.g. Cleaned the car)"
								autoFocus
								style={inputStyle}
							/>

							<div>
								<div style={labelStyle}>Who did it?</div>
								<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
									{members.map((m) => (
										<button
											key={m.id}
											onClick={() => setQuickMember(m.id)}
											style={{
												display: "flex", alignItems: "center", gap: 6,
												padding: "6px 12px", borderRadius: 20,
												border: `2px solid ${quickMember === m.id ? m.color : "#e2e8f0"}`,
												background: quickMember === m.id ? m.color + "18" : "#fff",
												color: quickMember === m.id ? m.color : "#64748b",
												fontSize: 13, fontWeight: 600, cursor: "pointer",
											}}
										>
											<div style={{ width: 14, height: 14, borderRadius: "50%", background: m.color }} />
											{m.name}
										</button>
									))}
								</div>
							</div>

							<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
								<div style={labelStyle}>Points to award ⭐</div>
								<input
									type="number"
									min={1}
									max={999}
									value={quickPoints}
									onChange={(e) => setQuickPoints(Math.max(1, Number(e.target.value)))}
									style={{ width: 70, padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 14, textAlign: "center", outline: "none" }}
								/>
							</div>

							<div style={{ display: "flex", gap: 10 }}>
								<button
									onClick={submitQuick}
									disabled={!canSubmitQuick}
									style={{
										flex: 1, padding: "12px 0", borderRadius: 10, border: "none",
										background: canSubmitQuick ? (quickMemberObj?.color ?? "#1D9E75") : "#e2e8f0",
										color: canSubmitQuick ? "#fff" : "#94a3b8",
										fontSize: 15, fontWeight: 700,
										cursor: canSubmitQuick ? "pointer" : "default",
									}}
								>
									Add Task
								</button>
								<button onClick={closeSheet} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "#f1f5f9", color: "#64748b", fontSize: 15, cursor: "pointer" }}>
									Cancel
								</button>
							</div>
						</div>
					)}

					{/* Scheduled task sheet */}
					{sheet === "scheduled" && (
						<div style={{ ...sheetStyle, maxHeight: "90%", overflowY: "auto" }}>
							<div style={handle} />
							<div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>New Scheduled Task</div>

							<input
								value={taskName}
								onChange={(e) => setTaskName(e.target.value)}
								placeholder="Task name"
								autoFocus
								style={inputStyle}
							/>

							<div>
								<div style={labelStyle}>Assign to</div>
								<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
									{members.map((m) => (
										<button
											key={m.id}
											onClick={() => setTaskMember(m.id)}
											style={{
												display: "flex", alignItems: "center", gap: 6,
												padding: "6px 12px", borderRadius: 20,
												border: `2px solid ${taskMember === m.id ? m.color : "#e2e8f0"}`,
												background: taskMember === m.id ? m.color + "18" : "#fff",
												color: taskMember === m.id ? m.color : "#64748b",
												fontSize: 13, fontWeight: 600, cursor: "pointer",
											}}
										>
											<div style={{ width: 14, height: 14, borderRadius: "50%", background: m.color }} />
											{m.name}
										</button>
									))}
								</div>
							</div>

							<div>
								<div style={labelStyle}>Days</div>
								<div style={{ display: "flex", gap: 6 }}>
									{DAY_NAMES.map((d, i) => (
										<button
											key={i}
											onClick={() => toggleDay(i)}
											style={{
												flex: 1, padding: "7px 0", borderRadius: 8,
												border: `2px solid ${taskDays.includes(i) ? (scheduledMember?.color ?? "#1D9E75") : "#e2e8f0"}`,
												background: taskDays.includes(i) ? ((scheduledMember?.color ?? "#1D9E75") + "18") : "#fff",
												color: taskDays.includes(i) ? (scheduledMember?.color ?? "#1D9E75") : "#94a3b8",
												fontSize: 11, fontWeight: 700, cursor: "pointer",
											}}
										>
											{d}
										</button>
									))}
								</div>
							</div>

							<div>
								<div style={labelStyle}>Category</div>
								<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
									{CATEGORIES.map((c) => (
										<button
											key={c}
											onClick={() => setTaskCategory(c)}
											style={{
												padding: "5px 12px", borderRadius: 8,
												border: `1.5px solid ${taskCategory === c ? "#0f172a" : "#e2e8f0"}`,
												background: taskCategory === c ? "#0f172a" : "#fff",
												color: taskCategory === c ? "#fff" : "#64748b",
												fontSize: 12, fontWeight: 600, cursor: "pointer",
											}}
										>
											{c}
										</button>
									))}
								</div>
							</div>

							<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
								<button
									onClick={() => setTaskReward((r) => !r)}
									style={{
										display: "flex", alignItems: "center", gap: 8,
										background: taskReward ? "#fefce8" : "#f8fafc",
										border: `1.5px solid ${taskReward ? "#fbbf24" : "#e2e8f0"}`,
										borderRadius: 9, padding: "8px 14px", cursor: "pointer",
										fontSize: 13, fontWeight: 600,
										color: taskReward ? "#92400e" : "#64748b",
									}}
								>
									⭐ Reward eligible
								</button>
								{taskReward && (
									<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
										<span style={{ fontSize: 12, color: "#64748b" }}>Points:</span>
										<input
											type="number" min={1} max={100} value={taskPoints}
											onChange={(e) => setTaskPoints(Math.max(1, Math.min(100, Number(e.target.value))))}
											style={{ width: 54, padding: "6px 8px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontSize: 13, textAlign: "center", outline: "none" }}
										/>
									</div>
								)}
							</div>

							<div style={{ display: "flex", gap: 10 }}>
								<button
									onClick={submitScheduled}
									disabled={!canSubmitScheduled}
									style={{
										flex: 1, padding: "12px 0", borderRadius: 10, border: "none",
										background: canSubmitScheduled ? (scheduledMember?.color ?? "#1D9E75") : "#e2e8f0",
										color: canSubmitScheduled ? "#fff" : "#94a3b8",
										fontSize: 15, fontWeight: 700,
										cursor: canSubmitScheduled ? "pointer" : "default",
									}}
								>
									Add Task
								</button>
								<button onClick={closeSheet} style={{ padding: "12px 18px", borderRadius: 10, border: "none", background: "#f1f5f9", color: "#64748b", fontSize: 15, cursor: "pointer" }}>
									Cancel
								</button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}

const sheetStyle: React.CSSProperties = {
	position: "absolute", bottom: 0, left: 0, right: 0,
	background: "#fff", borderRadius: "16px 16px 0 0",
	padding: "20px 20px 28px", zIndex: 11,
	display: "flex", flexDirection: "column", gap: 16,
};

const handle: React.CSSProperties = {
	width: 36, height: 4, background: "#e2e8f0",
	borderRadius: 2, margin: "0 auto -8px",
};

const inputStyle: React.CSSProperties = {
	padding: "10px 12px", border: "1.5px solid #e2e8f0",
	borderRadius: 9, fontSize: 15, outline: "none", color: "#0f172a",
};

const labelStyle: React.CSSProperties = {
	fontSize: 11, fontWeight: 700, color: "#94a3b8",
	textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
};
