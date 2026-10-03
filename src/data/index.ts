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
  MessageSquare,
  Award,
  Settings,
  PlayCircle,
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
  { label: "Exams", href: "/dashboard/exams", icon: Award },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Attendance", href: "/dashboard/attendance", icon: CalendarCheck2 },
  { label: "SMS", href: "/dashboard/sms", icon: MessageSquare },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Activity Log", href: "/dashboard/activity", icon: Activity },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  // Admin CRUD for the free-class content tree (subjects → chapters →
  // topics). Lives under /dashboard/free-classes so it picks up the
  // admin sidebar; the /free-classes landing for students is a
  // separate CommonLayout page.
  { label: "Free Classes", href: "/dashboard/free-classes", icon: PlayCircle },
  { label: "Admin Users", href: "/dashboard/users", icon: Shield, superAdminOnly: true },
];

export const studentNavItems: NavItem[] = [
  { label: "Overview", href: "/dashboard/student", icon: GraduationCap },
  { label: "Exams & Results", href: "/dashboard/student/exams", icon: Award },
  { label: "My Attendance", href: "/dashboard/student/attendance", icon: ClipboardList },
  { label: "My Payments", href: "/dashboard/student/payments", icon: CreditCard },
  { label: "Profile", href: "/dashboard/student/profile", icon: UserCog },
  { label: "Change Password", href: "/dashboard/student/change-password", icon: Shield },
];