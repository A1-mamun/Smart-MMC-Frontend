import Link from "next/link";
import {
  Facebook,
  GraduationCap,
  Instagram,
  Mail,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const QUICK_LINKS = [
  { label: "About Us", href: "#" },
  { label: "Courses", href: "#" },
  { label: "Batches", href: "#" },
  { label: "Results", href: "#" },
  { label: "Contact", href: "#contact" },
];

const RESOURCES = [
  { label: "Routine", href: "#" },
  { label: "Notice Board", href: "#" },
  { label: "FAQ", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Terms", href: "#" },
];

const SOCIAL = [
  { icon: Facebook, href: "#" },
  { icon: Instagram, href: "#" },
  { icon: Twitter, href: "#" },
  { icon: Youtube, href: "#" },
];

const Footer = () => {
  return (
    <footer className="border-t bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="container mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 font-semibold">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span>MEHEDI MATH</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              A modern coaching ecosystem with NFC-powered attendance, payment
              transparency and guardian-first communication.
            </p>
            <div className="mt-4 flex items-center gap-2">
              {SOCIAL.map(({ icon: Icon, href }, i) => (
                <Link
                  key={i}
                  href={href}
                  className="rounded-full border bg-background p-2 text-muted-foreground transition hover:border-primary hover:text-primary"
                  aria-label="Social link"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold">Quick Links</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {QUICK_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Resources</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {RESOURCES.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="transition hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold">Reach Us</p>
            <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  Main Road, Boalia
                  <br />
                  Rajshahi, Bangladesh
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-primary" />
                <span>+880 1700-000000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-primary" />
                <span>admission@smartmmc.edu</span>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-3 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} MEHEDI MATH. All rights reserved.</p>
          <p>Built with care for students, parents &amp; teachers.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;