import type { Metadata } from "next";
import { Poppins, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import StoreProvider from "@/providers/StoreProvider";
// Side-effect import: extends dayjs with utc + timezone plugins and
// pins the default TZ to Asia/Dhaka so all date formatting in the UI
// (attendance, dashboard, exams, etc.) renders in the institute's
// calendar TZ regardless of the browser's local TZ. Imported here
// (the root layout) so the config is loaded before any component
// first renders dayjs.
import "@/utils/dayjs";
import "./globals.css";
import { ReactNode } from "react";

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-poppins",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MEHEDI MATH | Attendance & Student Management",
  description: "Smart Attendance and Student Management System",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${poppins.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <StoreProvider>
            <Toaster />
            {children}
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}