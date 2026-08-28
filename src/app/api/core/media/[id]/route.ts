const coreUrl = process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function copyHeader(from: Headers, to: Headers, name: string) {
  const value = from.get(name);
  if (value) to.set(name, value);
}

async function proxyMedia(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const upstreamHeaders = new Headers();

  const range = request.headers.get("range");
  if (range) upstreamHeaders.set("range", range);

  const ifRange = request.headers.get("if-range");
  if (ifRange) upstreamHeaders.set("if-range", ifRange);

  let upstream: Response;
  try {
    upstream = await fetch(
      `${coreUrl}/api/v1/media/${encodeURIComponent(id)}`,
      {
        method: request.method === "HEAD" ? "HEAD" : "GET",
        headers: upstreamHeaders,
        cache: "no-store",
        signal: request.signal,
      },
    );
  } catch {
    return Response.json(
      { ok: false, message: "TCloud Core não está em execução." },
      { status: 503 },
    );
  }

  const headers = new Headers();
  copyHeader(upstream.headers, headers, "content-type");
  copyHeader(upstream.headers, headers, "content-length");
  copyHeader(upstream.headers, headers, "content-range");
  copyHeader(upstream.headers, headers, "accept-ranges");
  copyHeader(upstream.headers, headers, "cache-control");
  copyHeader(upstream.headers, headers, "etag");
  copyHeader(upstream.headers, headers, "last-modified");

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export async function GET(request: Request, context: RouteContext) {
  return proxyMedia(request, context);
}

export async function HEAD(request: Request, context: RouteContext) {
  return proxyMedia(request, context);
}