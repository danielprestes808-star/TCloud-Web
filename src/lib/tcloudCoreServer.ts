import "server-only";

import { cookies } from "next/headers";

export const TCLOUD_SESSION_COOKIE = "tcloud_session";

const CORE_URL = (
  process.env.TCLOUD_CORE_URL ?? "http://127.0.0.1:8787"
).replace(/\/+$/, "");

function adminApiToken() {
  const token = process.env.TCLOUD_API_TOKEN?.trim();
  if (!token && process.env.VERCEL) {
    throw new Error("TCLOUD_API_TOKEN não está configurado na Vercel.");
  }
  return token;
}

export function coreUrl(path: string) {
  return `${CORE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function coreHeaders(initial?: HeadersInit, token?: string) {
  const headers = new Headers(initial);
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

export async function coreFetch(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(TCLOUD_SESSION_COOKIE)?.value;

  return fetch(coreUrl(path), {
    ...init,
    headers: coreHeaders(init.headers, token),
  });
}

export function corePublicFetch(path: string, init: RequestInit = {}) {
  return fetch(coreUrl(path), {
    ...init,
    headers: coreHeaders(init.headers),
  });
}

export function coreAdminFetch(path: string, init: RequestInit = {}) {
  return fetch(coreUrl(path), {
    ...init,
    headers: coreHeaders(init.headers, adminApiToken()),
  });
}
