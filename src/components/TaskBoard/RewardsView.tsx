import { useState } from "react";
import type { Task, Member, RedeemableReward } from "../../types";

interface Props {
	tasks: Task[];
	members: Member[];
	redeemableRewards: RedeemableReward[];
	weeklyPoints: Record<string, number>;
	onRedeemReward: (rewardId: string, memberId: string) => void;
}

export function RewardsView({ tasks, members, redeemableRewards, weeklyPoints, onRedeemReward }: Props) {
	const [justRedeemed, setJustRedeemed] = useState<Record<string, boolean>>({});

	const handleRedeem = (rewardId: string, memberId: string) => {
		onRedeemReward(rewardId, memberId);
		const key = `${rewardId}-${memberId}`;
		setJustRedeemed((prev) => ({ ...prev, [key]: true }));
		setTimeout(() => setJustRedeemed((prev) => { const n = { ...prev }; delete n[key]; return n; }), 1800);
	};

	const sortedMembers = [...members].sort((a, b) => (weeklyPoints[b.id] ?? 0) - (weeklyPoints[a.id] ?? 0));

	return (
		<div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>

			{/* Points balances */}
			<section>
				<div style={label}>Points Balance</div>
				<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
					{sortedMembers.map((m, i) => {
						const pts = weeklyPoints[m.id] ?? 0;
						const starredTotal = tasks.filter((t) => t.active && t.memberId === m.id && t.rewardEligible).reduce((s, t) => s + t.points, 0);
						return (
							<div key={m.id} style={{ background: "#fff", border: `1.5px solid ${m.color}30`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
								<span style={{ fontSize: 16, width: 22 }}>
									{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
								</span>
								<div style={{ width: 32, height: 32, borderRadius: "50%", background: m.color, color: "#fff", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
									{m.initials}
								</div>
								<div style={{ flex: 1 }}>
									<div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{m.name}</div>
									<div style={{ fontSize: 11, color: "#94a3b8" }}>Up to {starredTotal} pts this week</div>
								</div>
								<div style={{ textAlign: "right" }}>
									<div style={{ fontSize: 20, fontWeight: 800, color: m.color, lineHeight: 1 }}>{pts}</div>
									<div style={{ fontSize: 11, color: "#94a3b8" }}>pts</div>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			{/* Available rewards */}
			<section>
				<div style={label}>Available Rewards</div>
				{redeemableRewards.length === 0 ? (
					<div style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", padding: "24px 0" }}>
						No rewards set up yet — add them in Settings
					</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
						{redeemableRewards.map((rr) => (
							<div
								key={rr.id}
								style={{ background: "#fff", border: "1.5px solid #f1f5f9", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}
							>
								<span style={{ fontSize: 18, flexShrink: 0 }}>🎁</span>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{rr.name}</div>
									<div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginTop: 1 }}>⭐ {rr.pointCost} pts</div>
								</div>
								<div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
									{members.map((m) => {
										const pts = weeklyPoints[m.id] ?? 0;
										const canAfford = pts >= rr.pointCost;
										const key = `${rr.id}-${m.id}`;
										const redeemed = !!justRedeemed[key];
										return (
											<button
												key={m.id}
												onClick={() => canAfford && !redeemed && handleRedeem(rr.id, m.id)}
												disabled={!canAfford || redeemed}
												title={canAfford ? `Redeem for ${m.name} (${pts} pts)` : `${m.name} needs ${rr.pointCost - pts} more pts`}
												style={{
													width: 30,
													height: 30,
													borderRadius: "50%",
													border: redeemed ? "2px solid #16a34a" : canAfford ? `2px solid ${m.color}` : "2px solid #e2e8f0",
													background: redeemed ? "#dcfce7" : canAfford ? m.color + "18" : "#f8fafc",
													color: redeemed ? "#16a34a" : canAfford ? m.color : "#cbd5e1",
													fontSize: redeemed ? 12 : 9,
													fontWeight: 700,
													cursor: canAfford && !redeemed ? "pointer" : "default",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													transition: "all 0.2s",
													padding: 0,
												}}
											>
												{redeemed ? "✓" : m.initials}
											</button>
										);
									})}
								</div>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

const label: React.CSSProperties = {
	fontSize: 11,
	fontWeight: 700,
	color: "#94a3b8",
	textTransform: "uppercase",
	letterSpacing: 0.5,
	marginBottom: 10,
};
