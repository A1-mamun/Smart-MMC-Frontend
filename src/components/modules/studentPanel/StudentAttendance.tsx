"use client";
import { useGetMyProfileQuery } from "@/redux/features/student/student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dayjs from "dayjs";

const StudentAttendance = () => {
  const { data, isLoading } = useGetMyProfileQuery(undefined);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  const records = data?.data?.attendance || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Attendance</h2>
        <p className="text-sm text-muted-foreground">Last 60 days</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{records.length} days present</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance yet.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-4">
              {records.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {dayjs(a.date).format("MMM D")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dayjs(a.date).format("dddd")}
                    </p>
                  </div>
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

export default StudentAttendance;