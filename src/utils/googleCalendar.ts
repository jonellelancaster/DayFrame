import type { CalendarEvent, GoogleCalendarInfo } from "../types";

declare global {
	interface Window {
		google?: {
			accounts: {
				oauth2: {
					initTokenClient(config: {
						client_id: string;
						scope: string;
						callback: (response: GisTokenResponse) => void;
					}): { requestAccessToken(): void };
				};
			};
		};
	}
}

interface GisTokenResponse {
	access_token: string;
	expires_in: number;
	error?: string;
}

const SCOPE = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email";
const API = "https://www.googleapis.com/calendar/v3";

const CLIENT_ID_STORAGE_KEY = "dayframe_google_client_id";

export function getClientId(): string {
	const envId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";
	if (envId) return envId;
	return localStorage.getItem(CLIENT_ID_STORAGE_KEY) ?? "";
}

export function saveClientId(id: string): void {
	if (id.trim()) {
		localStorage.setItem(CLIENT_ID_STORAGE_KEY, id.trim());
	} else {
		localStorage.removeItem(CLIENT_ID_STORAGE_KEY);
	}
}

export function requestGoogleToken(
	onToken: (token: string, expiry: number) => void,
	onError: (msg: string) => void,
): void {
	const clientId = getClientId();
	if (!clientId) { onError("VITE_GOOGLE_CLIENT_ID is not configured in .env.local"); return; }
	if (!window.google?.accounts?.oauth2) { onError("Google Identity Services not loaded yet — try again in a moment"); return; }

	const client = window.google.accounts.oauth2.initTokenClient({
		client_id: clientId,
		scope: SCOPE,
		callback: (resp) => {
			if (resp.error || !resp.access_token) { onError(resp.error ?? "OAuth error"); return; }
			onToken(resp.access_token, Date.now() + resp.expires_in * 1000);
		},
	});
	client.requestAccessToken();
}

export async function fetchUserEmail(accessToken: string): Promise<string> {
	const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) return "unknown@gmail.com";
	const data = await res.json() as { email?: string };
	return data.email ?? "unknown@gmail.com";
}

export async function fetchCalendarList(accessToken: string): Promise<GoogleCalendarInfo[]> {
	const res = await fetch(`${API}/users/me/calendarList?maxResults=50`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) {
		let detail = "";
		try { const err = await res.json() as { error?: { message?: string } }; detail = err.error?.message ?? ""; } catch { /* ignore */ }
		const hint = res.status === 403 ? " — ensure the account is added as a test user in Google Cloud Console (OAuth consent screen → Test users)" : "";
		throw new Error(`Failed to load calendars (HTTP ${res.status}${detail ? `: ${detail}` : ""}${hint})`);
	}
	const data = await res.json() as { items?: Array<{ id: string; summary: string; backgroundColor?: string }> };
	return (data.items ?? []).map(item => ({
		id: item.id,
		name: item.summary,
		color: item.backgroundColor ?? "#4285f4",
		enabled: true,
	}));
}

export async function fetchCalendarEvents(
	accessToken: string,
	calendarId: string,
	timeMin: string,
	timeMax: string,
	descriptionFilter?: string,
): Promise<CalendarEvent[]> {
	const params = new URLSearchParams({
		timeMin: `${timeMin}T00:00:00Z`,
		timeMax: `${timeMax}T23:59:59Z`,
		maxResults: "500",
		singleEvents: "true",
		orderBy: "startTime",
	});
	const res = await fetch(
		`${API}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
		{ headers: { Authorization: `Bearer ${accessToken}` } },
	);
	if (!res.ok) return [];
	const data = await res.json() as { items?: unknown[] };
	let items = data.items ?? [];
	if (descriptionFilter) {
		const needle = descriptionFilter.toLowerCase();
		items = items.filter((raw) => ((raw as RawGoogleEvent).description ?? "").toLowerCase().includes(needle));
	}
	return items.map(convertGoogleEvent).filter((e): e is CalendarEvent => e !== null);
}

interface RawGoogleEvent {
	id?: string;
	summary?: string;
	status?: string;
	description?: string;
	start?: { date?: string; dateTime?: string };
	end?: { date?: string; dateTime?: string };
	location?: string;
}

function convertGoogleEvent(raw: unknown): CalendarEvent | null {
	const item = raw as RawGoogleEvent;
	if (!item.summary || !item.start || item.status === "cancelled") return null;

	const isAllDay = !!item.start.date;
	const startDate = item.start.date ?? item.start.dateTime?.substring(0, 10);
	if (!startDate) return null;

	let endDate: string | undefined;
	let startTime: string | undefined;
	let endTime: string | undefined;

	if (isAllDay) {
		const rawEnd = item.end?.date;
		if (rawEnd) {
			// Google's all-day end date is exclusive (the day after), subtract 1
			const d = new Date(rawEnd + "T12:00:00");
			d.setDate(d.getDate() - 1);
			const adj = d.toISOString().split("T")[0];
			if (adj !== startDate) endDate = adj;
		}
	} else {
		if (item.start.dateTime) startTime = item.start.dateTime.substring(11, 16);
		if (item.end?.dateTime) endTime = item.end.dateTime.substring(11, 16);
	}

	return {
		id: `g_${item.id ?? Math.random().toString(36).slice(2)}`,
		title: item.summary,
		date: startDate,
		endDate,
		startTime,
		endTime,
		memberIds: [],
		category: "Social",
		source: "google",
		location: item.location,
	};
}
