"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  GraduationCap,
  Home,
  LogOut,
  Menu,
  PlayCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { logOut, useCurrentUser } from "@/redux/features/auth/authSlice";
import { logoutUser } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TUserRole } from "@/types/user";
import ThemeLogo from "./ThemeLogo";
import ThemeToggle from "./ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

/**
 * Centered navbar with three columns:
 *
 *   [Logo]      [Home · Batches · Dashboard · Free Classes]      [Theme · Auth]
 *
 * On screens below `md` the centered nav links collapse into
 * a hamburger that opens a left-side Sheet — the auth/theme
 * controls stay anchored on the right at every breakpoint so
 * sign-in / theme are always one tap away.
 *
 * Auth-aware: signed-out users see a primary-colored "Sign In"
 * button on the right; signed-in users get a Logout icon. The
 * "Dashboard" nav item is only shown when the current user has
 * a dashboard view (i.e. role !== STUDENT) — students use the
 * kiosk / student app, not the admin dashboard.
 *
 * Colour: "Free Classes" and "Sign In" render with the primary
 * brand colour so the two top-of-funnel CTAs (browse free
 * classes / create an account) read as the page's primary
 * actions. Other nav items stay muted.
 */

type NavLink = {
  href: string;
  label: string;
  icon: typeof Home;
  // Auth gate — if set, the link is shown only when the predicate
  // returns true. Used for the Dashboard link, which only
  // signed-in admins see.
  showWhen?: (user: { role: TUserRole } | null) => boolean;
};

const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/batches", label: "Batches", icon: Sparkles },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: GraduationCap,
    // Has-dashboard: SUPER_ADMIN / ADMIN get a real dashboard.
    // STUDENT role users have no dashboard view, so the link
    // is hidden for them.
    showWhen: (user) => user != null && user.role !== "STUDENT",
  },
  { href: "/free-classes", label: "Free Classes", icon: PlayCircle },
];

/**
 * Single nav link. Active state is "exact match for `/`,
 * startsWith for everything else" so /batches stays highlighted
 * on /batches/something-else, but Home is only highlighted on
 * the bare landing page.
 *
 * `Free Classes` is a top-of-funnel CTA — when active, it gets
 * the primary background so it reads as the page's primary
 * action. When inactive, the same primary treatment is applied
 * via a subtle primary-tinted background so it stands apart
 * from the other muted links without screaming.
 */
const PRIMARY_HREFS = new Set(["/free-classes"]);

const NavLinkItem = ({
  link,
  active,
  onNavigate,
  variant = "desktop",
}: {
  link: NavLink;
  active: boolean;
  onNavigate?: () => void;
  variant?: "desktop" | "mobile";
}) => {
  const Icon = link.icon;
  const isPrimary = PRIMARY_HREFS.has(link.href);

  if (variant === "desktop") {
    return (
      <Link
        href={link.href}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : isPrimary
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="h-4 w-4" />
        <span>{link.label}</span>
      </Link>
    );
  }
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : isPrimary
            ? "bg-primary/10 text-primary hover:bg-primary/20"
            : "text-foreground hover:bg-muted",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="h-4 w-4" />
      <span>{link.label}</span>
    </Link>
  );
};

const Navbar = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(useCurrentUser);
  const pathname = usePathname() ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);

  // Dashboard link is gated on `role !== "STUDENT"` — that's
  // what "user has a dashboard" means here. Anon users and
  // STUDENT-role users both skip the link.
  const visibleLinks = NAV_LINKS.filter((l) =>
    l.showWhen ? l.showWhen(user) : true,
  );

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    setMobileOpen(false);
    dispatch(logOut());
    await logoutUser();
    toast.success("Logged out successfully");
    router.push("/signin");
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 items-center px-4">
        {/* Left — logo */}
        <Link
          href="/"
          className="flex shrink-0 items-center -ml-5"
          aria-label="Home"
        >
          <ThemeLogo height={200} priority />
        </Link>

        {/* Center — primary nav (hidden on mobile, inlined into the hamburger) */}
        <nav
          aria-label="Primary"
          className="hidden flex-1 items-center justify-center md:flex"
        >
          <div className="flex items-center gap-1">
            {visibleLinks.map((link) => (
              <NavLinkItem
                key={link.href}
                link={link}
                active={isActive(link.href)}
              />
            ))}
          </div>
        </nav>

        {/* Mobile spacer (pushes the right-side controls to the edge) */}
        <div className="flex-1 md:hidden" />

        {/* Right — theme + auth + (mobile) hamburger */}
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          {user ? (
            <>
              {/*
               * Dashboard quick-link on the right rail — same
               * gate as the centered nav item (only shown when
               * the user actually has a dashboard). Hidden on
               * mobile to keep the row narrow; the centered
               * nav / hamburger covers mobile.
               */}
              {user.role !== "STUDENT" && (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="hidden md:inline-flex"
                  aria-label="Dashboard"
                >
                  <Link href="/dashboard">
                    <GraduationCap className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            // Primary CTAs: Sign In uses the brand colour so
            // the unauthenticated entry point reads as the
            // page's primary action.
            <Button
              size="sm"
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/signin">Sign In</Link>
            </Button>
          )}

          {/* Mobile menu trigger — opens a Sheet with the same nav links */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex h-14 items-center border-b px-4">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Home"
                >
                  <ThemeLogo height={120} />
                </Link>
              </div>
              <nav
                aria-label="Mobile primary"
                className="flex flex-col gap-1 p-3"
              >
                {visibleLinks.map((link) => (
                  <NavLinkItem
                    key={link.href}
                    link={link}
                    active={isActive(link.href)}
                    onNavigate={() => setMobileOpen(false)}
                    variant="mobile"
                  />
                ))}
                {user ? (
                  <div className="mt-3 border-t pt-3">
                    <p className="px-3 pb-2 text-xs uppercase tracking-wider text-muted-foreground">
                      Signed in as
                    </p>
                    <p className="px-3 pb-3 text-sm font-medium">
                      {user.name ?? user.mobile}
                    </p>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 border-t pt-3">
                    {/* Primary CTA in the mobile sheet — mirrors
                        the desktop "Sign In" button. */}
                    <Button
                      asChild
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Link href="/signin" onClick={() => setMobileOpen(false)}>
                        Sign In
                      </Link>
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
