import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { 
  useTopUpWallet, 
  useGetWallet,
  getGetWalletQueryKey,
  getGetDashboardQueryKey,
  getListTransactionsQueryKey
} from "@workspace/api-client-react";
import type { TopUpMethod, WalletTransaction } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, Building, Smartphone, Wallet, CheckCircle2 } from "lucide-react";

const formatNaira = (kobo: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(kobo / 100);
};

export default function TopUp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [amountNaira, setAmountNaira] = useState<string>("1000");
  const [customMode, setCustomMode] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<TopUpMethod>("CARD");
  const [isProcessing, setIsProcessing] = useState(false);
  const [successTx, setSuccessTx] = useState<WalletTransaction | null>(null);

  const {
    data: walletData,
    isLoading: isWalletLoading,
    isError: isWalletError,
    error: walletError,
    refetch: refetchWallet,
  } = useGetWallet();
  const topUpMutation = useTopUpWallet();

  const handleAmountSelect = (val: string) => {
    setAmountNaira(val);
    setCustomMode(false);
  };

  const currentAmount = parseFloat(amountNaira) || 0;
  const isValidAmount = currentAmount >= 100; // API min is 10000 kobo (₦100)

  const handleTopUp = async () => {
    if (!isValidAmount) return;
    
    try {
      setIsProcessing(true);
      const res = await topUpMutation.mutateAsync({
        data: {
          amountKobo: currentAmount * 100,
          method: selectedMethod,
        }
      });
      
      // Invalidate queries to update wallet balance and transaction history
      queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey() });
      
      setSuccessTx(res.transaction);
      
    } catch (error) {
      toast({
        title: "Top up failed",
        description: (error as { message?: string }).message ?? "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isWalletLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <Spinner className="size-8 text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isWalletError) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-6">
          <QueryError
            title="Couldn't load your wallet"
            message={(walletError as Error | null)?.message}
            onRetry={() => refetchWallet()}
          />
        </div>
      </AppLayout>
    );
  }

  if (successTx) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto py-10 text-center animate-in fade-in zoom-in duration-500">
          <div className="size-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="size-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Top Up Successful</h2>
          <p className="text-muted-foreground mb-8">
            You have successfully added <span className="font-semibold text-foreground">{formatNaira(successTx.amountKobo)}</span> to your wallet.
          </p>
          
          <div className="bg-card border border-border rounded-xl p-5 mb-8 text-left text-sm space-y-3 shadow-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reference</span>
              <span className="font-mono text-xs font-semibold">{successTx.reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span className="font-medium capitalize">{successTx.method?.replace(/_/g, " ").toLowerCase()}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-border">
              <span className="text-muted-foreground font-medium">New Balance</span>
              <span className="font-bold text-primary">{formatNaira(successTx.balanceAfterKobo)}</span>
            </div>
          </div>
          
          <Button 
            className="w-full h-12"
            onClick={() => {
              setSuccessTx(null);
              setAmountNaira("1000");
            }}
          >
            Done
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-md mx-auto py-2">
        <div className="mb-6 flex items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border">
          <div className="bg-primary/10 p-3 rounded-full shrink-0">
            <Wallet className="size-6 text-primary" />
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-bold mb-0.5">
              Current Balance
            </div>
            <div className="text-xl font-bold tracking-tight text-foreground">
              {walletData ? formatNaira(walletData.balanceKobo) : "—"}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Select Amount
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {["1000", "2000", "5000", "10000", "20000"].map((amt) => (
              <button
                key={amt}
                onClick={() => handleAmountSelect(amt)}
                className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                  !customMode && amountNaira === amt
                    ? "bg-[#f0a500]/10 border-2 border-[#f0a500] text-[#854f0b] dark:text-[#f0a500]"
                    : "bg-card border border-border text-foreground hover:border-primary/40"
                }`}
              >
                ₦{Number(amt).toLocaleString()}
              </button>
            ))}
            <button
              onClick={() => {
                setCustomMode(true);
                setAmountNaira("");
              }}
              className={`py-3 rounded-lg text-sm font-semibold transition-all ${
                customMode
                  ? "bg-[#f0a500]/10 border-2 border-[#f0a500] text-[#854f0b] dark:text-[#f0a500]"
                  : "bg-card border border-border text-foreground hover:border-primary/40"
              }`}
            >
              Other
            </button>
          </div>
          
          {customMode && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₦</span>
                <Input
                  type="number"
                  value={amountNaira}
                  onChange={(e) => setAmountNaira(e.target.value)}
                  placeholder="Enter amount"
                  className="pl-8 h-14 text-lg font-semibold"
                  autoFocus
                />
              </div>
              {currentAmount > 0 && currentAmount < 100 && (
                <p className="text-xs text-red-500 mt-2 font-medium">Minimum amount is ₦100</p>
              )}
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-3 border-t-[color:var(--color-blue-700)] border-r-[color:var(--color-blue-700)] border-b-[color:var(--color-blue-700)] border-l-[color:var(--color-blue-700)]">
            Payment Method
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "CARD", label: "Card", icon: CreditCard },
              { id: "BANK_TRANSFER", label: "Transfer", icon: Building },
              { id: "USSD", label: "USSD", icon: Smartphone },
            ].map((method) => {
              const isSelected = selectedMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id as TopUpMethod)}
                  className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/40"
                  }`}
                >
                  <method.icon className="size-5" />
                  <span className={`text-xs font-medium ${isSelected ? "font-bold text-primary" : ""}`}>
                    {method.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex justify-between text-sm mb-2 text-muted-foreground">
            <span>Amount</span>
            <span>{currentAmount > 0 ? formatNaira(currentAmount * 100) : "₦0.00"}</span>
          </div>
          <div className="flex justify-between text-sm mb-3 text-muted-foreground">
            <span>Fee</span>
            <span>₦0.00</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-3 border-t border-border">
            <span>Total</span>
            <span className="text-foreground">{currentAmount > 0 ? formatNaira(currentAmount * 100) : "₦0.00"}</span>
          </div>
        </div>

        <Button 
          className="w-full h-14 text-base font-semibold"
          onClick={handleTopUp}
          disabled={!isValidAmount || isProcessing}
        >
          {isProcessing && <Spinner className="size-5 mr-2" />}
          {isProcessing ? "Processing..." : `Pay ${currentAmount > 0 ? formatNaira(currentAmount * 100) : ""}`}
        </Button>
      </div>
    </AppLayout>
  );
}
