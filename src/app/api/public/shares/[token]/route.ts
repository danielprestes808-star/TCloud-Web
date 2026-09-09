import { coreFetch } from "@/lib/tcloudCoreServer";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const response = await coreFetch(`/api/v1/public/shares/${encodeURIComponent(token)}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: await request.text(),
  });
  return new Response(response.body, { status: response.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
