"use client";

import { Cloud, ShieldCheck } from "lucide-react";
import { TelegramConnectCard } from "./TelegramConnectCard";

export function TCloudLoginScreen() {
  return (
    <main className="web-auth-screen">
      <section className="web-auth-shell">
        <header className="web-auth-top">
          <div className="web-auth-brand">
            <div className="web-auth-brand-mark">
              <Cloud size={23} strokeWidth={2.1} />
            </div>

            <div>
              <strong>TCloud</strong>
              <span>Web</span>
            </div>
          </div>

          <div className="web-auth-core-pill is-online">
            <span />
            Core conectado
          </div>
        </header>

        <div className="web-auth-copy">
          <span className="web-auth-badge">Acesso seguro</span>
          <h1>Entre no TCloud</h1>
          <p>
            Conecte sua conta do Telegram para acessar seus
            arquivos, pastas e fóruns.
          </p>
        </div>

        <TelegramConnectCard />

        <footer className="web-auth-footer">
          <ShieldCheck size={14} />
          <span>
            Sua sessão fica protegida no TCloud Core deste dispositivo.
          </span>
        </footer>
      </section>
    </main>
  );
}