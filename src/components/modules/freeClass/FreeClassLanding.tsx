"use client";

/**
 * 3-state free-class page:
 *   - Anonymous → tabs to toggle between signup and sign-in forms
 *   - Logged in → FreeClassContentPage (tabs + accordion + video modal)
 *
 * Wraps the content area in a lighter chrome (no admin sidebar) — the
 * page sits under `(CommonLayout)` so the regular site Navbar/Footer
 * surround it. The navbar's "Free Classes" button links here for
 * everyone; the page decides what to show.
 */

import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";

import FreeClassLoginForm from "./FreeClassLoginForm";
import FreeClassSignupForm from "./FreeClassSignupForm";
import FreeClassViewer from "./FreeClassViewer";

const FreeClassLanding = () => {
  const user = useAppSelector(useCurrentUser);
  const isHydrating = user === undefined;

  // While redux-persist is rehydrating the auth slice from localStorage,
  // `user` is `undefined`. We render a soft loading splash — once it
  // resolves to a real User (or stays null) we render the matching view.
  if (isHydrating) {
    return (
      <div className="container mx-auto flex min-h-[400px] items-center justify-center px-4 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    // Logged-in view: free student or paid student preview.
    return (
      <div className="container mx-auto px-4 py-8">
        <FreeClassViewer welcomeName={user.name} />
      </div>
    );
  }

  // Anonymous: toggle between Sign up and Sign in inline.
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl border-2 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Free HSC classes</CardTitle>
          <CardDescription>
            Try our chapter-by-chapter video classes — your mobile number is
            your login. New here? Sign up below. Already signed up? Sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signup" className="space-y-4">
            <TabsList className="grid h-auto w-full grid-cols-2">
              <TabsTrigger value="signup" className="py-2.5">
                Sign up
              </TabsTrigger>
              <TabsTrigger value="signin" className="py-2.5">
                Sign in
              </TabsTrigger>
            </TabsList>
            <TabsContent value="signup" className="mt-4">
              <FreeClassSignupForm />
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Already signed up?{" "}
                <button
                  type="button"
                  className="font-medium text-primary hover:underline"
                  // Switching tabs is handled by Radix Tabs itself; we
                  // simply nudge the user back via the tab above. The
                  // button is here for accessibility / scanability.
                >
                  Switch to Sign in
                </button>
                .
              </p>
            </TabsContent>
            <TabsContent value="signin" className="mt-4">
              <FreeClassLoginForm />
            </TabsContent>
          </Tabs>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Just curious?{" "}
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <a href="/">Back to home</a>
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FreeClassLanding;