import { coreFetch } from "@/lib/tcloudCoreServer";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const response = await coreFetch("/api/v1/devices/revoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(await request.json()),
    });
    return Response.json(await response.json(), { status: response.status });
  } catch {
    return Response.json({ ok: false, message: "TCloud Core offline." }, { status: 503 });
  }
}
