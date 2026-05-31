import { createContext, useContext, useState, type ReactNode } from "react";

export interface ThemePalette {
	bg: string;
	bgDim: string;
	bgCard: string;
	bgCardHover: string;
	bgSelected: string;
	bgAccentFaint: string;
	border: string;
	borderStrong: string;
	textHeading: string;
	text: string;
	textMuted: string;
	textSubtle: string;
	textFaint: string;
	accent: string;
}

const dark: ThemePalette = {
	bg: "#0f172a",
	bgDim: "#090f1e",
	bgCard: "#1e293b",
	bgCardHover: "#243147",
	bgSelected: "#162032",
	bgAccentFaint: "#0d2e23",
	border: "#1e293b",
	borderStrong: "#334155",
	textHeading: "#f1f5f9",
	text: "#e2e8f0",
	textMuted: "#94a3b8",
	textSubtle: "#64748b",
	textFaint: "#475569",
	accent: "#1D9E75",
};

const light: ThemePalette = {
	bg: "#f8fafc",
	bgDim: "#f1f5f9",
	bgCard: "#ffffff",
	bgCardHover: "#f1f5f9",
	bgSelected: "#e8f5f1",
	bgAccentFaint: "#dcfce7",
	border: "#e2e8f0",
	borderStrong: "#cbd5e1",
	textHeading: "#0f172a",
	text: "#1e293b",
	textMuted: "#475569",
	textSubtle: "#64748b",
	textFaint: "#94a3b8",
	accent: "#1D9E75",
};

interface ThemeCtx {
	palette: ThemePalette;
	mode: "dark" | "light";
	toggle: () => void;
}

const ThemeContext = createContext<ThemeCtx>({
	palette: dark,
	mode: "dark",
	toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [mode, setMode] = useState<"dark" | "light">("dark");
	const palette = mode === "dark" ? dark : light;
	const toggle = () => setMode((m) => (m === "dark" ? "light" : "dark"));
	return <ThemeContext.Provider value={{ palette, mode, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	return useContext(ThemeContext);
}
