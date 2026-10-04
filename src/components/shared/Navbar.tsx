"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, PlayCircle, User } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { logOut, useCurrentUser } from "@/redux/features/auth/authSlice";
import { logoutUser } from "@/services/auth";
import { Button } from "@/components/ui/button";
import ThemeLogo from "./ThemeLogo";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(useCurrentUser);

  const handleLogout = async () => {
    dispatch(logOut());
    await logoutUser();
    toast.success("Logged out successfully");
    router.push("/signin");
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <ThemeLogo height={200} priority />
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/free-classes">
              <PlayCircle className="h-4 w-4" />
              <span>Free Classes</span>
            </Link>
          </Button>
          <ThemeToggle />
          {user ? (
            <>
              {user.role !== "STUDENT" && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/signin">
                <User className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
