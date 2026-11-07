import { useState, useMemo } from "react";
import { Gift, ArrowDownLeft, ArrowUpRight, Search, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { GiftTransaction } from "@/types/database";
import { formatDiamonds, timeAgo } from "@/lib/handle";

interface TransactionFeedProps {
  transactions: GiftTransaction[];
  direction: "incoming" | "outgoing";
}

export function TransactionFeed({
  transactions,
  direction,
}: TransactionFeedProps) {
  const [query, setQuery] = useState("");
  const isIncoming = direction === "incoming";
  const Icon = isIncoming ? ArrowDownLeft : ArrowUpRight;
  const accent = isIncoming ? "text-success" : "text-warning";
  const bgAccent = isIncoming
    ? "bg-success/10 border-success/20"
    : "bg-warning/10 border-warning/20";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        tx.sender_unique_id.toLowerCase().includes(q) ||
        tx.receiver_unique_id.toLowerCase().includes(q) ||
        tx.gift_name.toLowerCase().includes(q),
    );
  }, [transactions, query]);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Gift className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No {direction} gifts yet.{" "}
          {isIncoming
            ? "Gifts you receive will appear here."
            : "Gifts you send will appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search / Filter bar */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Filter by ${isIncoming ? "sender" : "receiver"} handle or gift name…`}
          className="border-border/50 bg-card/40 pl-9 pr-9 text-sm"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Clear filter"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No transactions match "{query}".
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => {
            const counterparty = isIncoming
              ? tx.sender_unique_id
              : tx.receiver_unique_id;
            const avatar = isIncoming ? tx.sender_avatar : null;

            return (
              <div
                key={tx.id}
                className="animate-slide-in flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-3 transition-colors hover:bg-card/70"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${bgAccent}`}
                >
                  <Icon className={`h-5 w-5 ${accent}`} />
                </div>

                <Avatar className="h-9 w-9 shrink-0">
                  {avatar && <AvatarImage src={avatar} alt={counterparty} />}
                  <AvatarFallback className="bg-secondary text-xs font-semibold">
                    {counterparty.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      @{counterparty}
                    </span>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {tx.gift_name}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isIncoming ? "sent you" : "you sent"} ·{" "}
                    {timeAgo(tx.created_at)}
                    {tx.repeat_count > 1 && ` · x${tx.repeat_count}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Gift className={`h-4 w-4 ${accent}`} />
                  <span
                    className={`font-heading text-sm font-semibold ${accent}`}
                  >
                    {formatDiamonds(tx.diamond_cost)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
