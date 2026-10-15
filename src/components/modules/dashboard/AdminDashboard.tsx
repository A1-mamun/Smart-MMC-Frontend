"use client";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  CalendarCheck2,
  Wallet,
  CreditCard,
  Activity,
  Gift,
  UserX,
  GraduationCap,
  TrendingUp,
  HandCoins,
  CircleDollarSign,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend as ReLegend,
} from "recharts";
import { Button } from "@/components/ui/button";
import StatCard from "./StatCard";
import { useGetAdminDashboardQuery } from "@/redux/features/dashboard/dashboard";
import {
  useGetAdmissionComparisonQuery,
  useGetCollectionTrendQuery,
  useGetPaymentMethodBreakdownQuery,
  useGetOngoingCoursesStatQuery,
} from "@/redux/features/stats/stats";
import { useGetAttendanceStatsQuery } from "@/redux/features/attendance/attendance";
import { TActivityLog } from "@/types/activityLog";
import { formatBatchLabel, formatCourseLabel } from "@/constants/labels";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import { TOngoingCourseStat } from "@/types/stats";
import dayjs from "dayjs";

const PIE_COLORS = ["#fa7604", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

const fmtTk = (n: number) => `৳${n.toLocaleString()}`;

const AdminDashboard = () => {
  const { data, isLoading } = useGetAdminDashboardQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: comparison } = useGetAdmissionComparisonQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: collection } = useGetCollectionTrendQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: paymentMethods } = useGetPaymentMethodBreakdownQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: attendanceStats } = useGetAttendanceStatsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  // Per-ONGOING-course aggregate: student count for every admin;
  // totalEarned / ppFeeTotal / netProfit for SUPER_ADMIN only (gated
  // server-side). Used to render the "Ongoing Courses" card grid.
  const { data: ongoingCourses } = useGetOngoingCoursesStatQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const currentUser = useAppSelector(useCurrentUser);
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  if (isLoading || !data?.data) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  const cards = data.data.cards;
  const recentActivities = data.data.recentActivities || [];
  const batchGroups = data.data.batchGroups || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {dayjs().format("dddd, MMMM D, YYYY")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/students/new">Admit Student</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/attendance/manual">Check In</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Students"
          value={cards.totalStudents}
          icon={Users}
          sublabel="Currently enrolled"
        />
        <StatCard
          label="Fully Paid"
          value={cards.fullyPaidStudents}
          icon={CheckCircle2}
          sublabel="Students fully paid"
        />
        <StatCard
          label="Partially Paid"
          value={cards.partialPaymentStudents ?? 0}
          icon={Wallet}
          sublabel="Students with partial payment"
        />
        <StatCard
          label="Pending Payments"
          value={cards.pendingPaymentStudents}
          icon={AlertCircle}
          sublabel="Students with due amount"
        />
        {/* Free-class accounts — students who signed up via /free-classes
            but never enrolled in a paid course. Wired up as a clickable
            card so the marketer / admin can drill into the free roster
            directly. The KPI is independent of the paid totals above
            (the /dashboard/students list defaults to isFreeAccount:false).
            Replaces the previous "Overdue Records" tile — overdue counts
            already surface on the via students page + payments view, so
            the dashboard didn't need to carry a second copy. */}
        <Link
          href="/dashboard/free-students"
          className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <StatCard
            label="Free Students"
            value={cards.freeStudents ?? 0}
            icon={Gift}
            sublabel="Free-class signups (no paid course)"
          />
        </Link>
        <StatCard
          label="Collected This Month"
          value={`৳${cards.collectedThisMonth.toLocaleString()}`}
          icon={Wallet}
          sublabel={`All-time: ৳${cards.collectedAllTime.toLocaleString()}`}
        />
        <StatCard
          label="Total Due Amount"
          value={`৳${(cards.totalDueAmount ?? 0).toLocaleString()}`}
          icon={AlertCircle}
          sublabel="Outstanding across all enrollments"
        />
        <StatCard
          label="Today Attendance"
          value={cards.todayAttendance}
          icon={CalendarCheck2}
          sublabel={`This month: ${cards.monthAttendance}`}
        />
        {attendanceStats?.data && (
          <StatCard
            label="Today Absent"
            value={attendanceStats.data.todayAbsent ?? 0}
            icon={UserX}
            sublabel="Marked by cron after class end"
          />
        )}
        {comparison?.data && (
          <StatCard
            label={`Admission ${formatBatchLabel(comparison.data.currentBatch)}`}
            value={comparison.data.currentBatchCount}
            icon={Users}
            sublabel={`vs ${formatBatchLabel(comparison.data.previousBatch)}: ${comparison.data.previousBatchCount}`}
            trend={{ value: comparison.data.percentChange }}
          />
        )}
        <StatCard
          label="Activity Today"
          value={recentActivities.filter((a) => dayjs(a.createdAt).isSame(dayjs(), "day")).length}
          icon={Activity}
          sublabel="System events logged"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Collection Trend (last 6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={collection?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} />
                <Bar dataKey="collected" fill="#fa7604" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={paymentMethods?.data || []}
                  dataKey="total"
                  nameKey="method"
                  outerRadius={80}
                  label
                >
                  {(paymentMethods?.data || []).map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ReLegend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ongoing Courses</CardTitle>
          {isSuperAdmin && (
            <span className="text-xs text-muted-foreground">
              Earned − PP commission = net per course
            </span>
          )}
        </CardHeader>
        <CardContent>
          {ongoingCourses?.data && ongoingCourses.data.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {ongoingCourses.data.map((c: TOngoingCourseStat) => (
                <div
                  key={c.id}
                  className="rounded-md border bg-card p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold leading-tight">
                        {formatCourseLabel(c.name)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatBatchLabel(c.hscBatch)} · Fee {fmtTk(c.fee)}
                      </p>
                    </div>
                    <div className="rounded-md bg-primary/10 p-2 text-primary shrink-0">
                      <GraduationCap className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Students
                    </span>
                    <span className="ml-auto text-lg font-bold">
                      {c.studentCount}
                    </span>
                  </div>

                  {isSuperAdmin && (
                    <div className="space-y-1.5 border-t pt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CircleDollarSign className="h-4 w-4 text-emerald-600" />
                        <span className="text-muted-foreground">Earned</span>
                        <span className="ml-auto font-medium">
                          {fmtTk(c.totalEarned)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <HandCoins className="h-4 w-4 text-amber-600" />
                        <span className="text-muted-foreground">PP fee</span>
                        <span className="ml-auto font-medium">
                          {fmtTk(c.ppFeeTotal)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm border-t pt-1.5">
                        <TrendingUp
                          className={
                            "h-4 w-4 " +
                            (c.netProfit >= 0
                              ? "text-emerald-600"
                              : "text-destructive")
                          }
                        />
                        <span className="text-muted-foreground">Net</span>
                        <span
                          className={
                            "ml-auto font-semibold " +
                            (c.netProfit >= 0
                              ? "text-emerald-600"
                              : "text-destructive")
                          }
                        >
                          {fmtTk(c.netProfit)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No ongoing courses right now.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Batch Groups</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/analytics">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            {batchGroups.slice(0, 6).map((b, i) => (
              <div key={i} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{formatBatchLabel(b.hscBatch)}</p>
                <p className="text-muted-foreground text-xs">
                  {b.batchDay} • {b.batchTime}
                </p>
                <p className="mt-1 text-lg font-bold">{b.studentCount}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivities.slice(0, 10).map((a: TActivityLog) => (
                <li key={a.id} className="flex items-start justify-between text-sm border-l-2 border-primary/30 pl-3">
                  <div>
                    <p className="font-medium">{a.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.action.replace(/_/g, " ")} • {a.entityType}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {dayjs(a.createdAt).format("MMM D, h:mm A")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;