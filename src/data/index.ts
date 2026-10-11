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
  Gift,
  Image as ImageIcon,
  UserSquare,
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
  // Roster of free-class accounts — students who signed up via the
  // public /free-classes landing and never enrolled in a paid course.
  // Sits next to the paid Students entry so admins can flip between
  // the two without leaving the sidebar.
  { label: "Free Students", href: "/dashboard/free-students", icon: Gift },
  // Landing-page hero banners — admin uploads images to Cloudinary
  // and the public home page carousel picks them up.
  { label: "Banners", href: "/dashboard/banner", icon: ImageIcon },
  // Landing-page "Hall of Fame" — admin adds alumni (name, institute,
  // batch, photo) and the public home page grid picks them up.
  { label: "Success Students", href: "/dashboard/success-students", icon: UserSquare },
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