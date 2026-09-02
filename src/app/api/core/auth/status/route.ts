import { coreFetch } from "@/lib/tcloudCoreServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await coreFetch(
      "/api/v1/auth/status",
      { cache: "no-store" },
    );

    const data = await response.json();

    return Response.json(data, {
      status: response.status,
    });
  } catch {
    return Response.json(
      {
        connected: false,
        authorized: false,
        stage: "core-offline",
        message: "TCloud Core não está em execução.",
      },
      { status: 503 },
    );
  }
}
