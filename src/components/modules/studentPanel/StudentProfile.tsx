"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetMyProfileQuery } from "@/redux/features/student/student";
import { formatBloodGroupLabel, formatBoardLabel } from "@/constants/labels";

const StudentProfile = () => {
  const { data, isLoading } = useGetMyProfileQuery(undefined);

  if (isLoading || !data?.data) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  const s = data.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Profile</h2>
        <p className="text-sm text-muted-foreground font-mono">
          {s.user.studentId}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={s.user.name} />
            <Row label="Nickname" value={s.user.nickname || "—"} />
            <Row label="Mobile" value={s.mobile} />
            <Row label="Blood Group" value={formatBloodGroupLabel(s.bloodGroup)} />
            <Row label="College" value={s.college || "—"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Guardian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Father" value={`${s.fatherName} (${s.fatherOccupation})`} />
            <Row label="Father Mobile" value={s.fatherMobile} />
            <Row label="Mother" value={`${s.motherName} (${s.motherOccupation})`} />
            <Row label="Mother Mobile" value={s.motherMobile} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {s.addressVillage}, {s.addressPostOffice}, {s.addressUpozila},{" "}
            {s.addressDistrict}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>SSC</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Institute" value={s.sscInstitute} />
            <Row label="Board" value={formatBoardLabel(s.sscBoard)} />
            <Row label="Passing Year" value={String(s.sscPassingYear)} />
            <Row label="GPA" value={Number(s.sscGpa).toFixed(2)} />
          </CardContent>
        </Card>
        {s.batches && s.batches.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Batch</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {s.batches.map((b) => (
                <Badge key={b.id} variant="outline">
                  {b.hscBatch.replace("BATCH_", "HSC ")} • {b.batchDay} • {b.batchTime.replace("TIME_", "")}
                </Badge>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value}</span>
  </div>
);

export default StudentProfile;