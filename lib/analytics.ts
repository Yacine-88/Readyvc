/**
 * Centralized PostHog analytics helpers.
 * All functions are safe to call in SSR (guarded by `typeof window`) and
 * silently no-op if PostHog is not initialised or throws.
 */

import posthog from "posthog-js";

export type EventProperties = Record<string, unknown>;

export function track(event: string, properties?: EventProperties): void {
  if (typeof window === "undefined") return;
  try { posthog.capture(event, properties); } catch {}
}

export function identify(userId: string, traits?: EventProperties): void {
  if (typeof window === "undefined") return;
  try { posthog.identify(userId, traits); } catch {}
}

export function resetIdentity(): void {
  if (typeof window === "undefined") return;
  try { posthog.reset(); } catch {}
}
