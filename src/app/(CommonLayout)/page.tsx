import Link from "next/link";
import { Button } from "@/components/ui/button";

const LandingPage = () => {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Smart MMC
      </h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Smart Attendance & Student Management System for Coaching Institutes
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Tap-to-attend NFC, payment ledger, batch insights — all in one place.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Button asChild>
          <Link href="/signin">Sign In</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default LandingPage;