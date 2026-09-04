import { coreFetch } from "@/lib/tcloudCoreServer";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  try { const response = await coreFetch(`/api/v1/files/search?q=${encodeURIComponent(query)}`, { cache: "no-store" }); return Response.json(await response.json(), { status: response.status }); }
  catch { return Response.json([], { status: 503 }); }
}
