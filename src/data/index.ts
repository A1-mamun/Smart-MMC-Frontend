import {
  LayoutDashboard,
  Users,
  BookOpen,
  CreditCard,
  CalendarCheck2,
  Activity,
  BarChart3,
  Shield,
  GraduationCap,
  ClipboardList,
  UserCog,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
};

export const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/dashboard/students", icon: Users },
  { label: "Courses", href: "/dashboard/courses", icon: BookOpen },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck2 },
  { label: "Activity Log", href: "/dashboard/activity", icon: Activity },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Admin Users", href: "/dashboard/users", icon: Shield, superAdminOnly: true },
];

export const studentNavItems: NavItem[] = [
  { label: "Overview", href: "/dashboard/student", icon: GraduationCap },
  { label: "My Attendance", href: "/dashboard/student/attendance", icon: ClipboardList },
  { label: "My Payments", href: "/dashboard/student/payments", icon: CreditCard },
  { label: "Profile", href: "/dashboard/student/profile", icon: UserCog },
  { label: "Change Password", href: "/dashboard/student/change-password", icon: Shield },
];