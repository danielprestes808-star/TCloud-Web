export type TCloudCanonicalFileIdentity = {
  coreFileId: string;
  telegramPeerId?: number | null;
  telegramTopicId?: number | null;
  telegramMessageId?: number | null;
};

export type TCloudCanonicalFolderIdentity = {
  coreFolderId: string;
  telegramPeerId?: number | null;
  telegramTopicId?: number | null;
};

export function requireCoreFileId(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("coreFileId canônico é obrigatório.");
  }
  return value.trim();
}