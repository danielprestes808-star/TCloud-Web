import { coreFetch } from "@/lib/tcloudCoreServer";

export async function GET(request: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  const access = new URL(request.url).searchParams.get("access") ?? "";
  const range = request.headers.get("range");
  const response = await coreFetch(`/api/v1/public/shares/${encodeURIComponent(token)}/media/${encodeURIComponent(id)}?access=${encodeURIComponent(access)}`, {
    headers: range ? { range } : undefined,
  });
  const headers = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges"]) {
    const value = response.headers.get(name); if (value) headers.set(name, value);
  }
  headers.set("cache-control", "private, max-age=3600");
  return new Response(response.body, { status: response.status, headers });
}
