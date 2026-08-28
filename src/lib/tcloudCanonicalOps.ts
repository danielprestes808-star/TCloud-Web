import { requireCoreFileId } from "./tcloudGlobalIdentity";

const CORE_URL =
  (process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");

export function canonicalMediaUrl(coreFileId: string) {
  const id = requireCoreFileId(coreFileId);
  return `${CORE_URL}/api/v1/media/${encodeURIComponent(id)}`;
}

export async function canonicalFile(coreFileId: string) {
  const id = requireCoreFileId(coreFileId);
  const response = await fetch(`${CORE_URL}/api/v1/files/${encodeURIComponent(id)}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Core file HTTP ${response.status}`);
  return response.json();
}

export async function canonicalMutation(
  operation: "rename" | "move" | "trash" | "restore" | "delete",
  coreFileId: string,
  extra: Record<string, unknown> = {},
) {
  const id = requireCoreFileId(coreFileId);
  const response = await fetch(`${CORE_URL}/api/v1/files/${operation}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, ...extra }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : `Core ${operation} HTTP ${response.status}`,
    );
  }
  return payload;
}