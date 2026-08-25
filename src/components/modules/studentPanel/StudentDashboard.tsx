"use client";
import { CalendarCheck2, CreditCard, GraduationCap, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatCard from "@/components/modules/dashboard/StatCard";
import { useGetStudentDashboardQuery } from "@/redux/features/dashboard/dashboard";
import { formatCourseLabel } from "@/constants/labels";
import dayjs from "dayjs";

const StudentDashboard = () => {
  const { data, isLoading } = useGetStudentDashboardQuery(undefined);

  if (isLoading || !data?.data) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  const { profile, courses, attendance, totalDue } = data.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome, {profile.name}
        </h2>
        <p className="text-sm text-muted-foreground font-mono">
          Student ID: {profile.studentId}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Enrolled Courses"
          value={courses.length}
          icon={BookOpen}
          sublabel={`${courses.filter((c) => c.isCompleted).length} completed`}
        />
        <StatCard
          label="This Month Attendance"
          value={attendance.thisMonth}
          icon={CalendarCheck2}
          sublabel={`${attendance.recent.length} total records`}
        />
        <StatCard
          label="Total Due"
          value={`৳${totalDue.toLocaleString()}`}
          icon={CreditCard}
          sublabel={totalDue > 0 ? "Payment pending" : "All cleared"}
        />
        <StatCard
          label="Profile"
          value={profile.name.split(" ")[0]}
          icon={GraduationCap}
          sublabel={profile.mobile}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Courses</CardTitle>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courses enrolled.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {courses.map((c) => (
                <div key={c.id} className="rounded-md border p-4">
                  <div className="flex items-start justify-between">
                    <p className="font-medium">{formatCourseLabel(c.courseName as any)}</p>
                    {c.isCompleted ? (
                      <Badge variant="success">Completed</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Fee: ৳{c.fee.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Paid: ৳{c.paid.toLocaleString()}
                  </p>
                  <p className={`text-sm font-semibold mt-1 ${c.due > 0 ? "text-destructive" : "text-emerald-600"}`}>
                    Due: ৳{c.due.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance yet.</p>
          ) : (
            <div className="space-y-1">
              {attendance.recent.slice(0, 7).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between border-b last:border-0 py-2 text-sm"
                >
                  <span>{dayjs(a.date).format("dddd, MMM D")}</span>
                  <Badge variant="outline">{dayjs(a.checkInAt).format("h:mm A")}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentDashboard;