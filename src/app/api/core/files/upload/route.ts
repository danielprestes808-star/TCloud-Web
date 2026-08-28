const coreUrl =
  process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787";

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
    const body = await request.arrayBuffer();

    if (body.byteLength === 0) {
      return Response.json(
        { ok: false, message: "Arquivo vazio." },
        { status: 400 },
      );
    }

    const response = await fetch(`${coreUrl}/api/v1/files/upload`, {
      method: "POST",
      headers: {
        "content-type": contentType,
        "x-tcloud-parent-id": parentId,
        "x-tcloud-file-name": fileName,
      },
      body,
      cache: "no-store",
    });

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