"use client";

import { useEffect } from "react";

type TCloudTheme = "light" | "dark" | "system";

const STORAGE_KEY = "tcloud-theme";

function resolveTheme(theme: TCloudTheme): "light" | "dark" {
  if (theme !== "system") return theme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: TCloudTheme) {
  const resolved = resolveTheme(theme);
  document.documentElement.dataset.tcloudTheme = resolved;
  document.documentElement.dataset.tcloudThemePreference = theme;
}

export function setTCloudTheme(theme: TCloudTheme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new CustomEvent("tcloud-theme-changed", {
    detail: { theme },
  }));
}

export function getTCloudTheme(): TCloudTheme {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === "light" || saved === "dark" || saved === "system"
    ? saved
    : "system";
}

export default function TCloudThemeBootstrap() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const refresh = () => {
      applyTheme(getTCloudTheme());
    };

    refresh();

    media.addEventListener?.("change", refresh);
    window.addEventListener("tcloud-theme-changed", refresh);

    return () => {
      media.removeEventListener?.("change", refresh);
      window.removeEventListener("tcloud-theme-changed", refresh);
    };
  }, []);

  return null;
}