import { useState, useCallback } from "react";
import type { GoogleAccount } from "../../types";
import { requestGoogleToken, fetchUserEmail, fetchCalendarList, getClientId, saveClientId } from "../../utils/googleCalendar";

interface Props {
	accounts: GoogleAccount[];
	onConnect: (account: GoogleAccount) => void;
	onDisconnect: (email: string) => void;
	onToggleCalendar: (email: string, calendarId: string) => void;
	onRefreshToken: (email: string, accessToken: string, tokenExpiry: number) => void;
	onSetFilter: (email: string, calendarId: string, filter: string) => void;
}

export function GoogleCalendarSection({ accounts, onConnect, onDisconnect, onToggleCalendar, onRefreshToken, onSetFilter }: Props) {
	const [connecting, setConnecting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [expandedFilter, setExpandedFilter] = useState<string | null>(null);
	const [showClientIdSetup, setShowClientIdSetup] = useState(false);
	const [clientIdInput, setClientIdInput] = useState("");
	const [savedClientId, setSavedClientId] = useState(() => getClientId());

	const handleSaveClientId = () => {
		saveClientId(clientIdInput.trim());
		setSavedClientId(clientIdInput.trim());
		setShowClientIdSetup(false);
		setError(null);
	};

	const handleConnect = useCallback(() => {
		setError(null);
		setConnecting(true);
		requestGoogleToken(
			async (token, expiry) => {
				try {
					const [email, calendars] = await Promise.all([fetchUserEmail(token), fetchCalendarList(token)]);
					onConnect({ email, accessToken: token, tokenExpiry: expiry, calendars });
				} catch (e) {
					setError(e instanceof Error ? e.message : "Failed to load calendars");
				} finally {
					setConnecting(false);
				}
			},
			(msg) => { setError(msg); setConnecting(false); },
		);
	}, [onConnect]);

	const handleRefresh = useCallback((email: string) => {
		setError(null);
		requestGoogleToken(
			async (token, expiry) => {
				try {
					const freshCalendars = await fetchCalendarList(token);
					const existing = accounts.find(a => a.email === email);
					const mergedCalendars = freshCalendars.map(fc => {
						const prev = existing?.calendars.find(c => c.id === fc.id);
						return prev ? { ...fc, enabled: prev.enabled } : fc;
					});
					onRefreshToken(email, token, expiry);
					onConnect({ email, accessToken: token, tokenExpiry: expiry, calendars: mergedCalendars });
				} catch (e) {
					setError(e instanceof Error ? e.message : "Reconnect failed");
				}
			},
			(msg) => setError(msg),
		);
	}, [accounts, onConnect, onRefreshToken]);

	const isExpired = (account: GoogleAccount) => account.tokenExpiry < Date.now();

	// Step 1: No client ID configured — show setup flow
	if (!savedClientId) {
		return (
			<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
				{!showClientIdSetup ? (
					<>
						<div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "16px 16px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
								<GoogleLogo size={22} />
								<div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Connect Google Calendar</div>
							</div>
							<div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 14 }}>
								Sync your Google Calendars to DayFrame. You can connect multiple Gmail accounts.
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
								{[
									{ n: "1", text: "Create a project in Google Cloud Console" },
									{ n: "2", text: "Enable the Google Calendar API" },
									{ n: "3", text: "Create OAuth 2.0 credentials (Web app)" },
									{ n: "4", text: "Add http://localhost:5173 to authorized origins" },
									{ n: "5", text: "Paste your Client ID here" },
								].map(step => (
									<div key={step.n} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
										<div style={{ width: 20, height: 20, borderRadius: "50%", background: "#1D9E75", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
											{step.n}
										</div>
										<div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5 }}>{step.text}</div>
									</div>
								))}
							</div>
							<button
								onClick={() => { setShowClientIdSetup(true); setClientIdInput(""); }}
								style={{ width: "100%", padding: "11px", background: "#1D9E75", border: "none", borderRadius: 9, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
							>
								Enter Client ID
							</button>
						</div>
						<a
							href="https://console.cloud.google.com/"
							target="_blank"
							rel="noopener noreferrer"
							style={{ textAlign: "center", fontSize: 12, color: "#1d4ed8", textDecoration: "none" }}
						>
							Open Google Cloud Console ↗
						</a>
					</>
				) : (
					<div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "16px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
							<GoogleLogo size={18} />
							<div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Paste Your Client ID</div>
						</div>
						<div style={{ fontSize: 12, color: "#64748b", marginBottom: 10, lineHeight: 1.5 }}>
							Found in Google Cloud Console → APIs &amp; Services → Credentials. Ends with <code style={{ background: "#f1f5f9", padding: "1px 4px", borderRadius: 3, fontSize: 11 }}>.apps.googleusercontent.com</code>
						</div>
						<input
							value={clientIdInput}
							onChange={(e) => setClientIdInput(e.target.value)}
							placeholder="123456789-abc.apps.googleusercontent.com"
							autoFocus
							style={{
								width: "100%",
								padding: "10px 12px",
								border: "1.5px solid #cbd5e1",
								borderRadius: 8,
								fontSize: 12,
								color: "#0f172a",
								outline: "none",
								boxSizing: "border-box",
								fontFamily: "monospace",
								marginBottom: 12,
							}}
						/>
						<div style={{ display: "flex", gap: 8 }}>
							<button
								onClick={handleSaveClientId}
								disabled={!clientIdInput.trim().endsWith(".apps.googleusercontent.com")}
								style={{
									flex: 1, padding: "10px", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: clientIdInput.trim().endsWith(".apps.googleusercontent.com") ? "pointer" : "default",
									background: clientIdInput.trim().endsWith(".apps.googleusercontent.com") ? "#1D9E75" : "#e2e8f0",
									color: clientIdInput.trim().endsWith(".apps.googleusercontent.com") ? "#fff" : "#94a3b8",
								}}
							>
								Save &amp; Continue
							</button>
							<button
								onClick={() => setShowClientIdSetup(false)}
								style={{ padding: "10px 14px", border: "none", borderRadius: 8, background: "#f1f5f9", color: "#64748b", fontSize: 13, cursor: "pointer" }}
							>
								Back
							</button>
						</div>
					</div>
				)}
			</div>
		);
	}

	// Step 2: Client ID configured — show connected accounts + sign-in button
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			{/* Connected accounts */}
			{accounts.map((account) => (
				<div key={account.email} style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
					<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid #f1f5f9" }}>
						<div style={{ width: 34, height: 34, borderRadius: "50%", background: "#fff", border: "1.5px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
							<GoogleLogo size={18} />
						</div>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
								{account.email}
							</div>
							{isExpired(account) ? (
								<div style={{ fontSize: 11, color: "#ef4444", marginTop: 1 }}>Session expired — reconnect to continue syncing</div>
							) : (
								<div style={{ fontSize: 11, color: "#22c55e", marginTop: 1 }}>
									Connected · {account.calendars.filter(c => c.enabled).length} of {account.calendars.length} calendars syncing
								</div>
							)}
						</div>
						{isExpired(account) && (
							<button
								onClick={() => handleRefresh(account.email)}
								style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
							>
								Reconnect
							</button>
						)}
						<button
							onClick={() => onDisconnect(account.email)}
							style={{ background: "none", border: "1px solid #fecaca", color: "#ef4444", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
						>
							Remove
						</button>
					</div>

					<div style={{ padding: "10px 14px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
						<div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
							Calendars
						</div>
						{account.calendars.map((cal) => {
							const filterKey = `${account.email}::${cal.id}`;
							const filterOpen = expandedFilter === filterKey;
							const hasFilter = !!cal.descriptionFilter;
							return (
								<div key={cal.id}>
									<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
										<div style={{ width: 10, height: 10, borderRadius: "50%", background: cal.color, flexShrink: 0 }} />
										<span style={{ flex: 1, fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
											{cal.name}
											{hasFilter && !filterOpen && (
												<span style={{ marginLeft: 6, fontSize: 10, color: "#1d4ed8", background: "#eff6ff", padding: "1px 5px", borderRadius: 4 }}>
													filtered
												</span>
											)}
										</span>
										<button
											onClick={() => setExpandedFilter(filterOpen ? null : filterKey)}
											title="Filter by description"
											style={{
												background: hasFilter ? "#eff6ff" : "none",
												border: hasFilter ? "1px solid #bfdbfe" : "1px solid transparent",
												borderRadius: 5, color: hasFilter ? "#1d4ed8" : "#94a3b8",
												fontSize: 12, cursor: "pointer", padding: "2px 5px",
												flexShrink: 0, lineHeight: 1,
											}}
										>
											🔍
										</button>
										<div
											onClick={() => onToggleCalendar(account.email, cal.id)}
											style={{
												width: 38, height: 22, borderRadius: 11,
												background: cal.enabled ? "#1D9E75" : "#e2e8f0",
												cursor: "pointer", flexShrink: 0,
												position: "relative", transition: "background 0.15s",
											}}
										>
											<div style={{
												width: 16, height: 16, borderRadius: "50%", background: "#fff",
												position: "absolute", top: 3,
												left: cal.enabled ? 19 : 3,
												transition: "left 0.15s",
												boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
											}} />
										</div>
									</div>
									{filterOpen && (
										<div style={{ marginLeft: 20, marginBottom: 8, display: "flex", flexDirection: "column", gap: 5 }}>
											<div style={{ fontSize: 11, color: "#64748b" }}>
												Only import events whose description contains:
											</div>
											<div style={{ display: "flex", gap: 6 }}>
												<input
													autoFocus
													value={cal.descriptionFilter ?? ""}
													onChange={(e) => onSetFilter(account.email, cal.id, e.target.value)}
													placeholder="e.g. personal appointment"
													style={{ flex: 1, padding: "6px 9px", border: "1.5px solid #cbd5e1", borderRadius: 7, fontSize: 12, outline: "none", color: "#0f172a" }}
												/>
												{hasFilter && (
													<button
														onClick={() => { onSetFilter(account.email, cal.id, ""); setExpandedFilter(null); }}
														style={{ padding: "6px 10px", background: "#f1f5f9", border: "none", borderRadius: 7, fontSize: 12, color: "#64748b", cursor: "pointer" }}
													>
														Clear
													</button>
												)}
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			))}

			{/* Error */}
			{error && (
				<div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#dc2626", lineHeight: 1.5 }}>
					{error}
				</div>
			)}

			{/* Sign-in button */}
			<button
				onClick={handleConnect}
				disabled={connecting}
				style={{
					display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
					padding: "13px 16px", borderRadius: 10,
					border: "1.5px solid #e2e8f0",
					background: connecting ? "#f8fafc" : "#fff",
					color: connecting ? "#94a3b8" : "#374151",
					fontSize: 14, fontWeight: 600,
					cursor: connecting ? "default" : "pointer",
					boxShadow: connecting ? "none" : "0 1px 4px rgba(0,0,0,0.08)",
				}}
			>
				{connecting ? <span style={{ fontSize: 14 }}>⏳</span> : <GoogleLogo size={18} />}
				{connecting ? "Signing in…" : accounts.length === 0 ? "Sign in with Google" : "Add Another Account"}
			</button>

			{/* Client ID management */}
			<button
				onClick={() => { setShowClientIdSetup(!showClientIdSetup); setClientIdInput(savedClientId); }}
				style={{ background: "none", border: "none", fontSize: 11, color: "#94a3b8", cursor: "pointer", textAlign: "center", padding: "2px 0" }}
			>
				{showClientIdSetup ? "▲ Hide" : "⚙ Change Client ID"}
			</button>

			{showClientIdSetup && (
				<div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
					<div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 }}>Google OAuth Client ID</div>
					<input
						value={clientIdInput}
						onChange={(e) => setClientIdInput(e.target.value)}
						placeholder="123456789-abc.apps.googleusercontent.com"
						style={{ padding: "9px 12px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 12, color: "#0f172a", outline: "none", fontFamily: "monospace" }}
					/>
					<div style={{ display: "flex", gap: 8 }}>
						<button
							onClick={() => { saveClientId(clientIdInput.trim()); setSavedClientId(clientIdInput.trim()); setShowClientIdSetup(false); }}
							disabled={!clientIdInput.trim()}
							style={{ flex: 1, padding: "9px", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: clientIdInput.trim() ? "pointer" : "default", background: clientIdInput.trim() ? "#1D9E75" : "#e2e8f0", color: clientIdInput.trim() ? "#fff" : "#94a3b8" }}
						>
							Save
						</button>
						<button
							onClick={() => { saveClientId(""); setSavedClientId(""); setShowClientIdSetup(false); }}
							style={{ padding: "9px 12px", border: "none", borderRadius: 8, background: "#fef2f2", color: "#ef4444", fontSize: 13, cursor: "pointer" }}
						>
							Remove
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

function GoogleLogo({ size }: { size: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
			<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
			<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
			<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
			<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
		</svg>
	);
}
