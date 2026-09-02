"use client";

import { useSyncExternalStore } from "react";
import {
  getTCloudTheme,
  setTCloudTheme,
} from "@/components/TCloudThemeBootstrap";

type ThemeValue = "light" | "dark" | "system";

const options: Array<{ value: ThemeValue; label: string }> = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Sistema" },
];

export default function TCloudThemeControl() {
  const value = useSyncExternalStore(
    (notify) => {
      window.addEventListener("tcloud-theme-changed", notify);
      return () => window.removeEventListener("tcloud-theme-changed", notify);
    },
    getTCloudTheme,
    () => "system",
  );

  return (
    <section className="tc-settings-theme-card">
      <div>
        <strong>Tema</strong>
        <p>Escolha a aparência do TCloud.</p>
      </div>

      <div className="tc-theme-setting">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => {
              setTCloudTheme(option.value);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
