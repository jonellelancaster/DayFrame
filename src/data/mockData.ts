import type { Household } from "../types";

export const household: Household = {
	id: "hh-1",
	name: "The Lancaster Family",
	members: [
		{ id: "m1", name: "Jonelle", color: "#1D9E75", initials: "JL", role: "admin" },
		{ id: "m2", name: "Grace",   color: "#D4537E", initials: "GR", role: "member" },
		{ id: "m3", name: "Neal",    color: "#378ADD", initials: "NL", role: "member" },
		{ id: "m4", name: "Angie",   color: "#EF9F27", initials: "AG", role: "member" },
		{ id: "m5", name: "Deb",     color: "#7C3AED", initials: "DB", role: "member" },
	],
	events: [],
	tasks: [],
	rewards: [],
	redeemableRewards: [],
	weeklyPoints: { m1: 0, m2: 0, m3: 0, m4: 0, m5: 0 },
	customCategories: [],
	categoryEmojis: {},
};

export const CATEGORY_ICONS: Record<string, string> = {
	School: "🎒",
	Music: "🎵",
	Medical: "🏥",
	Sports: "⚽",
	Work: "💼",
	Social: "🎉",
	Chores: "🧹",
	Travel: "✈️",
};

export const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
