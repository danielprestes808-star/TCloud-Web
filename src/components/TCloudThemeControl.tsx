"use client";

import { useEffect, useState } from "react";
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
  const [value, setValue] = useState<ThemeValue>("system");

  useEffect(() => {
    setValue(getTCloudTheme());
  }, []);

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
              setValue(option.value);
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