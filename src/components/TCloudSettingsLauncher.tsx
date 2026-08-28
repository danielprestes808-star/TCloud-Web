"use client";

import { Settings, X } from "lucide-react";
import { useState } from "react";
import TCloudThemeControl from "@/components/TCloudThemeControl";

export default function TCloudSettingsLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="tc-settings-launcher"
        aria-label="Configurações"
        title="Configurações"
        onClick={() => setOpen(true)}
      >
        <Settings size={19} />
      </button>

      {open && (
        <div
          className="tc-settings-backdrop"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <section
            className="tc-settings-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Configurações do TCloud"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="tc-settings-modal-header">
              <div>
                <h2>Configurações</h2>
                <p>Preferências do TCloud</p>
              </div>

              <button
                type="button"
                className="tc-settings-close"
                aria-label="Fechar"
                onClick={() => setOpen(false)}
              >
                <X size={18} />
              </button>
            </header>

            <TCloudThemeControl />
          </section>
        </div>
      )}
    </>
  );
}