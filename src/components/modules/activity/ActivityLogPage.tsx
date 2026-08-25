"use client";
import dayjs from "dayjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAllActivitiesQuery } from "@/redux/features/activityLog/activityLog";

const ActivityLogPage = () => {
  const { data, isLoading } = useGetAllActivitiesQuery({ limit: 50, page: 1 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Activity Log</h2>
        <p className="text-sm text-muted-foreground">System events across all admins</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : data?.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {data?.data?.map((a) => (
                <li
                  key={a.id}
                  className="flex items-start justify-between border-l-2 border-primary/40 pl-4 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{a.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.action.replace(/_/g, " ")} • {a.entityType}
                      {a.actorId && ` • by ${a.actorId.slice(0, 8)}...`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {dayjs(a.createdAt).format("MMM D, YYYY")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dayjs(a.createdAt).format("h:mm A")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogPage;