const coreUrl =
  process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(
      `${coreUrl}/api/v1/trash`,
      { cache: "no-store" },
    );

    const data = await response.json().catch(() => []);

    return Response.json(data, {
      status: response.status,
    });
  } catch {
    return Response.json([], { status: 503 });
  }
}