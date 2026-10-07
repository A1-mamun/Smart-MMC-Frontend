"use client";

/**
 * Free-class landing page — decides what to render based on the
 * current auth state:
 *
 *   - Free student already logged in (`user.isFreeAccount` truthy)
 *     → content (FreeClassViewer).
 *   - Logged in but NOT a free account (paid student, admin) →
 *     a CTA card linking to the dedicated signup page.
 *   - Anonymous → soft loading splash while we wait for the
 *     proxy/server-side redirect to `/free-classes/signin` to
 *     land.
 *
 * IMPORTANT: We intentionally do NOT run a client-side
 * `router.replace` here. The server-side `proxy.ts` already
 * bounces anonymous visitors to `/free-classes/signin`, and
 * running a client-side redirect alongside the proxy's
 * server-side redirect creates a redirect loop when the user
 * has a valid refresh-token cookie but the redux-persist
 * `auth` slice hasn't rehydrated yet — the proxy would then
 * see the cookie on `/free-classes/signin` and bounce the
 * signed-in free student right back to `/free-classes`.
 */

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";

import FreeClassViewer from "./FreeClassViewer";

const FreeClassLanding = () => {
  const user = useAppSelector(useCurrentUser);
  // Defensive timeout for the `!user` branch. The proxy should
  // bounce truly-anonymous visitors to `/free-classes/signin`
  // before this component ever renders, so seeing `user === null`
  // here usually means the cookie is stale (cleared localStorage
  // but the refresh-token cookie is still around). We wait a
  // brief moment in case redux-persist is still rehydrating, then
  // surface a clear "session expired" card with a sign-in link.
  // Without this, the page just spins forever — the symptom the
  // user reported as "loading spinner all the time".
  const [staleSession, setStaleSession] = useState(false);
  useEffect(() => {
    if (user) {
      setStaleSession(false);
      return;
    }
    const t = window.setTimeout(() => setStaleSession(true), 1_500);
    return () => window.clearTimeout(t);
  }, [user]);

  if (staleSession) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-2 shadow-xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <CardTitle className="text-2xl">Sign in to continue</CardTitle>
            <CardDescription>
              Your session has expired or is no longer valid. Sign in to
              access your free classes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="/free-classes/signin"
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto flex min-h-100 items-center justify-center px-4 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Free student already signed up → straight to the content.
  if (user.isFreeAccount) {
    return (
      <div className="container mx-auto px-4 py-8">
        <FreeClassViewer welcomeName={user.name} />
      </div>
    );
  }

  // Logged in but NOT a free account (paid student, admin) →
  // show a short card with a CTA. We don't auto-redirect because
  // the user might want to back out and use the dashboard instead.
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Free classes signup</CardTitle>
          <CardDescription>
            You&apos;re signed in to the dashboard, but you haven&apos;t signed
            up for free classes yet. Free classes need their own account —
            your mobile number is your login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a
            href="/free-classes/signup"
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign up for free classes
          </a>
        </CardContent>
      </Card>
    </div>
  );
};

export default FreeClassLanding;