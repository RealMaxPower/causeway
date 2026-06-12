"use client";

import { useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "cw-theme";
const CHANGE_EVENT = "cw-theme-change";

function isTheme(v: unknown): v is Theme {
  return v === "light" || v === "dark" || v === "system";
}

function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isTheme(v) ? v : "system";
  } catch {
    return "system";
  }
}

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onChange();
  };
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onMql = () => {
    // When the OS preference changes and we're in `system` mode, the icon
    // stays the same but the resolved class on <html> must flip.
    if (readStored() === "system") applyTheme("system");
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  mql.addEventListener("change", onMql);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
    mql.removeEventListener("change", onMql);
  };
}

const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const LABEL: Record<Theme, string> = {
  light: "Theme: light. Click to switch to dark.",
  dark: "Theme: dark. Click to switch to system.",
  system: "Theme: system. Click to switch to light.",
};

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(
    subscribe,
    readStored,
    () => null,
  );

  const cycle = useCallback(() => {
    const next = NEXT[readStored()];
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    applyTheme(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={theme ? LABEL[theme] : "Toggle theme"}
      title={theme ? LABEL[theme] : "Toggle theme"}
      className="inline-flex items-center justify-center w-9 h-9 rounded border border-rule text-ink-2 hover:text-ink hover:bg-paper-2 transition-colors"
    >
      <span aria-hidden className="block w-4 h-4">
        {theme === "light" ? (
          <SunIcon />
        ) : theme === "dark" ? (
          <MoonIcon />
        ) : theme === "system" ? (
          <SystemIcon />
        ) : null}
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="3" />
      <line x1="8" y1="1.5" x2="8" y2="3" />
      <line x1="8" y1="13" x2="8" y2="14.5" />
      <line x1="1.5" y1="8" x2="3" y2="8" />
      <line x1="13" y1="8" x2="14.5" y2="8" />
      <line x1="3.4" y1="3.4" x2="4.5" y2="4.5" />
      <line x1="11.5" y1="11.5" x2="12.6" y2="12.6" />
      <line x1="3.4" y1="12.6" x2="4.5" y2="11.5" />
      <line x1="11.5" y1="4.5" x2="12.6" y2="3.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M13.5 9.5a5.5 5.5 0 0 1-7-7 5.5 5.5 0 1 0 7 7Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="5" />
      <path d="M8 3v10" />
      <path d="M8 3a5 5 0 0 1 0 10Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
