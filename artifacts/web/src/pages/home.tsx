import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/app-layout";
import { NfcCard } from "@/components/nfc-card";
import { useGetDashboard } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { Bolt, Calendar, BatteryCharging, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

const formatNaira = (kobo: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(kobo / 100);
};

export default function Home() {
  const { user } = useAuth();
  const { data: dashboard, isLoading, error } = useGetDashboard();

  if (!user) return null;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-2">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner className="size-8 text-primary" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-10">
            Failed to load dashboard. Please try again.
          </div>
        ) : dashboard ? (
          <>
            <h1 className="text-xl font-bold mb-6 text-foreground flex items-center gap-2">
              Welcome back, {user.firstName}
            </h1>

            <NfcCard
              title="Wallet Balance"
              value={formatNaira(dashboard.wallet.balanceKobo)}
              id={`ID: ${dashboard.wallet.id.substring(0, 12).toUpperCase()}`}
            />

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-muted/40 border border-border rounded-xl p-4 text-center hover:bg-muted/60 transition-colors">
                <div className="text-xl font-bold text-[#854f0b]">
                  {dashboard.sessionsCount}
                </div>
                <div className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                  Sessions
                </div>
              </div>
              <div className="bg-muted/40 border border-border rounded-xl p-4 text-center hover:bg-muted/60 transition-colors">
                <div className="text-xl font-bold text-foreground">
                  {(dashboard.totalEnergyWh / 1000).toFixed(1)}
                </div>
                <div className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                  kWh Used
                </div>
              </div>
              <div className="bg-muted/40 border border-border rounded-xl p-4 text-center hover:bg-muted/60 transition-colors">
                <div className="text-xl font-bold text-green-700">100%</div>
                <div className="text-[11px] font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                  Solar
                </div>
              </div>
            </div>

            {dashboard.activeSession && (
              <div className="mb-6">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Active Session
                </div>
                <Link href="/charge" className="block">
                  <div className="bg-green-100/50 border border-green-200 p-4 rounded-xl flex items-center gap-4 hover:bg-green-100 transition-colors cursor-pointer group">
                    <div className="bg-green-200 text-green-700 p-3 rounded-full shrink-0 relative">
                      <BatteryCharging className="size-5" />
                      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm font-semibold text-green-900 group-hover:text-green-800 transition-colors">
                        Charging at {dashboard.activeSession.stationName}
                      </div>
                      <div className="text-xs text-green-700/80 mt-0.5">
                        Tap to view live progress
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Recent Activity
                </div>
                <Link
                  href="/history"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View All
                </Link>
              </div>

              <div className="space-y-3">
                {[...dashboard.recentSessions, ...dashboard.recentTransactions]
                  .sort(
                    (a, b) =>
                      new Date(
                        "startedAt" in b ? b.startedAt : b.createdAt
                      ).getTime() -
                      new Date(
                        "startedAt" in a ? a.startedAt : a.createdAt
                      ).getTime()
                  )
                  .slice(0, 5)
                  .map((item) => {
                    if ("startedAt" in item) {
                      // It's a ChargingSession
                      return (
                        <div
                          key={`session-${item.id}`}
                          className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
                        >
                          <div className="bg-primary/10 text-primary p-2.5 rounded-lg shrink-0">
                            <Bolt className="size-5" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-medium truncate">
                              {item.stationName}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Calendar className="size-3" />
                              {format(
                                new Date(item.startedAt),
                                "MMM d, h:mm a"
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-semibold">
                              {(item.energyWh / 1000).toFixed(1)} kWh
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatNaira(item.costKobo)}
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      // It's a WalletTransaction
                      const isCredit = item.amountKobo > 0;
                      return (
                        <div
                          key={`tx-${item.id}`}
                          className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
                        >
                          <div
                            className={`p-2.5 rounded-lg shrink-0 ${
                              isCredit
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownRight className="size-5" />
                            ) : (
                              <ArrowUpRight className="size-5" />
                            )}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-sm font-medium truncate capitalize">
                              {item.type.toLowerCase().replace(/_/g, " ")}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Calendar className="size-3" />
                              {format(
                                new Date(item.createdAt),
                                "MMM d, h:mm a"
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div
                              className={`text-sm font-semibold ${
                                isCredit ? "text-green-700" : "text-foreground"
                              }`}
                            >
                              {isCredit ? "+" : ""}
                              {formatNaira(item.amountKobo)}
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })}
                {dashboard.recentSessions.length === 0 &&
                  dashboard.recentTransactions.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-xl border border-border border-dashed">
                      No recent activity
                    </div>
                  )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
