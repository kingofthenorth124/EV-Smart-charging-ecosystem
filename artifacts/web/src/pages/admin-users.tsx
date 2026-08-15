import { useState, useRef } from "react";
import { AppLayout } from "@/components/app-layout";
import {
  useListUsers,
  useUpdateUserStatus,
  getListUsersQueryKey,
  UserProfile,
  UserStatus,
  UserRole,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Loader2, MoreVertical, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const getStatusBadge = (status: UserStatus) => {
  switch (status) {
    case "ACTIVE":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 shadow-none border-0">ACTIVE</Badge>;
    case "PENDING":
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 shadow-none border-0">PENDING</Badge>;
    case "SUSPENDED":
      return <Badge variant="destructive" className="shadow-none border-0">SUSPENDED</Badge>;
    case "DEACTIVATED":
      return <Badge variant="secondary" className="shadow-none border-0">DEACTIVATED</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeoutRef = useRef<number | null>(null);

  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  const [confirmAction, setConfirmAction] = useState<{
    user: UserProfile;
    newStatus: UserStatus;
  } | null>(null);

  const params = {
    page,
    limit: 10,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(roleFilter !== "ALL" && { role: roleFilter as UserRole }),
    ...(statusFilter !== "ALL" && { status: statusFilter as UserStatus }),
  };

  const { data: usersResponse, isLoading } = useListUsers(params, {
    query: { queryKey: getListUsersQueryKey(params) },
  });

  const updateStatus = useUpdateUserStatus();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = window.setTimeout(() => {
      setDebouncedSearch(e.target.value);
      setPage(1);
    }, 400);
  };

  const initiateStatusChange = (user: UserProfile, newStatus: UserStatus) => {
    if (newStatus === "SUSPENDED" || newStatus === "DEACTIVATED") {
      setConfirmAction({ user, newStatus });
    } else {
      executeStatusChange(user, newStatus);
    }
  };

  const executeStatusChange = async (user: UserProfile, newStatus: UserStatus) => {
    try {
      await updateStatus.mutateAsync({
        id: user.id,
        data: { status: newStatus },
      });
      toast({
        title: "Status Updated",
        description: `${user.firstName}'s status is now ${newStatus}.`,
      });
      setConfirmAction(null);
      queryClient.invalidateQueries({ queryKey: ["/api/v1/users"], exact: false });
    } catch (err) {
      toast({
        title: "Update Failed",
        description: "Failed to update user status.",
        variant: "destructive",
      });
    }
  };

  const totalPages = usersResponse ? Math.ceil(usersResponse.total / usersResponse.limit) : 1;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border pb-4">
          <div>
            <h1 className="text-xl font-semibold">User Directory</h1>
            <p className="text-sm text-muted-foreground">Manage platform users and access</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or email..."
                className="pl-9 bg-surface-0"
                value={searchTerm}
                onChange={handleSearch}
                data-testid="input-search-users"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <Select value={roleFilter} onValueChange={(val) => { setRoleFilter(val); setPage(1); }}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-role">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="CUSTOMER">Customer</SelectItem>
              <SelectItem value="ADMIN_OFFICER">Admin Officer</SelectItem>
              <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
            <SelectTrigger className="w-[160px]" data-testid="select-filter-status">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                {isSuperAdmin && <TableHead className="w-[80px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center py-12">
                    <Loader2 className="size-6 animate-spin text-primary mx-auto" />
                  </TableCell>
                </TableRow>
              ) : !usersResponse?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center py-12 text-muted-foreground">
                    No users found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                usersResponse.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                        {u.role.replace(/_/g, " ")}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(u.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                            {u.status !== "ACTIVE" && (
                              <DropdownMenuItem onClick={() => initiateStatusChange(u, "ACTIVE")}>
                                Set to Active
                              </DropdownMenuItem>
                            )}
                            {u.status !== "SUSPENDED" && (
                              <DropdownMenuItem 
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                onClick={() => initiateStatusChange(u, "SUSPENDED")}
                              >
                                Suspend User
                              </DropdownMenuItem>
                            )}
                            {u.status !== "DEACTIVATED" && (
                              <DropdownMenuItem 
                                className="text-gray-600"
                                onClick={() => initiateStatusChange(u, "DEACTIVATED")}
                              >
                                Deactivate User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Showing page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-red-500" />
              Confirm Destructive Action
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to change the status of <strong>{confirmAction?.user.email}</strong> to <strong>{confirmAction?.newStatus}</strong>?
              This will immediately affect their access to the platform.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => confirmAction && executeStatusChange(confirmAction.user, confirmAction.newStatus)}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? "Applying..." : "Yes, change status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
