"use client";

import { useEffect, useRef } from "react";

function stableRevision(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function TCloudLiveRefresh() {
  const firstRevision = useRef<string | null>(null);
  const reloading = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const poll = async () => {
      try {
        const response = await fetch("/api/core/live/revision", {
          cache: "no-store",
        });

        if (!response.ok || cancelled) return;

        const data = await response.json().catch(async () => {
          const text = await response.text().catch(() => "");
          return text;
        });

        const revision = stableRevision(data);
        if (!revision) return;

        if (firstRevision.current === null) {
          firstRevision.current = revision;
          return;
        }

        if (
          firstRevision.current !== revision &&
          !reloading.current &&
          document.visibilityState === "visible"
        ) {
          reloading.current = true;
          window.location.reload();
        }
      } catch {
        // Core may be restarting; the next poll retries automatically.
      }
    };

    const schedule = () => {
      timer = window.setInterval(() => {
        void poll();
      }, 2000);
    };

    void poll();
    schedule();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void poll();
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}