"use client";
import { useState } from "react";
import { useAppSelector } from "@/redux/hooks";
import { useCurrentUser } from "@/redux/features/auth/authSlice";
import {
  useGetAllUsersQuery,
  useDeleteUserMutation,
} from "@/redux/features/user/user";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldPlus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import CreateAdminModal from "./CreateAdminModal";

const AdminUsersPage = () => {
  const me = useAppSelector(useCurrentUser);
  const isSuperAdmin = me?.role === "SUPER_ADMIN";

  // The backend supports a comma-separated role filter, but its current
  // implementation only matches a single value. To get "SUPER_ADMIN + ADMIN"
  // we fetch each role and merge. Both calls share the LIST tag so any
  // mutation invalidates them together.
  const superAdmins = useGetAllUsersQuery(
    { role: "SUPER_ADMIN", limit: 100 },
    { refetchOnMountOrArgChange: true },
  );
  const admins = useGetAllUsersQuery(
    { role: "ADMIN", limit: 100 },
    { refetchOnMountOrArgChange: true },
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const isLoading = superAdmins.isLoading || admins.isLoading;
  const rows = [...(superAdmins.data?.data ?? []), ...(admins.data?.data ?? [])];
  const total = (superAdmins.data?.meta?.total ?? 0) + (admins.data?.meta?.total ?? 0);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name}? They won't be able to log in anymore.`)) return;
    try {
      await deleteUser(id).unwrap();
      toast.success(`${name} removed`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to remove admin");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Admin Users</h2>
          <p className="text-sm text-muted-foreground">
            Super admins & admins ({total})
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <ShieldPlus className="h-4 w-4" /> Create Admin
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Admins ({total})</CardTitle>
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
                  {isSuperAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={isSuperAdmin ? 5 : 4}
                      className="h-20 text-center text-muted-foreground"
                    >
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isSuperAdmin ? 5 : 4}
                      className="h-20 text-center text-muted-foreground"
                    >
                      No admins yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((u) => {
                    const isSelf = u.id === me?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium">{u.name}</div>
                          {isSelf && (
                            <div className="text-xs text-muted-foreground">
                              (you)
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {u.studentId}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              u.role === "SUPER_ADMIN" ? "default" : "outline"
                            }
                          >
                            {u.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              u.status === "ACTIVE" ? "success" : "destructive"
                            }
                          >
                            {u.status}
                          </Badge>
                        </TableCell>
                        {isSuperAdmin && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isSelf || deleting}
                              title={
                                isSelf
                                  ? "You can't remove yourself"
                                  : "Remove admin"
                              }
                              onClick={() => handleDelete(u.id, u.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <CreateAdminModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminUsersPage;