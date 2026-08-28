const coreUrl =
  process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(`${coreUrl}/api/v1/files`, {
      cache: "no-store",
    });

    const data = await response.json().catch(() => []);
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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const parentId =
      typeof body.parentId === "string" ? body.parentId.trim() : "";
    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    if (!parentId || !name) {
      return Response.json(
        {
          ok: false,
          message: "parentId e name são obrigatórios para criar uma pasta.",
        },
        { status: 400 },
      );
    }

    const response = await fetch(`${coreUrl}/api/v1/folders`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parentId, name }),
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