const coreUrl =
  process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(
      `${coreUrl}/api/v1/platform/capabilities`,
      { cache: "no-store" },
    );
    const data = await response.json();
    return Response.json(data, {
      status: response.status,
      headers: {
        "cache-control": "private, max-age=30",
      },
    });
  } catch {
    return Response.json(
      {
        foundation: "5.0",
        apiVersion: "v1",
        coreVersion: "0.7.0",
        connected: false,
      },
      { status: 503 },
    );
  }
}