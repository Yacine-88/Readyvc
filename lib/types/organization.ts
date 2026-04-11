/**
 * Organization (B2B) types
 *
 * Defines the data contract for incubators, accelerators, and other
 * institutional accounts that will manage cohorts of founders.
 *
 * Nothing is implemented yet — this shapes the schema and prevents
 * blocking decisions when B2B is built.
 *
 * Planned flow:
 *   Organization created → members invited → founders join via org invite link
 *   → founders' tool data visible to org admins (with consent)
 *   → org on a subscription plan that gates feature access
 */

// ─── Subscription ─────────────────────────────────────────────────────────────

export type SubscriptionTier =
  | "free"      // Individual founders — current default
  | "starter"   // Small incubator / cohort < 20
  | "growth"    // Mid-size accelerator / cohort 20–100
  | "enterprise"; // Large institution / unlimited cohort

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  /** Max founders in org. null = unlimited */
  maxMembers: number | null;
  /** Feature flags unlocked on this plan */
  features: OrgFeature[];
}

export type OrgFeature =
  | "cohort_dashboard"      // Aggregate readiness scores across founders
  | "founder_exports"       // Export founder data to CSV/PDF
  | "investor_matching"     // Access to investor matching for cohort
  | "expert_network"        // Book expert sessions for cohort members
  | "white_label"           // Custom branding
  | "api_access";           // Programmatic data access

// ─── Organization ─────────────────────────────────────────────────────────────

export type OrgType = "incubator" | "accelerator" | "vc_fund" | "university" | "other";

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  website?: string;
  logoUrl?: string;

  subscription: SubscriptionTier;
  /** ISO date of subscription expiry, null = no expiry (enterprise) */
  subscriptionExpiresAt: string | null;

  createdAt: string;
}

// ─── Membership ───────────────────────────────────────────────────────────────

export type OrgMemberRole =
  | "owner"   // Full control: billing, members, settings
  | "admin"   // Manage members, view all founder data
  | "coach";  // View assigned founders only

export interface OrgMember {
  userId: string;
  orgId: string;
  role: OrgMemberRole;
  joinedAt: string;
}

// ─── Org invite ───────────────────────────────────────────────────────────────
// Founders join an org by following an invite link containing a token.

export interface OrgInvite {
  token: string;
  orgId: string;
  /** If set, the invite is scoped to this email only */
  email?: string;
  expiresAt: string;
  usedAt: string | null;
}
