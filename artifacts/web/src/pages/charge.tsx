import { useState, useEffect } from "react";
import { AppLayout } from "@/components/app-layout";
import { 
  useListStations, 
  useStartSession, 
  useGetActiveSession, 
  useStopSession, 
  useGetWallet,
  getGetActiveSessionQueryKey,
  getGetDashboardQueryKey,
  getGetWalletQueryKey,
  getListSessionsQueryKey,
  getListTransactionsQueryKey
} from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Bolt, MapPin, PlugZap, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";

const formatNaira = (kobo: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(kobo / 100);
};

export default function Charge() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [limitNaira, setLimitNaira] = useState<number>(1000);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const {
    data: walletData,
    isError: isWalletError,
    error: walletError,
    refetch: refetchWallet,
  } = useGetWallet();
  const {
    data: stationsData,
    isLoading: isStationsLoading,
    isError: isStationsError,
    error: stationsError,
    refetch: refetchStations,
  } = useListStations();

  const {
    data: activeSessionData,
    isLoading: isActiveSessionLoading,
    isError: isActiveSessionError,
    error: activeSessionError,
    refetch: refetchActiveSession,
  } = useGetActiveSession({
    query: {
      queryKey: getGetActiveSessionQueryKey(),
      refetchInterval: 3000,
    }
  });

  const startSessionMutation = useStartSession();
  const stopSessionMutation = useStopSession();

  const activeSession = activeSessionData?.session;

  const handleStartSession = async () => {
    if (!selectedStationId) return;
    if (walletData && walletData.balanceKobo < walletData.minBalanceKobo) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least ${formatNaira(walletData.minBalanceKobo)} to start a session.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsStarting(true);
      await startSessionMutation.mutateAsync({
        data: {
          stationId: selectedStationId,
          limitKobo: limitNaira > 0 ? limitNaira * 100 : undefined,
        }
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      
      toast({
        title: "Session Started",
        description: "Your charging session has begun successfully.",
      });
    } catch (error) {
      toast({
        title: "Failed to start session",
        description: (error as { message?: string }).message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    
    try {
      setIsStopping(true);
      await stopSessionMutation.mutateAsync({
        id: activeSession.id
      });
      
      // Invalidate everything to reflect completed session and accurate wallet state
      queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      
      toast({
        title: "Session Stopped",
        description: "Your charging session has ended.",
      });
    } catch (error) {
      toast({
        title: "Failed to stop session",
        description: (error as { message?: string }).message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsStopping(false);
    }
  };

  if (isActiveSessionLoading || isStationsLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <Spinner className="size-8 text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Failed fetches must surface as actionable errors, never as empty views.
  if (isActiveSessionError || isStationsError || isWalletError) {
    const error = activeSessionError || stationsError || walletError;
    return (
      <AppLayout>
        <div className="max-w-xl mx-auto py-6">
          <QueryError
            title="Couldn't load charging data"
            message={(error as Error | null)?.message}
            onRetry={() => {
              if (isActiveSessionError) refetchActiveSession();
              if (isStationsError) refetchStations();
              if (isWalletError) refetchWallet();
            }}
          />
        </div>
      </AppLayout>
    );
  }

  // Active Session View
  if (activeSession) {
    const hours = Math.floor((activeSession.elapsedSeconds || 0) / 3600);
    const minutes = Math.floor(((activeSession.elapsedSeconds || 0) % 3600) / 60);
    const seconds = (activeSession.elapsedSeconds || 0) % 60;
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-6 text-center animate-in fade-in duration-500">
          <div className="mb-8">
            <h2 className="text-xl font-bold">{activeSession.stationName}</h2>
            <p className="text-sm text-muted-foreground flex justify-center items-center gap-1 mt-1">
              <MapPin className="size-3" /> {activeSession.stationLocation}
            </p>
          </div>

          <div className="relative w-48 h-48 mx-auto mb-10">
            <div className="absolute inset-0 rounded-full border-[8px] border-muted"></div>
            <div className="absolute inset-0 rounded-full border-[8px] border-primary border-t-transparent animate-spin duration-1000"></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Bolt className="size-8 text-[#f0a500] mb-1 animate-pulse" />
              <div className="text-3xl font-mono font-bold tracking-tighter text-foreground">
                {(activeSession.energyWh / 1000).toFixed(2)}
              </div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                kWh
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-10">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                Duration
              </div>
              <div className="text-xl font-mono font-medium">{timeString}</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                Cost
              </div>
              <div className="text-xl font-mono font-medium text-primary">
                {formatNaira(activeSession.costKobo)}
              </div>
            </div>
          </div>

          <Button 
            variant="destructive" 
            size="lg" 
            className="w-full h-14 text-base font-semibold uppercase tracking-wider"
            onClick={handleStopSession}
            disabled={isStopping}
          >
            {isStopping ? <Spinner className="size-5 mr-2" /> : null}
            {isStopping ? "Stopping..." : "Stop Session"}
          </Button>
        </div>
      </AppLayout>
    );
  }

  const hasSufficientBalance = walletData ? walletData.balanceKobo >= walletData.minBalanceKobo : false;
  const missingBalanceAmt = walletData && !hasSufficientBalance ? walletData.minBalanceKobo - walletData.balanceKobo : 0;

  // Station Selection View
  return (
    <AppLayout>
      <div className="max-w-xl mx-auto py-2">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Select a station
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide">
            <PlugZap className="size-3" />
            OCPP 1.6 / 2.0.1
          </div>
        </div>

        {stationsData && stationsData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {stationsData.map((station) => {
              const isSelected = selectedStationId === station.id;
              const isAvailable = station.status === "AVAILABLE";
              
              return (
                <div
                  key={station.id}
                  onClick={() => isAvailable && setSelectedStationId(station.id)}
                  className={`border rounded-xl p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(var(--primary))] ring-1 ring-primary"
                      : isAvailable 
                        ? "border-border bg-card hover:border-primary/50 hover:bg-muted/30 cursor-pointer"
                        : "border-border/50 bg-muted/20 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="font-semibold text-sm mb-1">{station.name}</div>
                  <div className="text-xs text-muted-foreground mb-3">{station.powerKw} kW {station.connectorType}</div>
                  
                  <div className="flex items-center justify-between mt-auto">
                    <div className="text-[10px] font-mono text-muted-foreground">
                      ID: {station.id.split('-')[0].toUpperCase()}
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-bold ${
                      isAvailable ? "text-green-600" : 
                      station.status === "BUSY" ? "text-amber-600" : "text-gray-500"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isAvailable ? "bg-green-600" : 
                        station.status === "BUSY" ? "bg-amber-600" : "bg-gray-500"
                      }`} />
                      {station.status === "AVAILABLE" ? "AVAILABLE" : 
                       station.status === "BUSY" ? "IN USE" : "OFFLINE"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-card border border-border border-dashed rounded-xl mb-8">
            <AlertCircle className="size-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">No stations found</p>
            <p className="text-xs text-muted-foreground mt-1">Check back later for available chargers.</p>
          </div>
        )}

        <div className={`transition-opacity duration-300 ${selectedStationId ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Spend Limit (Optional)
              </label>
              <div className="font-mono text-sm font-bold text-primary">
                {limitNaira === 0 ? 'No limit' : formatNaira(limitNaira * 100)}
              </div>
            </div>
            <Slider
              value={[limitNaira]}
              onValueChange={(val) => setLimitNaira(val[0])}
              max={10000}
              min={0}
              step={500}
              className="mb-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Unlimited</span>
              <span>₦10,000</span>
            </div>
          </div>

          {!hasSufficientBalance && walletData && (
            <div className="mb-4 p-3 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-900/50 flex gap-3 text-sm">
              <AlertTriangle className="size-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Insufficient Balance</p>
                <p className="text-xs mt-1">You need at least {formatNaira(walletData.minBalanceKobo)} to start charging. Please top up your wallet by {formatNaira(missingBalanceAmt)} or more.</p>
              </div>
            </div>
          )}

          <Button 
            className="w-full h-14 text-base font-semibold"
            onClick={handleStartSession}
            disabled={!selectedStationId || isStarting || !hasSufficientBalance}
          >
            {isStarting ? (
              <Spinner className="size-5 mr-2" />
            ) : (
              <Bolt className="size-5 mr-2" fill="currentColor" />
            )}
            {isStarting ? "Starting..." : "Start Charging"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
