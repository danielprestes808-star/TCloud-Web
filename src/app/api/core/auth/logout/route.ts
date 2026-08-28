const coreUrl =
  process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(
      `${coreUrl}/api/v1/auth/logout`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

    const data = await response.json();

    return Response.json(data, {
      status: response.status,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        accepted: false,
        authorized: false,
        stage: "core-offline",
        message: "TCloud Core não está em execução.",
      },
      { status: 503 },
    );
  }
}