"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { syncProfileFromDB } from "@/lib/db-user";
import { syncAllToolsToLocalStorage } from "@/lib/db-tools";
import { isOnboarded } from "@/lib/onboard";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, user, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = searchParams.get("redirectTo") || "/dashboard-v2";

  useEffect(() => {
    if (!loading && user) {
      router.replace(isOnboarded() ? redirectTo : "/onboard");
    }
  }, [user, loading, router, redirectTo]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim() || submitting) return;

    setError(null);
    setSubmitting(true);

    const { error: authError } = await signIn(email.trim(), password.trim());

    if (authError) {
      setError(authError);
      setSubmitting(false);
      return;
    }

    await syncProfileFromDB();
    await syncAllToolsToLocalStorage();

    router.replace(redirectTo);
  }

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col justify-center py-12">
      <Container narrow>
        <div className="max-w-sm mx-auto">
          <div className="mb-8">
            <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
              <span className="w-5 h-px bg-border-strong" aria-hidden="true" />
              Sign in
            </p>
            <h1 className="heading-section text-2xl md:text-3xl text-balance mb-2">
              Welcome back.
            </h1>
            <p className="text-ink-secondary text-sm">
              Sign in to access your saved progress across all devices.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@startup.com"
                className={INPUT_BASE}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={INPUT_BASE}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-xs text-danger font-medium bg-danger/10 border border-danger/20 rounded-[var(--radius-md)] px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={!email.trim() || !password.trim() || submitting}
              className="w-full h-12 text-sm mt-2"
            >
              {submitting ? "Signing in…" : "Sign in →"}
            </Button>

            <p className="text-xs text-muted text-center pt-2">
              No account yet?{" "}
              <Link href="/onboard" className="underline hover:text-ink transition-colors">
                Create one during onboarding →
              </Link>
            </p>
          </form>
        </div>
      </Container>
    </div>
  );
}

const INPUT_BASE =
  "w-full h-12 px-4 text-sm bg-card border border-border rounded-[var(--radius-md)] " +
  "text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 " +
  "focus:border-accent/50 transition-colors";