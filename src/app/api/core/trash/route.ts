import { coreFetch } from "@/lib/tcloudCoreServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await coreFetch(
      "/api/v1/trash",
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
