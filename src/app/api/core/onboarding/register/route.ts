import { cookies } from "next/headers";

import {
  coreFetch,
  corePublicFetch,
  TCLOUD_SESSION_COOKIE,
} from "@/lib/tcloudCoreServer";

export const dynamic = "force-dynamic";

type OnboardingResponse = {
  ok?: boolean;
  token?: string;
  expiresAt?: string;
  message?: string;
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.has(TCLOUD_SESSION_COOKIE)) {
      const status = await coreFetch("/api/v1/auth/status", {
        cache: "no-store",
      });
      if (status.ok) {
        return Response.json({ ok: true, existing: true });
      }
      cookieStore.delete(TCLOUD_SESSION_COOKIE);
    }

    const supplied = await request.json().catch(() => ({}));
    const body = {
      deviceName: String(supplied.deviceName || "Navegador Web"),
      platform: "web",
      appVersion: String(supplied.appVersion || "0.3.7"),
    };
    const response = await corePublicFetch("/api/v1/onboarding/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await response.json()) as OnboardingResponse;

    if (!response.ok || !data.token) {
      return Response.json(data, { status: response.status });
    }

    const expires = data.expiresAt ? new Date(data.expiresAt) : undefined;
    cookieStore.set(TCLOUD_SESSION_COOKIE, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires,
      priority: "high",
    });

    return Response.json({ ok: true, expiresAt: data.expiresAt });
  } catch {
    return Response.json(
      { ok: false, message: "Não foi possível iniciar sua conta TCloud." },
      { status: 503 },
    );
  }
}
