import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/app-layout";
import { NfcCard } from "@/components/nfc-card";
import { Mail, Phone, ShieldCheck, Activity } from "lucide-react";
import { format } from "date-fns";

export default function Home() {
  const { user } = useAuth();

  if (!user) return null; // Handled by ProtectedRoute

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "text-green-700 bg-green-100";
      case "PENDING":
        return "text-amber-700 bg-amber-100";
      case "SUSPENDED":
        return "text-red-700 bg-red-100";
      case "DEACTIVATED":
        return "text-gray-700 bg-gray-100";
      default:
        return "text-primary bg-primary/10";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-4">
        <h1 className="text-2xl font-bold mb-6 text-foreground">
          Welcome back, {user.firstName}!
        </h1>

        <NfcCard
          title={`${user.role.replace(/_/g, " ")} IDENTITY`}
          value={`${user.firstName} ${user.lastName}`}
          id={`ID: ${user.id.substring(0, 8).toUpperCase()}`}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-muted/40 border border-border p-4 rounded-xl flex items-center gap-4 hover:bg-muted/60 transition-colors">
            <div className="bg-primary/10 p-3 rounded-full shrink-0">
              <Mail className="size-5 text-primary" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">
                Email Address
              </div>
              <div
                className="text-sm font-medium truncate"
                data-testid="text-profile-email"
              >
                {user.email}
              </div>
            </div>
          </div>

          <div className="bg-muted/40 border border-border p-4 rounded-xl flex items-center gap-4 hover:bg-muted/60 transition-colors">
            <div className="bg-primary/10 p-3 rounded-full shrink-0">
              <Phone className="size-5 text-primary" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">
                Phone Number
              </div>
              <div
                className="text-sm font-medium truncate"
                data-testid="text-profile-phone"
              >
                {user.phone}
              </div>
            </div>
          </div>

          <div className="bg-muted/40 border border-border p-4 rounded-xl flex items-center gap-4 hover:bg-muted/60 transition-colors">
            <div className="bg-primary/10 p-3 rounded-full shrink-0">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">
                Account Role
              </div>
              <div
                className="text-sm font-medium capitalize"
                data-testid="text-profile-role"
              >
                {user.role.replace(/_/g, " ").toLowerCase()}
              </div>
            </div>
          </div>

          <div className="bg-muted/40 border border-border p-4 rounded-xl flex items-center gap-4 hover:bg-muted/60 transition-colors">
            <div className="bg-primary/10 p-3 rounded-full shrink-0">
              <Activity className="size-5 text-primary" />
            </div>
            <div className="overflow-hidden">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                Account Status
              </div>
              <div>
                <span
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide ${getStatusColor(
                    user.status
                  )}`}
                  data-testid="status-profile"
                >
                  {user.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-6 border-t border-border/50">
          Member since {format(new Date(user.createdAt), "MMMM d, yyyy")}
        </div>
      </div>
    </AppLayout>
  );
}
