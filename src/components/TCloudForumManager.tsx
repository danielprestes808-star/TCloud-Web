"use client";

import {
  Folder,
  LoaderCircle,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import type { FormEvent } from "react";

type ForumItem = {
  id: string;
  name: string;
  source?: string;
  deletable?: boolean;
};

type MutationResponse = {
  ok?: boolean;
  message?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
};

async function postJson(
  path: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as MutationResponse;

  if (!response.ok || data.ok === false) {
    throw new Error(
      data.message ?? "Não foi possível concluir a operação.",
    );
  }

  return data;
}

export function TCloudForumManager({
  open,
  onClose,
  onChanged,
}: Props) {
  const [forums, setForums] = useState<ForumItem[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/core/forums", {
        cache: "no-store",
      });
      const data = await response.json();
      setForums(Array.isArray(data) ? data : []);
    } catch {
      setForums([]);
      setMessage("Não foi possível carregar os fóruns.");
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, open]);

  if (!open) return null;

  async function createForum(event: FormEvent) {
    event.preventDefault();
    const name = newName.trim();
    if (!name || busy) return;

    setBusy(true);
    setMessage("Criando fórum no Telegram…");

    try {
      const result = await postJson("/api/core/forums", { name });
      setNewName("");
      setMessage(result.message ?? "Fórum criado.");
      await load();
      onChanged?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o fórum.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function renameForum(forum: ForumItem) {
    const name = window.prompt("Novo nome do fórum:", forum.name)?.trim();
    if (!name || name === forum.name || busy) return;

    setBusy(true);
    setMessage(`Renomeando ${forum.name}…`);

    try {
      const result = await postJson("/api/core/forums/rename", {
        id: forum.id,
        name,
      });
      setMessage(result.message ?? "Fórum renomeado.");
      await load();
      onChanged?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível renomear o fórum.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteForum(forum: ForumItem) {
    if (forum.name === "Meus Arquivos" || busy) return;

    if (
      !window.confirm(
        `Excluir permanentemente o fórum "${forum.name}"?\n\nO Telegram também será excluído. A operação só é permitida quando o fórum não possui arquivos.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage(`Excluindo ${forum.name}…`);

    try {
      const result = await postJson("/api/core/forums/delete", {
        id: forum.id,
      });
      setMessage(result.message ?? "Fórum excluído.");
      await load();
      onChanged?.();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o fórum.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="web-forum-manager-overlay" role="dialog" aria-modal="true">
      <section className="web-forum-manager">
        <header>
          <div className="web-forum-manager-title">
            <span className="web-forum-manager-icon">
              <Folder size={20} />
            </span>
            <div>
              <strong>Fóruns do TCloud</strong>
              <span>Crie e organize as pastas principais do Telegram.</span>
            </div>
          </div>
          <button
            aria-label="Fechar"
            className="web-forum-manager-close"
            disabled={busy}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <form className="web-forum-create" onSubmit={createForum}>
          <input
            autoFocus
            disabled={busy}
            maxLength={128}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nome do novo fórum"
            value={newName}
          />
          <button disabled={busy || !newName.trim()} type="submit">
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Plus size={16} />
            )}
            Novo fórum
          </button>
        </form>

        <div className="web-forum-manager-list">
          {forums.length === 0 ? (
            <div className="web-forum-manager-empty">
              Nenhum fórum disponível.
            </div>
          ) : (
            forums.map((forum) => {
              const protectedForum = forum.name === "Meus Arquivos";
              const deletable =
                !protectedForum && forum.deletable === true;

              return (
                <div className="web-forum-manager-row" key={forum.id}>
                  <div className="web-forum-manager-name">
                    <Folder size={18} />
                    <span>
                      <strong>{forum.name}</strong>
                      <small>
                        {protectedForum
                          ? "Fórum principal protegido"
                          : "Fórum Telegram"}
                      </small>
                    </span>
                    {protectedForum && (
                      <ShieldCheck size={15} aria-label="Protegido" />
                    )}
                  </div>

                  <div className="web-forum-manager-actions">
                    <button
                      disabled={busy}
                      onClick={() => void renameForum(forum)}
                      title="Renomear"
                      type="button"
                    >
                      <Pencil size={15} />
                      Renomear
                    </button>
                    <button
                      className="is-danger"
                      disabled={busy || !deletable}
                      onClick={() => void deleteForum(forum)}
                      title={
                        protectedForum
                          ? "Meus Arquivos é protegido"
                          : deletable
                            ? "Excluir fórum vazio"
                            : "Somente fóruns criados pelo TCloud podem ser excluídos aqui"
                      }
                      type="button"
                    >
                      <Trash2 size={15} />
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {message && (
          <div className="web-forum-manager-message" aria-live="polite">
            {busy && <LoaderCircle className="spin" size={15} />}
            <span>{message}</span>
          </div>
        )}
      </section>
    </div>
  );
}
