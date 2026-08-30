"use client";
import {
  Users,
  CheckCircle2,
  AlertCircle,
  CalendarCheck2,
  TrendingUp,
  Wallet,
  CreditCard,
  Activity,
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
import { useGetAdmissionComparisonQuery, useGetCollectionTrendQuery, useGetPaymentMethodBreakdownQuery } from "@/redux/features/stats/stats";
import { TActivityLog } from "@/types/activityLog";
import { formatBatchLabel } from "@/constants/labels";
import dayjs from "dayjs";

const PIE_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

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
        <StatCard
          label="Overdue Records"
          value={cards.overdueRecords}
          icon={TrendingUp}
          sublabel="Past due date, unpaid"
        />
        <StatCard
          label="Collected This Month"
          value={`৳${cards.collectedThisMonth.toLocaleString()}`}
          icon={Wallet}
          sublabel={`All-time: ৳${cards.collectedAllTime.toLocaleString()}`}
        />
        <StatCard
          label="Today Attendance"
          value={cards.todayAttendance}
          icon={CalendarCheck2}
          sublabel={`This month: ${cards.monthAttendance}`}
        />
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
                <Bar dataKey="collected" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
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