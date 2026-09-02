import { coreFetch } from "@/lib/tcloudCoreServer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await coreFetch(
      "/api/v1/files/restore",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => ({
      ok: false,
      message: "Resposta inválida do TCloud Core.",
    }));

    return Response.json(data, {
      status: response.status,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        message: "TCloud Core não está em execução.",
      },
      { status: 503 },
    );
  }
}
