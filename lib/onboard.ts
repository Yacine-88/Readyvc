/**
 * Founder onboarding profile — stored in localStorage.
 * No auth required. Used to personalise the analysis and gate tool access.
 */

export interface FounderProfile {
  name: string
  email: string
  startupName: string
  country: string
  sector: string
  stage: string
  hasRaisedBefore: boolean
  createdAt: string
}

const KEY = "vcready_founder"

export function getFounderProfile(): FounderProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as FounderProfile) : null
  } catch {
    return null
  }
}

export function saveFounderProfile(
  profile: Omit<FounderProfile, "createdAt">
): void {
  if (typeof window === "undefined") return
  const full: FounderProfile = { ...profile, createdAt: new Date().toISOString() }
  localStorage.setItem(KEY, JSON.stringify(full))
}

export function isOnboarded(): boolean {
  return getFounderProfile() !== null
}
