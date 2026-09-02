"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type AuthStatus = {
  credentialsConfigured?: boolean;
  authorized?: boolean;
  stage?: string;
  passwordHint?: string | null;
  message?: string;
  ok?: boolean;
};

async function postJson(
  url: string,
  body: Record<string, unknown> = {},
) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return (await response.json()) as AuthStatus;
}

export function TelegramConnectCard() {
  const [auth, setAuth] = useState<AuthStatus>({
    stage: "loading",
  });
  const [phone, setPhone] = useState("+55");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualPhoneMode, setManualPhoneMode] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [feedbackKind, setFeedbackKind] = useState<
    "info" | "success" | "error"
  >("info");
  const [resendSeconds, setResendSeconds] = useState(0);

  const stage = manualPhoneMode
    ? "phone-required"
    : auth.authorized
      ? "authorized"
      : auth.stage ?? "phone-required";

  async function refresh() {
    try {
      const response = await fetch("/api/core/auth/status", {
        cache: "no-store",
      });
      setAuth(await response.json());
    } catch {
      setAuth({
        stage: "core-offline",
        message: "TCloud Core não está em execução.",
      });
    }
  }

  useEffect(() => {
    void (async () => {
      await refresh();
      const savedPhone = window.localStorage.getItem(
        "tcloud.telegram.phone",
      );
      if (savedPhone) setPhone(savedPhone);
    })();
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return;

    const timer = window.setInterval(() => {
      setResendSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendSeconds]);

  function applyResult(result: AuthStatus) {
    setAuth(result);
    setFeedback(result.message ?? "");
    setFeedbackKind(
      result.ok === false
        ? "error"
        : result.authorized
          ? "success"
          : "info",
    );
  }

  async function sendPhone(event?: FormEvent) {
    event?.preventDefault();

    const cleanPhone = phone.replace(/[^\d+]/g, "");

    if (
      cleanPhone.length < 9 ||
      !cleanPhone.startsWith("+")
    ) {
      setFeedbackKind("error");
      setFeedback(
        "Use o número com código do país, por exemplo +55...",
      );
      return;
    }

    setBusy(true);
    setFeedback("");

    try {
      const result = await postJson(
        "/api/core/auth/request-code",
        { phone: cleanPhone },
      );
      applyResult(result);

      if (result.ok !== false) {
        window.localStorage.setItem(
          "tcloud.telegram.phone",
          cleanPhone,
        );
        setPhone(cleanPhone);
        setManualPhoneMode(false);
        setCode("");
        setPassword("");
        setResendSeconds(45);
      }
    } catch {
      setFeedbackKind("error");
      setFeedback("Não foi possível falar com o Core.");
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(event: FormEvent) {
    event.preventDefault();

    if (!code.trim()) {
      setFeedbackKind("error");
      setFeedback("Digite o código recebido.");
      return;
    }

    setBusy(true);
    setFeedback("");

    try {
      const result = await postJson(
        "/api/core/auth/verify-code",
        { code: code.trim() },
      );
      applyResult(result);

      if (result.authorized) {
        window.setTimeout(() => window.location.reload(), 650);
      }
    } catch {
      setFeedbackKind("error");
      setFeedback("Não foi possível verificar o código.");
    } finally {
      setBusy(false);
    }
  }

  async function sendPassword(event: FormEvent) {
    event.preventDefault();

    if (!password) {
      setFeedbackKind("error");
      setFeedback("Digite sua senha de duas etapas.");
      return;
    }

    setBusy(true);
    setFeedback("");

    try {
      const result = await postJson(
        "/api/core/auth/password",
        { password },
      );
      applyResult(result);

      if (result.authorized) {
        window.setTimeout(() => window.location.reload(), 650);
      }
    } catch {
      setFeedbackKind("error");
      setFeedback("Não foi possível verificar a senha 2FA.");
    } finally {
      setBusy(false);
    }
  }

  function changeNumber() {
    setManualPhoneMode(true);
    setCode("");
    setPassword("");
    setFeedback("");
    setFeedbackKind("info");
  }

  const step =
    stage === "password-required"
      ? 2
      : stage === "code-required"
        ? 1
        : 0;

  if (stage === "loading") {
    return (
      <div className="auth-v2-loading">
        <LoaderCircle className="spin" size={21} />
        Preparando login seguro…
      </div>
    );
  }

  if (stage === "core-offline") {
    return (
      <div className="auth-v2-message is-error">
        <div>
          <strong>Core offline</strong>
          <span>Inicie o TCloud Core e tente novamente.</span>
        </div>
        <button onClick={() => void refresh()} type="button">
          <RefreshCw size={15} />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (
    stage === "credentials-required" ||
    auth.credentialsConfigured === false
  ) {
    return (
      <div className="auth-v2-message is-error">
        <div>
          <strong>Telegram não configurado</strong>
          <span>
            O Core não encontrou as credenciais do aplicativo Telegram.
          </span>
        </div>
      </div>
    );
  }

  if (stage === "authorized") {
    return (
      <div className="auth-v2-message is-success">
        <CheckCircle2 size={24} />
        <div>
          <strong>Conta conectada</strong>
          <span>Entrando no TCloud…</span>
        </div>
      </div>
    );
  }

  return (
    <section className="auth-v2-panel">
      <div className="auth-v2-security">
        <ShieldCheck size={18} />
        <div>
          <strong>Login protegido pelo TCloud Core</strong>
          <span>
            Sua sessão Telegram permanece no Core deste dispositivo.
          </span>
        </div>
      </div>

      <div className="auth-v2-steps">
        {["Telefone", "Código", "2FA"].map((label, index) => (
          <div
            className={`auth-v2-step ${
              index === step ? "is-active" : ""
            } ${index < step ? "is-done" : ""}`}
            key={label}
          >
            <span>
              {index < step ? (
                <Check size={13} />
              ) : (
                <Circle size={10} />
              )}
            </span>
            {label}
          </div>
        ))}
      </div>

      {stage === "phone-required" && (
        <form className="auth-v2-form" onSubmit={sendPhone}>
          <header>
            <Smartphone size={20} />
            <div>
              <strong>Número do Telegram</strong>
              <span>Informe seu número com código do país.</span>
            </div>
          </header>

          <label>
            <span>Telefone</span>
            <div>
              <Smartphone size={16} />
              <input
                autoFocus
                autoComplete="tel"
                inputMode="tel"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+55 92 99999-9999"
                value={phone}
              />
            </div>
          </label>

          <button
            className="auth-v2-primary"
            disabled={busy}
            type="submit"
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Send size={16} />
            )}
            Enviar código
          </button>
        </form>
      )}

      {stage === "code-required" && (
        <form className="auth-v2-form" onSubmit={sendCode}>
          <header>
            <KeyRound size={20} />
            <div>
              <strong>Código do Telegram</strong>
              <span>Digite o código recebido no Telegram.</span>
            </div>
          </header>

          <label>
            <span>Código</span>
            <div>
              <KeyRound size={16} />
              <input
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, ""))
                }
                placeholder="00000"
                value={code}
              />
            </div>
          </label>

          <button
            className="auth-v2-primary"
            disabled={busy}
            type="submit"
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Confirmar código
          </button>

          <div className="auth-v2-actions">
            <button
              disabled={busy}
              onClick={changeNumber}
              type="button"
            >
              <ArrowLeft size={14} />
              Trocar número
            </button>

            <button
              disabled={busy || resendSeconds > 0}
              onClick={() => void sendPhone()}
              type="button"
            >
              <RefreshCw size={14} />
              {resendSeconds > 0
                ? `Reenviar em ${resendSeconds}s`
                : "Reenviar código"}
            </button>
          </div>
        </form>
      )}

      {stage === "password-required" && (
        <form className="auth-v2-form" onSubmit={sendPassword}>
          <header>
            <LockKeyhole size={20} />
            <div>
              <strong>Verificação em duas etapas</strong>
              <span>
                {auth.passwordHint
                  ? `Dica: ${auth.passwordHint}`
                  : "Digite a senha 2FA da sua conta."}
              </span>
            </div>
          </header>

          <label>
            <span>Senha 2FA</span>
            <div>
              <LockKeyhole size={16} />
              <input
                autoFocus
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Senha de duas etapas"
                type="password"
                value={password}
              />
            </div>
          </label>

          <button
            className="auth-v2-primary"
            disabled={busy}
            type="submit"
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <ShieldCheck size={16} />
            )}
            Entrar no TCloud
          </button>

          <div className="auth-v2-actions">
            <button
              disabled={busy}
              onClick={changeNumber}
              type="button"
            >
              <ArrowLeft size={14} />
              Usar outro número
            </button>
          </div>
        </form>
      )}

      {(feedback || auth.message) && (
        <div
          className={`auth-v2-feedback is-${feedbackKind}`}
          role="status"
        >
          {feedback || auth.message}
        </div>
      )}
    </section>
  );
}
