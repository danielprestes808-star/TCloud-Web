const coreUrl =
  process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(`${coreUrl}/api/v1/live/revision`, {
      cache: "no-store",
    });

    const text = await response.text();

    return new Response(text, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch {
    return Response.json(
      { ok: false, message: "TCloud Core não está em execução." },
      { status: 503 },
    );
  }
}