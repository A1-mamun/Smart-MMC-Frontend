"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetAllUsersQuery } from "@/redux/features/user/user";

const AdminUsersPage = () => {
  const { data, isLoading } = useGetAllUsersQuery({ limit: 100 });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Admin Users</h2>
        <p className="text-sm text-muted-foreground">Super admin & admin accounts</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Users ({data?.meta?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="font-mono text-xs">{u.studentId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.role.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.status === "ACTIVE" ? "success" : "destructive"}>
                          {u.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsersPage;