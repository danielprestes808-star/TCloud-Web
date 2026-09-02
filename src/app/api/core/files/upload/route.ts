import { coreFetch } from "@/lib/tcloudCoreServer";

const MAX_VERCEL_UPLOAD_BYTES = 4 * 1024 * 1024;

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const parentId =
      request.headers.get("x-tcloud-parent-id")?.trim() ?? "";
    const fileName =
      request.headers.get("x-tcloud-file-name")?.trim() ?? "";

    if (!parentId || !fileName) {
      return Response.json(
        {
          ok: false,
          message:
            "x-tcloud-parent-id e x-tcloud-file-name são obrigatórios.",
        },
        { status: 400 },
      );
    }

    const contentType =
      request.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = Number(request.headers.get("content-length"));

    if (!Number.isSafeInteger(contentLength) || contentLength <= 0) {
      return Response.json(
        { ok: false, message: "Tamanho do arquivo ausente ou inválido." },
        { status: 411 },
      );
    }

    if (contentLength > MAX_VERCEL_UPLOAD_BYTES) {
      return Response.json(
        {
          ok: false,
          message: "O envio pela Web aceita até 4 MB. Use o desktop ou mobile para arquivos maiores.",
        },
        { status: 413 },
      );
    }

    if (!request.body) {
      return Response.json(
        { ok: false, message: "Arquivo vazio." },
        { status: 400 },
      );
    }

    const uploadInit: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers: {
        "content-type": contentType,
        "content-length": String(contentLength),
        "x-tcloud-parent-id": parentId,
        "x-tcloud-file-name": fileName,
      },
      body: request.body,
      duplex: "half",
      cache: "no-store",
    };

    const response = await coreFetch("/api/v1/files/upload", uploadInit);

    const data = await response.json().catch(() => ({
      ok: false,
      message: "Resposta inválida do TCloud Core.",
    }));

    return Response.json(data, {
      status: response.status,
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return Response.json(
      { ok: false, message: "TCloud Core não está em execução." },
      { status: 503 },
    );
  }
}
