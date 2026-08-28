const coreUrl =
  process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetch(`${coreUrl}/api/v1/forums/delete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({
      ok: false,
      message: "Resposta inválida do TCloud Core.",
    }));

    return Response.json(data, { status: response.status });
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