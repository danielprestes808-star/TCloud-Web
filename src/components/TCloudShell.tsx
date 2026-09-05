"use client";

import {
  ArrowLeft,
  Activity,
  ChevronRight,
  Clock3,
  Cloud,
  CloudDownload,
  Copy,
  FileImage,
  FileText,
  Film,
  Folder,
  FolderPlus,
  Grid2X2,
  HardDrive,
  LayoutGrid,
  ChartPie,
  List,
  LoaderCircle,
  MessageSquarePlus,
  MessagesSquare,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TCloudLoginScreen } from "./TCloudLoginScreen";
import { TCloudForumManager } from "./TCloudForumManager";
import TCloudThemeControl from "./TCloudThemeControl";

type CoreStatus = {
  name?: string;
  version?: string;
  connected?: boolean;
  telegramConnected?: boolean;
  telegramCredentialsReady?: boolean;
  databaseConnected?: boolean;
  databaseMode?: string;
  storageBackend?: string;
  filesCount?: number;
  devicesCount?: number;
  sessionsCount?: number;
};

type AuthStatus = {
  credentialsConfigured?: boolean;
  authorized?: boolean;
  stage?: string;
  message?: string;
};

type IndexStatus = {
  configured?: boolean;
  authorized?: boolean;
  databaseRequired?: boolean;
  databaseConnected?: boolean;
  queueReady?: boolean;
  lastRunId?: string | null;
  lastStatus?: string | null;
  dialogsSeen?: number;
  topicsSeen?: number;
  messagesSeen?: number;
  filesUpserted?: number;
};

type TCloudItem = {
  id: string;
  parentId?: string | null;
  name: string;
  kind: string;
  size: number;
  mime: string;
  syncState: string;
  modifiedAt: string;
  source: string;
  sourceIds?: string[];
};

type MutationResponse = {
  ok?: boolean;
  message?: string;
  id?: string | null;
  parentId?: string | null;
};

type DestinationDialog = {
  mode: "folder" | "upload" | "move";
  item?: TCloudItem;
};

const navigation = [
  "Arquivos",
  "Recentes",
  "Favoritos",
  "Disponível offline",
  "Dispositivos",
  "Lixeira",
  "Atividade",
  "Duplicados",
  "Armazenamento",
  "Fóruns",
];

type ActivityItem = { id: string; fileId?: string; action: string; detail?: string; createdAt: string };
type DuplicateGroup = { signature: string; reclaimableBytes: number; files: TCloudItem[] };
type StorageBreakdown = { totalBytes: number; imageBytes: number; videoBytes: number; audioBytes: number; documentBytes: number; otherBytes: number; largestFiles: TCloudItem[] };
type PairedDevice = { id: string; name: string; platform: string; appVersion?: string; lastSeenAt?: string };
type PairingCode = { code: string; expiresAt: string };

const ITEMS_CACHE_KEY = "tcloud:web:items:v1";
const TRASH_CACHE_KEY = "tcloud:web:trash:v1";
const FAVORITES_KEY = "tcloud:web:favorites:v1";

function readCachedItems(key: string): TCloudItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );

  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

const webMediaWarm = new Map<string, number>();

function warmWebMedia(item: TCloudItem) {
  if (item.kind !== "video" && item.kind !== "image") return;

  const now = Date.now();
  if (now - (webMediaWarm.get(item.id) ?? 0) < 10 * 60 * 1000) return;
  webMediaWarm.set(item.id, now);

  const headers =
    item.kind === "video" ? { Range: "bytes=0-2097151" } : undefined;

  void fetch(`/api/core/media/${encodeURIComponent(item.id)}`, {
    headers,
    cache: "force-cache",
  }).catch(() => {});
}

function itemIcon(kind: string) {
  if (kind === "folder") return Folder;
  if (kind === "image") return FileImage;
  if (kind === "video") return Film;
  return FileText;
}

function syncLabel(state: string) {
  if (state === "device") return "Disponível neste dispositivo";
  if (state === "syncing") return "Sincronizando";
  if (state === "trash") return "Na Lixeira";
  return "Somente online";
}

function folderDisplayName(value: string) {
  let normalized = value
    .replace(/[\u00a0\u2007\u202f\u3000]/g, " ")
    .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  while (/\s*\([1-9]\d*\)$/.test(normalized)) {
    normalized = normalized.replace(/\s*\([1-9]\d*\)$/, "").trim();
  }
  return normalized;
}

function folderGroupKey(item: TCloudItem) {
  return folderDisplayName(item.name).toLocaleLowerCase("pt-BR") || item.id;
}

async function mutationPost(
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

export function TCloudShell() {
  const [forumManagerOpen, setForumManagerOpen] = useState(false);
  const [status, setStatus] = useState<CoreStatus>({
    connected: false,
  });
  const [auth, setAuth] = useState<AuthStatus>({
    authorized: false,
    stage: "loading",
  });
  const [indexStatus, setIndexStatus] = useState<IndexStatus>({});
  const [items, setItems] = useState<TCloudItem[]>([]);
  const [trashItems, setTrashItems] = useState<TCloudItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("Arquivos");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [indexBusy, setIndexBusy] = useState(false);
  const [indexMessage, setIndexMessage] = useState("");
  const [mutationBusy, setMutationBusy] = useState(false);
  const [mutationMessage, setMutationMessage] = useState("");
  const [menuItemId, setMenuItemId] = useState<string | null>(null);
  const [destinationDialog, setDestinationDialog] =
    useState<DestinationDialog | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [storage, setStorage] = useState<StorageBreakdown | null>(null);
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [activeDevice, setActiveDevice] = useState<"computer" | "phone" | null>(null);
  const [pairingCode, setPairingCode] = useState<PairingCode | null>(null);
  const [pairingBusy, setPairingBusy] = useState(false);
  const [previewItem, setPreviewItem] = useState<TCloudItem | null>(null);
  const [mediaRetry, setMediaRetry] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(new Set());
  const [uploadParentId, setUploadParentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveRevisionRef = useRef<string | null>(null);

  const openItem = useCallback((item: TCloudItem) => {
    if (item.kind === "folder") {
      setCurrentFolderId(item.id);
      return;
    }
    setMediaError(false);
    setMediaRetry(0);
    setPreviewItem(item);
  }, []);

  useEffect(() => {
    if (!previewItem) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewItem(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [previewItem]);

  const loadDevices = useCallback(async () => {
    const response = await fetch("/api/core/devices", { cache: "no-store" });
    if (response.ok) {
      const data = await response.json() as unknown;
      setPairedDevices(Array.isArray(data) ? data as PairedDevice[] : []);
    }
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const task = window.setTimeout(() => void loadDevices().catch(() => {}), 0);
    return () => window.clearTimeout(task);
  }, [settingsOpen, loadDevices]);

  async function generatePairingCode() {
    setPairingBusy(true);
    setMutationMessage("");
    try {
      const response = await fetch("/api/core/devices/pairing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceName: "Novo dispositivo", platform: "mobile" }),
      });
      const data = await response.json() as PairingCode & MutationResponse;
      if (!response.ok) throw new Error(data.message ?? "Não foi possível gerar o código.");
      setPairingCode(data);
    } catch (error) {
      setMutationMessage(error instanceof Error ? error.message : "Falha no pareamento.");
    } finally {
      setPairingBusy(false);
    }
  }

  async function revokePairedDevice(deviceId: string) {
    if (!window.confirm("Remover o acesso deste dispositivo?")) return;
    await mutationPost("/api/core/devices/revoke", { deviceId });
    await loadDevices();
  }

  useEffect(() => {
    const restore = window.setTimeout(() => {
      setItems(readCachedItems(ITEMS_CACHE_KEY));
      setTrashItems(readCachedItems(TRASH_CACHE_KEY));
      setFavoriteIds(
        new Set(readCachedItems(FAVORITES_KEY).map((item) => item.id)),
      );
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    const endpoint = activeNav === "Atividade" ? "activity" : activeNav === "Duplicados" ? "duplicates" : activeNav === "Armazenamento" ? "storage" : null;
    if (!endpoint || !status.connected) return;
    const controller = new AbortController();
    void fetch(`/api/core/${endpoint}`, { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: unknown) => {
        if (endpoint === "activity") setActivityItems(Array.isArray(data) ? data as ActivityItem[] : []);
        if (endpoint === "duplicates") setDuplicateGroups(Array.isArray(data) ? data as DuplicateGroup[] : []);
        if (endpoint === "storage") setStorage(data as StorageBreakdown);
      }).catch(() => {});
    return () => controller.abort();
  }, [activeNav, status.connected]);

  const loadAll = useCallback(async () => {
    const [
      statusResult,
      authResult,
      indexResult,
      filesResult,
      trashResult,
      favoritesResult,
    ] = await Promise.allSettled([
      fetch("/api/core/status", { cache: "no-store" }),
      fetch("/api/core/auth/status", { cache: "no-store" }),
      fetch("/api/core/index/status", { cache: "no-store" }),
      fetch("/api/core/files", { cache: "no-store" }),
      fetch("/api/core/trash", { cache: "no-store" }),
      fetch("/api/core/favorites", { cache: "no-store" }),
    ]);

    if (statusResult.status === "fulfilled" && statusResult.value.ok) {
      setStatus(await statusResult.value.json());
    } else {
      setStatus({ connected: false });
    }

    if (authResult.status === "fulfilled" && authResult.value.ok) {
      setAuth(await authResult.value.json());
    } else {
      setAuth({
        authorized: false,
        stage: "core-offline",
      });
    }

    if (indexResult.status === "fulfilled" && indexResult.value.ok) {
      setIndexStatus(await indexResult.value.json());
    }

    if (filesResult.status === "fulfilled" && filesResult.value.ok) {
      const data = await filesResult.value.json();
      const nextItems = Array.isArray(data) ? data : [];
      setItems(nextItems);
      window.localStorage.setItem(ITEMS_CACHE_KEY, JSON.stringify(nextItems));
    }

    if (trashResult.status === "fulfilled" && trashResult.value.ok) {
      const data = await trashResult.value.json();
      const nextTrash = Array.isArray(data) ? data : [];
      setTrashItems(nextTrash);
      window.localStorage.setItem(TRASH_CACHE_KEY, JSON.stringify(nextTrash));
    }

    if (favoritesResult.status === "fulfilled" && favoritesResult.value.ok) {
      const data = await favoritesResult.value.json();
      const favorites = Array.isArray(data) ? data as TCloudItem[] : [];
      setFavoriteIds(new Set(favorites.map((item) => item.id)));
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAll]);

  useEffect(() => {
    const refresh = () => {
      if (
        document.visibilityState === "visible" &&
        !indexBusy &&
        !mutationBusy
      ) {
        void loadAll();
      }
    };

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);

    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [indexBusy, loadAll, mutationBusy]);

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    const checkRevision = async () => {
      if (
        cancelled ||
        inFlight ||
        mutationBusy ||
        indexBusy
      ) {
        return;
      }

      inFlight = true;

      try {
        const response = await fetch(
          "/api/core/live/revision",
          { cache: "no-store" },
        );

        if (!response.ok) return;

        const data = (await response.json()) as {
          revision?: string;
        };

        const next = data.revision ?? null;
        if (!next) return;

        const previous = liveRevisionRef.current;
        liveRevisionRef.current = next;

        if (previous !== null && previous !== next) {
          await loadAll();
        }
      } catch {
      } finally {
        inFlight = false;
      }
    };

    void checkRevision();

    const timer = window.setInterval(
      () => void checkRevision(),
      document.visibilityState === "visible" ? 5000 : 30000,
    );

    const visible = () => {
      if (document.visibilityState === "visible") {
        void checkRevision();
      }
    };

    document.addEventListener("visibilitychange", visible);
    window.addEventListener("online", visible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
    };
  }, [indexBusy, loadAll, mutationBusy]);

  useEffect(() => {
    if (!indexBusy) return;

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/core/index/status", {
          cache: "no-store",
        });
        const next = (await response.json()) as IndexStatus;
        setIndexStatus(next);

        if (
          next.lastStatus === "completed" ||
          next.lastStatus === "failed"
        ) {
          window.clearInterval(timer);
          setIndexBusy(false);
          setIndexMessage(
            next.lastStatus === "completed"
              ? `Atualização concluída · ${next.topicsSeen ?? 0} pastas · ${next.filesUpserted ?? 0} arquivos processados`
              : "A atualização do Telegram encontrou um erro.",
          );
          await loadAll();
        }
      } catch {
        window.clearInterval(timer);
        setIndexBusy(false);
        setIndexMessage("Não foi possível acompanhar a atualização.");
      }
    }, 1400);

    return () => window.clearInterval(timer);
  }, [indexBusy, loadAll]);

  async function startIndex() {
    if (!indexStatus.queueReady || indexBusy) return;

    setIndexBusy(true);
    setIndexMessage("Atualizando índice do Telegram…");

    try {
      const response = await fetch("/api/core/index/telegram", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "delta" }),
      });

      const data = await response.json();

      if (!data.accepted) {
        setIndexBusy(false);
        setIndexMessage(
          data.message ?? "Não foi possível iniciar a atualização.",
        );
      }
    } catch {
      setIndexBusy(false);
      setIndexMessage("TCloud Core não respondeu.");
    }
  }

  const { folders, folderMap, physicalToLogicalFolder } = useMemo(() => {
    const groups = new Map<string, TCloudItem[]>();
    for (const folder of items.filter((item) => item.kind === "folder")) {
      const key = folderGroupKey(folder);
      groups.set(key, [...(groups.get(key) ?? []), folder]);
    }

    const physicalToLogical = new Map<string, string>();
    const logicalFolders = [...groups.values()].map((sources) => {
      sources.sort((left, right) => left.id.localeCompare(right.id));
      const exact = sources.find(
        (source) => folderDisplayName(source.name) === source.name.trim(),
      );
      const representative = exact ?? sources[0];
      const sourceIds = sources.map((source) => source.id);
      for (const source of sources) {
        physicalToLogical.set(source.id, representative.id);
      }
      return {
        ...representative,
        name: folderDisplayName(representative.name),
        parentId:
          sources.find((source) => source.parentId)?.parentId ?? null,
        sourceIds,
      };
    });

    for (const folder of logicalFolders) {
      if (folder.parentId) {
        folder.parentId =
          physicalToLogical.get(folder.parentId) ?? folder.parentId;
      }
    }

    const galleryRoot = logicalFolders.find(
      (folder) => folderDisplayName(folder.name).toLocaleLowerCase("pt-BR") === "galeria",
    );
    if (galleryRoot) {
      for (const folder of logicalFolders) {
        const fullName = folderDisplayName(folder.name);
        if (fullName.toLocaleLowerCase("pt-BR").startsWith("galeria / ")) {
          folder.name = fullName.slice("Galeria / ".length).trim();
          folder.parentId = galleryRoot.id;
        }
      }
    }

    return {
      folders: logicalFolders,
      folderMap: new Map(logicalFolders.map((folder) => [folder.id, folder])),
      physicalToLogicalFolder: physicalToLogical,
    };
  }, [items]);

  const forumRoots = useMemo(
    () =>
      folders.filter(
        (item) =>
          !item.parentId &&
          item.name !== "Mensagens Salvas",
      ),
    [folders],
  );

  const currentFolder = currentFolderId
    ? folderMap.get(currentFolderId) ?? null
    : null;

  const parentFolder = currentFolder?.parentId
    ? folderMap.get(currentFolder.parentId) ?? null
    : null;

  function goBack() {
    if (currentFolder?.parentId) {
      setCurrentFolderId(currentFolder.parentId);
      return;
    }

    setCurrentFolderId(null);
  }

  function openDeviceRoot(kind: "computer" | "phone") {
    setActiveNav("Arquivos");
    setCurrentFolderId(null);
    setActiveDevice(kind);
  }

  const visibleItems = useMemo(() => {
    const source = activeNav === "Lixeira"
      ? trashItems
      : [...items.filter((item) => item.kind !== "folder"), ...folders];
    const currentSourceIds = new Set(
      currentFolderId
        ? folderMap.get(currentFolderId)?.sourceIds ?? [currentFolderId]
        : [],
    );

    let next = source.filter((item) => {
      if (activeNav === "Lixeira") return true;
      if (activeNav === "Recentes") return item.kind !== "folder";
      if (activeNav === "Favoritos") return favoriteIds.has(item.id);
      if (activeNav === "Disponível offline") return item.syncState === "device";
      if (activeNav !== "Arquivos") return false;

      if (!currentFolderId && activeDevice) {
        if (item.kind !== "folder" || item.parentId) return false;
        const name = item.name.trim().toLocaleLowerCase("pt-BR");
        return activeDevice === "computer"
          ? name.startsWith("meu computador")
          : name.startsWith("meu telefone") || name.startsWith("galeria");
      }

      if (currentFolderId) {
        if (!item.parentId) return false;
        if (item.kind === "folder") {
          return (
            (physicalToLogicalFolder.get(item.parentId) ?? item.parentId) ===
            currentFolderId
          );
        }
        return currentSourceIds.has(item.parentId);
      }

      return !item.parentId;
    });

    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (normalized) {
      next = next.filter((item) =>
        item.name.toLocaleLowerCase("pt-BR").includes(normalized),
      );
    }

    if (activeNav === "Recentes") {
      next = [...next].sort(
        (left, right) =>
          Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt),
      ).slice(0, 100);
    }

    return next;
  }, [
    activeNav,
    activeDevice,
    currentFolderId,
    favoriteIds,
    folderMap,
    folders,
    items,
    physicalToLogicalFolder,
    query,
    trashItems,
  ]);

  function toggleFavorite(item: TCloudItem) {
    const favorite = !favoriteIds.has(item.id);
    setFavoriteIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      const favoriteItems = items.filter((candidate) => next.has(candidate.id));
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteItems));
      return next;
    });
    setMenuItemId(null);
    if (status.connected) {
      void fetch("/api/core/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileId: item.id, favorite }),
      }).then((response) => {
        if (!response.ok) throw new Error("Falha ao sincronizar favorito.");
      }).catch(() => {
        setMutationMessage("O favorito foi salvo neste navegador e será sincronizado quando o Core estiver disponível.");
      });
    }
  }

  async function runMutation(
    busyText: string,
    action: () => Promise<string>,
  ) {
    if (mutationBusy) return;

    setMutationBusy(true);
    setMenuItemId(null);
    setMutationMessage(busyText);

    try {
      const message = await action();
      setMutationMessage(message);
      await loadAll();
    } catch (error) {
      setMutationMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a operação.",
      );
    } finally {
      setMutationBusy(false);
    }
  }

  function openForumManager() {
    setForumManagerOpen(true);
  }

async function createFolderIn(parentId: string) {
    const name = window.prompt("Nome da nova pasta:");

    if (!name?.trim()) return;

    await runMutation("Criando pasta no Telegram…", async () => {
      const result = await mutationPost(
        "/api/core/folders",
        {
          parentId,
          name: name.trim(),
        },
      );
      return result.message ?? "Pasta criada.";
    });
  }

  function requestNewFolder() {
    let forum: TCloudItem | null = null;

    if (currentFolder) {
      if (!currentFolder.parentId) {
        if (currentFolder.name !== "Mensagens Salvas") {
          forum = currentFolder;
        }
      } else {
        forum =
          folderMap.get(currentFolder.parentId) ?? null;
      }
    }

    if (forum) {
      void createFolderIn(forum.id);
      return;
    }

    if (forumRoots.length === 1) {
      void createFolderIn(forumRoots[0].id);
      return;
    }

    setDestinationDialog({ mode: "folder" });
  }

  function openFilePicker(parentId: string) {
    setUploadParentId(parentId);
    setDestinationDialog(null);

    window.setTimeout(() => {
      fileInputRef.current?.click();
    }, 0);
  }

  function requestUpload() {
    if (currentFolderId) {
      openFilePicker(currentFolderId);
      return;
    }

    if (folders.length === 1) {
      openFilePicker(folders[0].id);
      return;
    }

    setDestinationDialog({ mode: "upload" });
  }

  async function uploadFiles(fileList: FileList | null) {
    const filesToSend = fileList ? Array.from(fileList) : [];
    const parentId = uploadParentId;

    if (!parentId || filesToSend.length === 0) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    await runMutation(
      `Enviando ${filesToSend.length} arquivo(s)…`,
      async () => {
        let completed = 0;

        for (const file of filesToSend) {
          if (file.size > 512 * 1024 * 1024) {
            throw new Error(
              `${file.name}: o envio Web desta etapa aceita até 512 MB por arquivo.`,
            );
          }

          setMutationMessage(
            `Enviando ${file.name} · ${completed + 1}/${filesToSend.length}`,
          );

          const response = await fetch(
            "/api/core/files/upload",
            {
              method: "POST",
              headers: {
                "content-type":
                  file.type || "application/octet-stream",
                "x-tcloud-parent-id": parentId,
                "x-tcloud-file-name":
                  encodeURIComponent(file.name),
              },
              body: file,
            },
          );

          const result =
            (await response.json().catch(() => ({}))) as MutationResponse;

          if (!response.ok || result.ok === false) {
            throw new Error(
              result.message ??
                `Falha ao enviar ${file.name}.`,
            );
          }

          completed += 1;
        }

        return `${completed} arquivo(s) enviado(s).`;
      },
    );
  }

  async function renameItem(item: TCloudItem) {
    const name = window.prompt(
      "Novo nome do arquivo:",
      item.name,
    );

    if (!name?.trim() || name.trim() === item.name) return;

    await runMutation("Renomeando arquivo…", async () => {
      const result = await mutationPost(
        "/api/core/files/rename",
        {
          id: item.id,
          name: name.trim(),
        },
      );
      return result.message ?? "Arquivo renomeado.";
    });
  }

  function requestMove(item: TCloudItem) {
    setMenuItemId(null);
    setDestinationDialog({
      mode: "move",
      item,
    });
  }

  async function moveItem(
    item: TCloudItem,
    parentId: string,
  ) {
    setDestinationDialog(null);

    await runMutation("Movendo arquivo…", async () => {
      const result = await mutationPost(
        "/api/core/files/move",
        {
          id: item.id,
          parentId,
        },
      );
      return result.message ?? "Arquivo movido.";
    });
  }

  async function trashItem(item: TCloudItem) {
    if (
      !window.confirm(
        `Mover "${item.name}" para a Lixeira?`,
      )
    ) {
      return;
    }

    await runMutation("Movendo para a Lixeira…", async () => {
      const result = await mutationPost(
        "/api/core/files/trash",
        { id: item.id },
      );
      return result.message ?? "Arquivo enviado para a Lixeira.";
    });
  }

  async function restoreItem(item: TCloudItem) {
    await runMutation("Restaurando arquivo…", async () => {
      const result = await mutationPost(
        "/api/core/files/restore",
        { id: item.id },
      );
      return result.message ?? "Arquivo restaurado.";
    });
  }

  function selectDestination(item: TCloudItem) {
    if (!destinationDialog) return;

    if (destinationDialog.mode === "folder") {
      setDestinationDialog(null);
      void createFolderIn(item.id);
      return;
    }

    if (destinationDialog.mode === "upload") {
      openFilePicker(item.id);
      return;
    }

    if (
      destinationDialog.mode === "move" &&
      destinationDialog.item
    ) {
      void moveItem(destinationDialog.item, item.id);
    }
  }

  if (loading) {
    return (
      <main className="rc-fullscreen-state">
        <Cloud size={34} />
        <LoaderCircle className="spin" size={22} />
        <strong>Carregando TCloud…</strong>
      </main>
    );
  }

  if (!status.connected && items.length === 0) {
    return (
      <main className="rc-fullscreen-state">
        <Cloud size={38} />
        <strong>TCloud Core está offline</strong>
        <span>
          Inicie o launcher do TCloud e atualize esta página.
        </span>
        <button onClick={() => void loadAll()} type="button">
          <RefreshCw size={16} />
          Tentar novamente
        </button>
      </main>
    );
  }

  if (status.connected && !auth.authorized) {
    return <TCloudLoginScreen />;
  }

  const emptyText =
    activeNav === "Lixeira"
      ? "A Lixeira está vazia."
      : status.databaseConnected
        ? "Nenhum item encontrado."
        : "Banco de dados offline.";

  const destinationChoices =
    destinationDialog?.mode === "folder"
      ? forumRoots
      : folders.filter(
          (folder) =>
            folder.id !== destinationDialog?.item?.parentId,
        );

  return (
    <main className="tcloud-web-app">
      <input
        ref={fileInputRef}
        className="web-hidden-file-input"
        multiple
        onChange={(event) =>
          void uploadFiles(event.target.files)
        }
        type="file"
      />

      <aside className="web-sidebar tcloud-web-sidebar-polished">
        <div className="web-brand">
          <div className="web-brand-mark">
            <Cloud size={19} strokeWidth={2.2} />
          </div>
          <div>
            <strong>TCloud</strong>
            <span>Web</span>
          </div>
        </div>

        <button className="web-primary-create" onClick={requestNewFolder} type="button">
          <span className="web-primary-create-icon"><Plus size={20} /></span>
          <span>Nova pasta</span>
        </button>

        <nav className="web-nav" aria-label="Navegação principal">
          <span className="web-nav-heading">Navegação</span>
          {navigation.map((label) => (
            <button
              className={activeNav === label ? "is-active" : ""}
              key={label}
              onClick={() => {
                if (label === "Fóruns") {
                  setForumManagerOpen(true);
                  return;
                }

                setActiveNav(label);
                setActiveDevice(null);
                setCurrentFolderId(null);
                setMenuItemId(null);
              }}
              type="button"
            >
              {label === "Arquivos" ? (
                <Folder size={17} />
              ) : label === "Recentes" ? (
                <Clock3 size={17} />
              ) : label === "Favoritos" ? (
                <Star size={17} />
              ) : label === "Disponível offline" ? (
                <CloudDownload size={17} />
              ) : label === "Dispositivos" ? (
                <Smartphone size={17} />
              ) : label === "Lixeira" ? (
                <Trash2 size={17} />
              ) : label === "Atividade" ? (
                <Activity size={17} />
              ) : label === "Duplicados" ? (
                <Copy size={17} />
              ) : label === "Armazenamento" ? (
                <ChartPie size={17} />
              ) : label === "Fóruns" ? (
                <MessagesSquare size={17} />
              ) : (
                <FileText size={17} />
              )}
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="web-sidebar-spacer" />

        <div className="web-storage">
          <div className="web-storage-head">
            <span>Armazenamento</span>
            <span>Telegram</span>
          </div>
          <div className="web-storage-bar">
            <span
              style={{
                width: status.telegramConnected ? "100%" : "0%",
              }}
            />
          </div>
          <small>
            {status.databaseConnected
              ? `${status.filesCount ?? 0} arquivos indexados`
              : "PostgreSQL necessário para indexar"}
          </small>
        </div>

        <button className="web-settings-button" onClick={() => setSettingsOpen(true)} type="button">
          <Settings size={17} />
          <span>Configurações</span>
        </button>
      </aside>

      <section className="web-workspace">
        <header className="web-topbar">
          <div className="web-breadcrumb">
            <LayoutGrid size={17} />
            <ChevronRight size={15} />
            {parentFolder && (
              <>
                <span>{parentFolder.name}</span>
                <ChevronRight size={15} />
              </>
            )}
            <strong>
              {currentFolder?.name ?? activeNav}
            </strong>
          </div>

          <label className="web-search">
            <Search size={17} />
            <input
              aria-label="Pesquisar no TCloud"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar no TCloud"
              value={query}
            />
          </label>

          <div className="rc-status-pills">
            <span
              className={`rc-pill ${
                status.databaseConnected ? "is-ok" : "is-warning"
              }`}
            >
              <HardDrive size={13} />
              {status.databaseConnected ? "PostgreSQL" : "Banco offline"}
            </span>
            <span
              className={`rc-pill ${
                status.telegramConnected ? "is-ok" : "is-warning"
              }`}
            >
              <ShieldCheck size={13} />
              {status.telegramConnected ? "Telegram" : "Telegram offline"}
            </span>
          </div>
        </header>

        <div className="web-commandbar">
          <div className="web-primary-actions">
            {currentFolderId && activeNav === "Arquivos" && (
              <button
                className="rc-back-button"
                onClick={goBack}
                type="button"
              >
                <ArrowLeft size={17} />
                Voltar
              </button>
            )}

            <button
              disabled={
                mutationBusy ||
                activeNav !== "Arquivos" ||
                forumRoots.length === 0
              }
              onClick={requestNewFolder}
              type="button"
            >
              <FolderPlus size={17} />
              Nova pasta
            </button>

            <button
              disabled={
                mutationBusy ||
                activeNav !== "Arquivos" ||
                folders.length === 0
              }
              onClick={requestUpload}
              type="button"
            >
              <Upload size={17} />
              Enviar
            </button>

            <button
              disabled={mutationBusy || activeNav !== "Arquivos"}
              onClick={openForumManager}
              type="button"
            >
              <MessageSquarePlus size={17} />
              Fóruns
            </button>

            
          </div>

          <div className="web-command-spacer" />

          <div className="web-view-toggle" aria-label="Modo de visualização">
            <button
              aria-label="Grade"
              className={view === "grid" ? "is-active" : ""}
              onClick={() => setView("grid")}
              type="button"
            >
              <Grid2X2 size={17} />
            </button>
            <button
              aria-label="Lista"
              className={view === "list" ? "is-active" : ""}
              onClick={() => setView("list")}
              type="button"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        <div className="web-content">
          {activeNav === "Arquivos" && !currentFolder && (
            <section className="web-workspace-hero">
              <div className="web-workspace-hero-copy">
                <span className="web-eyebrow">SEU ESPAÇO NA NUVEM</span>
                <h1>Bom te ver por aqui.</h1>
                <p>Acesse, organize e continue trabalhando de qualquer dispositivo.</p>
                <div className="web-workspace-hero-actions">
                  <button className="is-primary" onClick={requestUpload} type="button"><Upload size={17} /> Enviar arquivos</button>
                  <button onClick={requestNewFolder} type="button"><FolderPlus size={17} /> Nova pasta</button>
                </div>
              </div>
              <div className="web-workspace-summary">
                <div><strong>{visibleItems.length}</strong><span>itens disponíveis</span></div>
                <div><strong>{status.devicesCount ?? 0}</strong><span>dispositivos</span></div>
                <div className={status.connected ? "is-online" : "is-offline"}>
                  <Cloud size={19} /><span>{status.connected ? "Tudo sincronizado" : "Trabalhando offline"}</span>
                </div>
              </div>
            </section>
          )}
          <div className="web-content-heading">
            <div>
              <h1>{currentFolder?.name ?? (activeDevice === "computer" ? "Meu computador" : activeDevice === "phone" ? "Meu telefone" : activeNav)}</h1>
              <p>
                {activeNav === "Arquivos"
                  ? currentFolder
                    ? currentFolder.name.toLocaleLowerCase("pt-BR") === "galeria"
                      ? "Subpastas da galeria, unificadas como no TCloud Mobile."
                      : "Arquivos deste local no TCloud."
                    : "Pastas e fóruns sincronizados pelo Core."
                  : activeNav === "Lixeira"
                    ? "Arquivos removidos podem ser restaurados."
                    : activeNav === "Recentes"
                      ? "Os arquivos modificados mais recentemente em todos os locais."
                      : activeNav === "Favoritos"
                        ? "Seus arquivos marcados para acesso rápido neste navegador."
                        : "Arquivos mantidos neste dispositivo e disponíveis sem rede."}
              </p>
            </div>

            <span className="web-foundation-badge">
              Core {status.version ?? "0.7.0"}
            </span>
          </div>

          {!status.databaseConnected && (
            <div className="rc-warning">
              <HardDrive size={18} />
              <div>
                <strong>PostgreSQL está offline</strong>
                <span>
                  O login funciona, mas as operações precisam do banco ativo.
                </span>
              </div>
            </div>
          )}

          {!status.connected && items.length > 0 && (
            <div className="rc-warning">
              <CloudDownload size={18} />
              <div>
                <strong>Modo offline</strong>
                <span>Mostrando o catálogo salvo. As alterações voltam quando o Core reconectar.</span>
              </div>
              <button type="button" onClick={() => void loadAll()}><RefreshCw size={15} />Tentar novamente</button>
            </div>
          )}

          {(indexMessage || mutationMessage) && (
            <div className="rc-index-message">
              {mutationMessage || indexMessage}
            </div>
          )}

          {activeNav === "Dispositivos" ? (
            <div className="web-device-grid">
              <button type="button" onClick={() => openDeviceRoot("computer")}>
                <span className="web-device-illustration"><HardDrive size={32} /></span>
                <span><b>Meu computador</b><small>Documentos, Área de Trabalho, Imagens e outras pastas do PC</small></span>
                <ChevronRight size={20} />
              </button>
              <button type="button" onClick={() => openDeviceRoot("phone")}>
                <span className="web-device-illustration is-phone"><Smartphone size={32} /></span>
                <span><b>Meu telefone</b><small>Galeria, câmera, vídeos e pastas sincronizadas do Android</small></span>
                <ChevronRight size={20} />
              </button>
              {pairedDevices.map((device) => <article key={device.id}><Smartphone size={18}/><span><b>{device.name}</b><small>{device.platform} · {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString("pt-BR") : "Conectado"}</small></span></article>)}
            </div>
          ) : activeNav === "Atividade" ? (
            <div className="web-insight-list">
              {activityItems.length === 0 ? <div className="web-empty"><Activity size={34} /><strong>Nenhuma atividade registrada.</strong></div> : activityItems.map((entry) => <article key={entry.id}><Activity size={18} /><div><strong>{entry.action.replaceAll(".", " ")}</strong><span>{entry.detail ?? "Operação sincronizada"}</span></div><time>{new Date(entry.createdAt).toLocaleString("pt-BR")}</time></article>)}
            </div>
          ) : activeNav === "Duplicados" ? (
            <div className="web-insight-list">
              {duplicateGroups.length === 0 ? <div className="web-empty"><Copy size={34} /><strong>Nenhuma cópia provável encontrada.</strong></div> : duplicateGroups.map((group) => <article key={group.signature}><Copy size={18} /><div><strong>{group.files[0]?.name ?? "Arquivos duplicados"}</strong><span>{group.files.length} cópias · {formatBytes(group.reclaimableBytes)} recuperáveis</span></div></article>)}
            </div>
          ) : activeNav === "Armazenamento" ? (
            <div className="web-storage-dashboard">
              <article><span>Total</span><strong>{formatBytes(storage?.totalBytes ?? 0)}</strong></article>
              <article><span>Imagens</span><strong>{formatBytes(storage?.imageBytes ?? 0)}</strong></article>
              <article><span>Vídeos</span><strong>{formatBytes(storage?.videoBytes ?? 0)}</strong></article>
              <article><span>Documentos</span><strong>{formatBytes(storage?.documentBytes ?? 0)}</strong></article>
              <section><h2>Maiores arquivos</h2>{(storage?.largestFiles ?? []).slice(0, 12).map((file) => <div key={file.id}><strong>{file.name}</strong><span>{formatBytes(file.size)}</span></div>)}</section>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="web-empty">
              <Cloud size={34} />
              <strong>{emptyText}</strong>
              
            </div>
          ) : view === "grid" ? (
            <div className="web-file-grid">
              {visibleItems.map((item) => {
                const Icon = itemIcon(item.kind);
                const folder = item.kind === "folder";

                return (
                  <article
                    className={`web-file-card ${
                      folder ? "is-folder" : ""
                    }`}
                    key={item.id}
                    onClick={() => openItem(item)}
                    onDoubleClick={() => {
                      if (
                        folder &&
                        activeNav === "Arquivos"
                      ) {
                        setCurrentFolderId(item.id);
                      }
                    }}
                  >
                    <div
                      className="web-file-preview"
                      onPointerEnter={() => !folder && warmWebMedia(item)}
                    >
                      {!folder && item.kind === "image" && !failedThumbnails.has(item.id) ? (
                        <Image
                          alt=""
                          height={240}
                          unoptimized
                          width={320}
                          src={`/api/core/media/${encodeURIComponent(item.id)}`}
                          onError={() => setFailedThumbnails((current) => new Set(current).add(item.id))}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : !folder && item.kind === "video" && !failedThumbnails.has(item.id) ? (
                        <div className="web-video-thumbnail">
                          <Film size={34} strokeWidth={1.5} />
                          <video
                            muted
                            playsInline
                            preload="metadata"
                            src={`/api/core/media/${encodeURIComponent(item.id)}`}
                            onError={() => setFailedThumbnails((current) => new Set(current).add(item.id))}
                          />
                        </div>
                      ) : (
                        <Icon size={38} strokeWidth={1.55} />
                      )}

                      {!folder && (
                        <div className="web-item-menu-wrap">
                          <button
                            aria-label={`Opções de ${item.name}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuItemId(
                                menuItemId === item.id
                                  ? null
                                  : item.id,
                              );
                            }}
                            type="button"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {menuItemId === item.id && (
                            <div className="web-item-menu" onClick={(event) => event.stopPropagation()}>
                              {activeNav === "Lixeira" ? (
                                <button
                                  onClick={() =>
                                    void restoreItem(item)
                                  }
                                  type="button"
                                >
                                  <RotateCcw size={15} />
                                  Restaurar
                                </button>
                              ) : (
                                <>
                                  <button onClick={() => toggleFavorite(item)} type="button">
                                    <Star size={15} fill={favoriteIds.has(item.id) ? "currentColor" : "none"} />
                                    {favoriteIds.has(item.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                  </button>
                                  <button
                                    onClick={() =>
                                      void renameItem(item)
                                    }
                                    type="button"
                                  >
                                    <Pencil size={15} />
                                    Renomear
                                  </button>
                                  <button
                                    onClick={() =>
                                      requestMove(item)
                                    }
                                    type="button"
                                  >
                                    <MoveRight size={15} />
                                    Mover
                                  </button>
                                  <button
                                    className="is-danger"
                                    onClick={() =>
                                      void trashItem(item)
                                    }
                                    type="button"
                                  >
                                    <Trash2 size={15} />
                                    Lixeira
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="web-file-meta">
                      <strong title={item.name}>{item.name}</strong>
                      <span>
                        {folder ? "Pasta" : formatBytes(item.size)}
                        {folder && (item.sourceIds?.length ?? 0) > 1
                          ? ` unificada (${item.sourceIds?.length} origens)`
                          : ""}
                        {" · "}
                        {item.modifiedAt}
                      </span>
                    </div>

                    <div className={`web-sync-state is-${item.syncState}`}>
                      <Cloud size={13} />
                      {syncLabel(item.syncState)}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="web-file-list">
              <div className="web-file-list-head">
                <span>Nome</span>
                <span>Estado</span>
                <span>Modificado</span>
                <span>Tamanho</span>
              </div>

              {visibleItems.map((item) => {
                const Icon = itemIcon(item.kind);
                const folder = item.kind === "folder";

                return (
                  <div
                    className={`web-file-row ${
                      folder ? "is-folder" : ""
                    }`}
                    key={item.id}
                    onClick={() => openItem(item)}
                    onDoubleClick={() => {
                      if (
                        folder &&
                        activeNav === "Arquivos"
                      ) {
                        setCurrentFolderId(item.id);
                      }
                    }}
                  >
                    <div className="web-file-row-name">
                      <Icon size={19} />
                      <strong>{item.name}</strong>

                      {!folder && (
                        <div className="web-list-action-wrap">
                          <button
                            className="web-row-more"
                            onClick={(event) => {
                              event.stopPropagation();
                              setMenuItemId(
                                menuItemId === item.id
                                  ? null
                                  : item.id,
                              );
                            }}
                            type="button"
                          >
                            <MoreHorizontal size={16} />
                          </button>

                          {menuItemId === item.id && (
                            <div className="web-item-menu is-list" onClick={(event) => event.stopPropagation()}>
                              {activeNav === "Lixeira" ? (
                                <button
                                  onClick={() =>
                                    void restoreItem(item)
                                  }
                                  type="button"
                                >
                                  <RotateCcw size={15} />
                                  Restaurar
                                </button>
                              ) : (
                                <>
                                  <button onClick={() => toggleFavorite(item)} type="button">
                                    <Star size={15} fill={favoriteIds.has(item.id) ? "currentColor" : "none"} />
                                    {favoriteIds.has(item.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                  </button>
                                  <button
                                    onClick={() =>
                                      void renameItem(item)
                                    }
                                    type="button"
                                  >
                                    <Pencil size={15} />
                                    Renomear
                                  </button>
                                  <button
                                    onClick={() =>
                                      requestMove(item)
                                    }
                                    type="button"
                                  >
                                    <MoveRight size={15} />
                                    Mover
                                  </button>
                                  <button
                                    className="is-danger"
                                    onClick={() =>
                                      void trashItem(item)
                                    }
                                    type="button"
                                  >
                                    <Trash2 size={15} />
                                    Lixeira
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <span>{syncLabel(item.syncState)}</span>
                    <span>{item.modifiedAt}</span>
                    <span>
                      {folder ? "—" : formatBytes(item.size)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="web-statusbar">
          <span>
            {visibleItems.length}{" "}
            {visibleItems.length === 1 ? "item" : "itens"}
          </span>
          <button
            type="button"
            disabled={!indexStatus.queueReady || indexBusy}
            onClick={() => void startIndex()}
          >
            <RefreshCw className={indexBusy ? "spin" : undefined} size={14} />
            {indexBusy ? "Atualizando…" : "Atualizar agora"}
          </button>
          <span>
            Atualização automática ativa · Último índice:{" "}
            {indexStatus.lastStatus ?? "ainda não executado"}
          </span>
        </footer>

        {settingsOpen && (
          <div className="tc-settings-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}>
            <section className="tc-settings-modal web-settings-panel" role="dialog" aria-modal="true" aria-label="Configurações do TCloud" onMouseDown={(event) => event.stopPropagation()}>
              <header className="tc-settings-modal-header">
                <div><h2>Preferências</h2><p>Conta, dispositivos e aparência</p></div>
                <button className="tc-settings-close" type="button" aria-label="Fechar" onClick={() => setSettingsOpen(false)}><X size={18} /></button>
              </header>
              <TCloudThemeControl />
              <div className="web-settings-health">
                <strong>Status avançado</strong>
                <span>Core: {status.connected ? "conectado" : "offline"}</span>
                <span>Telegram: {status.telegramConnected ? "conectado" : "offline"}</span>
                <span>Banco: {status.databaseConnected ? "conectado" : "offline"}</span>
                <span>Cache local: {items.length} itens disponíveis</span>
                <button type="button" onClick={() => void loadAll()}><RefreshCw size={15} />Verificar e atualizar</button>
              </div>
              <div className="web-settings-health web-pairing-card">
                <strong><Smartphone size={17} /> Conta e dispositivos</strong>
                <span>Gere um código temporário no Web e informe-o no celular ou desktop. O segredo mestre nunca sai do servidor.</span>
                {pairingCode && (
                  <div className="web-pairing-code">
                    <div className="web-pairing-qr" aria-label="QR Code para conectar o aplicativo">
                      <QRCodeSVG
                        value={`tcloud://pair?code=${encodeURIComponent(pairingCode.code)}`}
                        size={184}
                        level="M"
                        marginSize={2}
                      />
                    </div>
                    <small>Escaneie pelo TCloud Mobile</small>
                    <b>{pairingCode.code}</b>
                    <small>Ou digite o código · expira às {new Date(pairingCode.expiresAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>
                  </div>
                )}
                <button type="button" disabled={pairingBusy} onClick={() => void generatePairingCode()}>
                  <ShieldCheck size={15} />{pairingBusy ? "Gerando…" : "Conectar novo dispositivo"}
                </button>
                <div className="web-device-list">
                  {pairedDevices.map((device) => (
                    <div key={device.id}>
                      <span><b>{device.name}</b><small>{device.platform}{device.appVersion ? ` · ${device.appVersion}` : ""}</small></span>
                      <button type="button" onClick={() => void revokePairedDevice(device.id)}>Remover</button>
                    </div>
                  ))}
                  {pairedDevices.length === 0 && <small>Nenhum aparelho pareado ainda.</small>}
                </div>
              </div>
            </section>
          </div>
        )}

        {previewItem && (
          <div className="web-viewer-backdrop" role="presentation" onMouseDown={() => setPreviewItem(null)}>
            <section className="web-viewer" role="dialog" aria-modal="true" aria-label={`Visualizar ${previewItem.name}`} onMouseDown={(event) => event.stopPropagation()}>
              <header>
                <div>
                  {previewItem.kind === "image" ? <FileImage size={20} /> : previewItem.kind === "video" ? <Film size={20} /> : <FileText size={20} />}
                  <span><strong>{previewItem.name}</strong><small>{formatBytes(previewItem.size)}</small></span>
                </div>
                <div className="web-viewer-actions">
                  <a href={`/api/core/media/${encodeURIComponent(previewItem.id)}`} download={previewItem.name} title="Baixar arquivo"><CloudDownload size={18} /></a>
                  <button type="button" aria-label="Fechar visualizador" onClick={() => setPreviewItem(null)}><X size={20} /></button>
                </div>
              </header>
              <div className="web-viewer-stage">
                {mediaError ? (
                  <div className="web-viewer-error">
                    <CloudDownload size={40} />
                    <strong>Não foi possível abrir esta mídia</strong>
                    <span>O arquivo pode ainda estar sendo recuperado do Telegram.</span>
                    <button type="button" onClick={() => { setMediaError(false); setMediaRetry((value) => value + 1); }}><RefreshCw size={16} />Tentar novamente</button>
                  </div>
                ) : previewItem.kind === "image" ? (
                  <Image
                    key={`${previewItem.id}:${mediaRetry}`}
                    alt={previewItem.name}
                    width={1600}
                    height={1200}
                    unoptimized
                    priority
                    src={`/api/core/media/${encodeURIComponent(previewItem.id)}?retry=${mediaRetry}`}
                    onError={() => setMediaError(true)}
                  />
                ) : previewItem.kind === "video" ? (
                  <video
                    key={`${previewItem.id}:${mediaRetry}`}
                    controls
                    autoPlay
                    playsInline
                    preload="auto"
                    src={`/api/core/media/${encodeURIComponent(previewItem.id)}?retry=${mediaRetry}`}
                    onError={() => setMediaError(true)}
                  />
                ) : (
                  <div className="web-viewer-error">
                    <FileText size={48} />
                    <strong>Visualização não disponível</strong>
                    <span>Baixe o arquivo para abri-lo no aplicativo correspondente.</span>
                    <a className="web-viewer-download" href={`/api/core/media/${encodeURIComponent(previewItem.id)}`} download={previewItem.name}><CloudDownload size={16} />Baixar arquivo</a>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {destinationDialog && (
          <div className="web-mutation-overlay">
            <section className="web-mutation-dialog">
              <header>
                <div>
                  <strong>
                    {destinationDialog.mode === "folder"
                      ? "Criar pasta em qual fórum?"
                      : destinationDialog.mode === "upload"
                        ? "Enviar para onde?"
                        : "Mover para onde?"}
                  </strong>
                  <span>
                    Escolha um destino do TCloud.
                  </span>
                </div>
                <button
                  aria-label="Fechar"
                  onClick={() =>
                    setDestinationDialog(null)
                  }
                  type="button"
                >
                  <X size={17} />
                </button>
              </header>

              <div className="web-destination-list">
                {destinationChoices.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() =>
                      selectDestination(folder)
                    }
                    type="button"
                  >
                    <Folder size={18} />
                    <span>
                      <strong>{folder.name}</strong>
                      <small>
                        {folder.parentId
                          ? folderMap.get(folder.parentId)?.name ??
                            "TCloud"
                          : "Pasta principal"}
                      </small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        <TCloudForumManager
          open={forumManagerOpen}
          onClose={() => setForumManagerOpen(false)}
          onChanged={() => void loadAll()}
        />
        {mutationBusy && (
          <div className="web-mutation-busy" aria-live="polite">
            <LoaderCircle className="spin" size={17} />
            <span>{mutationMessage || "Processando…"}</span>
          </div>
        )}
      </section>
    </main>
  );
}
