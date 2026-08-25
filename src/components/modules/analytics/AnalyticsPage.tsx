"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp } from "lucide-react";
import {
  useGetAdmissionComparisonQuery,
  useGetBatchCourseStatsQuery,
  useGetCollectionTrendQuery,
} from "@/redux/features/stats/stats";
import { formatBatchLabel } from "@/constants/labels";

const AnalyticsPage = () => {
  const { data: comparison } = useGetAdmissionComparisonQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: batchStats } = useGetBatchCourseStatsQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: collection } = useGetCollectionTrendQuery(undefined, { refetchOnMountOrArgChange: true });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground">Admission and financial insights</p>
      </div>

      {comparison?.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Admission Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">
                  {formatBatchLabel(comparison.data.currentBatch)} (this year)
                </p>
                <p className="text-3xl font-bold">{comparison.data.currentBatchCount}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">
                  {formatBatchLabel(comparison.data.previousBatch)} (last year)
                </p>
                <p className="text-3xl font-bold">{comparison.data.previousBatchCount}</p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm text-muted-foreground">Change</p>
                <p
                  className={`text-3xl font-bold ${
                    comparison.data.percentChange >= 0 ? "text-emerald-600" : "text-destructive"
                  }`}
                >
                  {comparison.data.percentChange >= 0 ? "+" : ""}
                  {comparison.data.percentChange}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Batch × Course Enrollment</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={batchStats?.data || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="courseName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="studentCount" fill="#0ea5e9" name="Students" />
              <Bar dataKey="paidCount" fill="#22c55e" name="Fully paid" />
              <Bar dataKey="dueCount" fill="#ef4444" name="Has due" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
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
              <Bar dataKey="collected" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;