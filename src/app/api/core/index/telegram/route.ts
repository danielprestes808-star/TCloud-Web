import { coreFetch } from "@/lib/tcloudCoreServer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const response = await coreFetch(
      "/api/v1/index/telegram",
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
