"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetAllStudentsQuery } from "@/redux/features/student/student";
import { useManualCheckInMutation } from "@/redux/features/attendance/attendance";
import { TStudent } from "@/types/student";

const ManualCheckInPage = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data, isFetching } = useGetAllStudentsQuery(
    { searchTerm: search, limit: 10, page: 1 },
    {
      skip: !search,
    },
  );
  const [manualCheckIn, { isLoading }] = useManualCheckInMutation();
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [results, setResults] = useState<
    Record<
      string,
      { message: string; isFirstCheckIn: boolean; dueAmount: number }
    >
  >({});

  const handleCheckIn = async (student: TStudent) => {
    setCheckingId(student.id);
    try {
      const res = await manualCheckIn({ studentId: student.id }).unwrap();
      if (res.success && res.data) {
        const d = res.data;
        setResults((prev) => ({
          ...prev,
          [student.id]: {
            message: d.message,
            isFirstCheckIn: d.isFirstCheckIn,
            dueAmount: d.dueAmount,
          },
        }));
        toast.success(d.message);
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to check in");
    } finally {
      setCheckingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Manual Check-In</h2>
        <p className="text-sm text-muted-foreground">
          Search for a student by name, mobile, or Student ID and mark their
          attendance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find Student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
        </CardContent>
      </Card>

      {isFetching && search && (
        <p className="text-sm text-muted-foreground">Searching...</p>
      )}

      <div className="space-y-2">
        {data?.data?.map((student) => {
          const result = results[student.id];
          return (
            <Card key={student.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{student.user.name}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {student.user.studentId} • {student.mobile}
                  </p>
                  {result && (
                    <div className="text-xs mt-1">
                      <Badge
                        variant={
                          result.isFirstCheckIn ? "success" : "secondary"
                        }
                      >
                        {result.message}
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      router.push(`/dashboard/students/${student.id}`)
                    }
                  >
                    View
                  </Button>
                  <Button
                    size="sm"
                    disabled={checkingId === student.id || isLoading}
                    onClick={() => handleCheckIn(student)}
                  >
                    {checkingId === student.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Check In"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {search && data?.data?.length === 0 && !isFetching && (
          <p className="text-sm text-muted-foreground">No students found.</p>
        )}
      </div>
    </div>
  );
};

export default ManualCheckInPage;
