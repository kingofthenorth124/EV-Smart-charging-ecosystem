import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import {
  useListTransactions,
  useListSessions,
} from "@workspace/api-client-react";
import type { TransactionType } from "@workspace/api-client-react";
import { Spinner } from "@/components/ui/spinner";
import { QueryError } from "@/components/query-error";
import { Button } from "@/components/ui/button";
import {
  Bolt,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  HandCoins,
} from "lucide-react";
import { format } from "date-fns";

const formatNaira = (kobo: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(kobo / 100);
};

export default function History() {
  const [tab, setTab] = useState<"TRANSACTIONS" | "SESSIONS">("TRANSACTIONS");
  const [txTypeFilter, setTxTypeFilter] = useState<TransactionType | "ALL">(
    "ALL",
  );
  const [txPage, setTxPage] = useState(1);
  const [sessionsPage, setSessionsPage] = useState(1);
  const limit = 10;

  const {
    data: txData,
    isLoading: isTxLoading,
    isError: isTxError,
    error: txError,
    refetch: refetchTx,
  } = useListTransactions({
    page: txPage,
    limit,
    ...(txTypeFilter !== "ALL" ? { type: txTypeFilter } : {}),
  });

  const {
    data: sessionsData,
    isLoading: isSessionsLoading,
    isError: isSessionsError,
    error: sessionsError,
    refetch: refetchSessions,
  } = useListSessions({ page: sessionsPage, limit });

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-2">
        <div className="flex gap-2 mb-6 border-b border-border/60 pb-4 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setTab("TRANSACTIONS")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === "TRANSACTIONS"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Wallet Transactions
          </button>
          <button
            onClick={() => setTab("SESSIONS")}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${
              tab === "SESSIONS"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Charging Sessions
          </button>
        </div>

        {tab === "TRANSACTIONS" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
              {["ALL", "TOPUP", "CHARGE", "REFUND", "ADJUSTMENT"].map(
                (type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setTxTypeFilter(type as any);
                      setTxPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                      txTypeFilter === type
                        ? "bg-[#1a6b4a] text-white border-[#1a6b4a]"
                        : "bg-card text-muted-foreground border-border hover:bg-muted/50"
                    }`}
                  >
                    {type === "ALL"
                      ? "All Types"
                      : type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ),
              )}
            </div>

            {isTxLoading ? (
              <div className="flex justify-center py-10">
                <Spinner className="size-6 text-primary" />
              </div>
            ) : isTxError ? (
              <QueryError
                title="Couldn't load transactions"
                message={(txError as Error | null)?.message}
                onRetry={() => refetchTx()}
                compact
              />
            ) : txData?.data && txData.data.length > 0 ? (
              <div className="space-y-3">
                {txData.data.map((tx) => {
                  const isCredit = tx.amountKobo > 0;

                  let Icon = HandCoins;
                  if (tx.type === "TOPUP") Icon = ArrowDownRight;
                  if (tx.type === "CHARGE") Icon = ArrowUpRight;
                  if (tx.type === "REFUND") Icon = RefreshCcw;

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-3.5 bg-card border border-border rounded-xl"
                    >
                      <div
                        className={`p-2.5 rounded-lg shrink-0 ${
                          tx.type === "TOPUP"
                            ? "bg-[#e6f1fb] text-[#185fa5] dark:bg-blue-950 dark:text-blue-400"
                            : tx.type === "CHARGE"
                              ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400"
                              : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                        }`}
                      >
                        <Icon className="size-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate text-foreground">
                          {tx.description || tx.type}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <span>
                            {format(
                              new Date(tx.createdAt),
                              "MMM d, yyyy h:mm a",
                            )}
                          </span>
                          {tx.status !== "COMPLETED" && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase">
                              {tx.status}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-bold ${
                            isCredit
                              ? "text-green-600 dark:text-green-500"
                              : "text-foreground"
                          }`}
                        >
                          {isCredit ? "+" : ""}
                          {formatNaira(tx.amountKobo)}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          Bal: {formatNaira(tx.balanceAfterKobo)}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {txData.total > limit && (
                  <div className="flex justify-between items-center pt-4 pb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage === 1}
                      onClick={() => setTxPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground font-medium">
                      Page {txPage} of {Math.ceil(txData.total / limit)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage >= Math.ceil(txData.total / limit)}
                      onClick={() => setTxPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-card border border-border border-dashed rounded-xl mt-4">
                <p className="text-sm font-medium text-foreground">
                  No transactions found
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {txTypeFilter !== "ALL"
                    ? `You have no ${txTypeFilter.toLowerCase()} transactions.`
                    : "Your transaction history is empty."}
                </p>
              </div>
            )}
          </div>
        )}

        {tab === "SESSIONS" && (
          <div className="animate-in fade-in duration-300">
            {isSessionsLoading ? (
              <div className="flex justify-center py-10">
                <Spinner className="size-6 text-primary" />
              </div>
            ) : isSessionsError ? (
              <QueryError
                title="Couldn't load charging sessions"
                message={(sessionsError as Error | null)?.message}
                onRetry={() => refetchSessions()}
                compact
              />
            ) : sessionsData?.data && sessionsData.data.length > 0 ? (
              <div className="space-y-3">
                {sessionsData.data.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-3 p-3.5 bg-card border border-border rounded-xl"
                  >
                    <div className="bg-primary/10 text-primary p-2.5 rounded-lg shrink-0">
                      <Bolt className="size-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate text-foreground flex items-center gap-2">
                        {session.stationName}
                        {session.status === "ACTIVE" && (
                          <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3" />
                          {format(new Date(session.startedAt), "MMM d, h:mm a")}
                        </span>
                        {session.elapsedSeconds &&
                        session.elapsedSeconds > 0 ? (
                          <span>
                            {Math.floor(session.elapsedSeconds / 60)} min{" "}
                            {session.elapsedSeconds % 60} sec
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-foreground">
                        {(session.energyWh / 1000).toFixed(2)} kWh
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {formatNaira(session.costKobo)}
                      </div>
                    </div>
                  </div>
                ))}

                {sessionsData.total > limit && (
                  <div className="flex justify-between items-center pt-4 pb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={sessionsPage === 1}
                      onClick={() => setSessionsPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground font-medium">
                      Page {sessionsPage} of{" "}
                      {Math.ceil(sessionsData.total / limit)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        sessionsPage >= Math.ceil(sessionsData.total / limit)
                      }
                      onClick={() => setSessionsPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-card border border-border border-dashed rounded-xl mt-4">
                <p className="text-sm font-medium text-foreground">
                  No sessions found
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You haven't started any charging sessions yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
