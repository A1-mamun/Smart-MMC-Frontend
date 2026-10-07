import { Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import FreeClassSignupForm from "@/components/modules/freeClass/FreeClassSignupForm";

/**
 * Dedicated signup page for the free-class flow.
 *
 * Wraps `FreeClassSignupForm` in the marketing card chrome. The form
 * itself is responsible for:
 *   - redirecting to `/free-classes/signin` after success
 *
 * The "Sign in here" link below the form lets a returning user
 * jump to the signin page.
 */
const FreeClassSignupPage = () => {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-2xl border-2 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Sign up for free HSC classes</CardTitle>
          <CardDescription>
            Sign up for free access to chapter-by-chapter video classes. Your
            mobile number is your login ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FreeClassSignupForm />
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already signed up?{" "}
            <Button asChild variant="link" className="h-auto p-0 text-xs">
              <a href="/free-classes/signin">Sign in here</a>
            </Button>
            .
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
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

export default FreeClassSignupPage;