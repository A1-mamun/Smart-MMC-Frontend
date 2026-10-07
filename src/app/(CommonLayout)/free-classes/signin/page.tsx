import { Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import FreeClassLoginForm from "@/components/modules/freeClass/FreeClassLoginForm";

/**
 * Dedicated signin page for the free-class flow.
 *
 * Wraps `FreeClassLoginForm` in the marketing card chrome. The form
 * itself is responsible for:
 *   - pushing the user to `/free-classes/signup` when the backend
 *     says the account doesn't exist (404 from /free-class/login
 *     or /auth/sign-in)
 *
 * Note: We do NOT handle "already signed in" bounces here — the
 * middleware already redirects signed-in free-account users to
 * `/free-classes` (their content home) and signed-in paid/admin
 * users are allowed to access this page so they can sign in to a
 * free account on their existing mobile.
 */
const FreeClassSigninPage = () => {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl border-2 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Sign in to free classes</CardTitle>
          <CardDescription>
            Try our chapter-by-chapter video classes — your mobile number is
            your login. New here? Sign up first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FreeClassLoginForm />
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

export default FreeClassSigninPage;