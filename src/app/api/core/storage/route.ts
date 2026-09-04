import { coreFetch } from "@/lib/tcloudCoreServer";
export const dynamic = "force-dynamic";
export async function GET() {
  try { const response = await coreFetch("/api/v1/storage/breakdown", { cache: "no-store" }); return Response.json(await response.json(), { status: response.status }); }
  catch { return Response.json({ totalBytes: 0, largestFiles: [] }, { status: 503 }); }
}
