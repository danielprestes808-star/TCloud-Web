import "server-only";

const CORE_URL = (
  process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787"
).replace(/\/+$/, "");

function apiToken() {
  const token = process.env.TCLOUD_API_TOKEN?.trim();
  if (!token && process.env.VERCEL) {
    throw new Error("TCLOUD_API_TOKEN não está configurado na Vercel.");
  }
  return token;
}

export function coreUrl(path: string) {
  return `${CORE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function coreHeaders(initial?: HeadersInit) {
  const headers = new Headers(initial);
  const token = apiToken();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

export function coreFetch(path: string, init: RequestInit = {}) {
  return fetch(coreUrl(path), {
    ...init,
    headers: coreHeaders(init.headers),
  });
}
