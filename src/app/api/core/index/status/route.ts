const coreUrl =
  process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(
      `${coreUrl}/api/v1/index/status`,
      { cache: "no-store" },
    );

    const data = await response.json();

    return Response.json(data, {
      status: response.status,
    });
  } catch {
    return Response.json(
      {
        connected: false,
        authorized: false,
        stage: "core-offline",
        message: "TCloud Core não está em execução.",
      },
      { status: 503 },
    );
  }
}