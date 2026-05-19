import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { Toaster } from "sonner";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "fu-theme";

function readStoredTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "dark";
}

function applyDomTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
}

type Ctx = {
  theme: ThemeMode;
  setTheme: (m: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    typeof document !== "undefined" ? readStoredTheme() : "dark",
  );

  useLayoutEffect(() => {
    applyDomTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((m: ThemeMode) => {
    setThemeState(m);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve estar dentro de ThemeProvider");
  return ctx;
}

/** Toaster do Sonner alinhado ao tema */
export function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster richColors closeButton theme={theme} position="top-right" />;
}
