import { coreFetch } from "@/lib/tcloudCoreServer";
export const dynamic = "force-dynamic";
export async function GET() {
  try { const response = await coreFetch("/api/v1/activity", { cache: "no-store" }); return Response.json(await response.json(), { status: response.status }); }
  catch { return Response.json([], { status: 503 }); }
}
