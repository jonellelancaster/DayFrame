export type MemberRole = "admin" | "member";
export type EventCategory = "School" | "Music" | "Medical" | "Sports" | "Work" | "Social" | "Chores" | "Travel";
export type TaskCategory = "Chores" | "School" | "Pet" | "Errands" | "Other";

export interface Member {
	id: string;
	name: string;
	color: string;
	initials: string;
	role: MemberRole;
	isChild?: boolean;
}

export interface RecurrenceRule {
	frequency: "daily" | "weekly" | "monthly";
	days?: number[]; // 0=Mon … 6=Sun, used when frequency is "weekly"
}

export interface CalendarEvent {
	id: string;
	title: string;
	date: string; // YYYY-MM-DD — start date (or first occurrence for recurring)
	endDate?: string; // YYYY-MM-DD — multi-day span (non-recurring only)
	startTime?: string; // HH:MM — omit for all-day
	endTime?: string;
	memberIds: string[];
	category: string;
	recurrence?: RecurrenceRule;
	location?: string;
	notes?: string;
	source?: "google" | "local";
	calendarColor?: string;
}

export interface Task {
	id: string;
	name: string;
	memberId: string;
	days: number[]; // 0=Mon ... 6=Sun
	rewardEligible: boolean;
	category: TaskCategory;
	createdBy: string;
	active: boolean;
	completed: boolean;
	points: number;
	oneTime?: boolean; // not tied to a schedule; disappears once completed
}

export interface Reward {
	memberId: string;
	description: string;
}

export interface RedeemableReward {
	id: string;
	name: string;
	pointCost: number;
}

export interface GoogleCalendarInfo {
	id: string;
	name: string;
	color: string;
	enabled: boolean;
	descriptionFilter?: string; // only import events whose description contains this (case-insensitive)
}

export interface GoogleAccount {
	email: string;
	accessToken: string;
	tokenExpiry: number;
	calendars: GoogleCalendarInfo[];
}

export interface Household {
	id: string;
	name: string;
	members: Member[];
	events: CalendarEvent[];
	tasks: Task[];
	rewards: Reward[];
	redeemableRewards: RedeemableReward[];
	weeklyPoints: Record<string, number>;
	customCategories: string[];
	categoryEmojis: Record<string, string>;
	googleAccounts?: GoogleAccount[];
	googleEventTags?: Record<string, string[]>;
}
