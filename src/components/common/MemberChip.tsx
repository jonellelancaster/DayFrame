import type { Member } from "../../types";

interface Props {
	member: Member;
	size?: "sm" | "md" | "lg";
	showName?: boolean;
	dimmed?: boolean;
	onClick?: () => void;
}

export function MemberChip({ member, size = "md", showName = false, dimmed = false, onClick }: Props) {
	const sizes = { sm: 28, md: 36, lg: 48 };
	const fontSizes = { sm: 10, md: 13, lg: 18 };
	const px = sizes[size];
	const fs = fontSizes[size];

	return (
		<div
			onClick={onClick}
			style={{
				display: "inline-flex",
				alignItems: "center",
				gap: 8,
				cursor: onClick ? "pointer" : "default",
				opacity: dimmed ? 0.3 : 1,
				transition: "opacity 0.2s",
			}}
		>
			<div
				style={{
					width: px,
					height: px,
					borderRadius: "50%",
					background: member.color,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#fff",
					fontWeight: 700,
					fontSize: fs,
					flexShrink: 0,
				}}
			>
				{member.initials}
			</div>
			{showName && (
				<span style={{ fontSize: fs + 1, fontWeight: 500, color: "inherit" }}>{member.name}</span>
			)}
		</div>
	);
}
