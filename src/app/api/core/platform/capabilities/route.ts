import { coreFetch } from "@/lib/tcloudCoreServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await coreFetch(
      "/api/v1/platform/capabilities",
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
