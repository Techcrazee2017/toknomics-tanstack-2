import {
  Gift,
  TrendingUp,
  TrendingDown,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LeaderboardEntry } from "@/types/database";
import { formatDiamonds } from "@/lib/handle";

interface MetricsCardsProps {
  incomingDiamonds: number;
  outgoingDiamonds: number;
  incomingGifts: number;
  outgoingGifts: number;
}

export function MetricsCards({
  incomingDiamonds,
  outgoingDiamonds,
  incomingGifts,
  outgoingGifts,
}: MetricsCardsProps) {
  const metrics = [
    {
      label: "Diamonds Received",
      value: formatDiamonds(incomingDiamonds),
      sub: `${incomingGifts} gifts`,
      icon: TrendingDown,
      accent: "text-success",
      glow: "from-success/20",
    },
    {
      label: "Diamonds Sent",
      value: formatDiamonds(outgoingDiamonds),
      sub: `${outgoingGifts} gifts`,
      icon: TrendingUp,
      accent: "text-warning",
      glow: "from-warning/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {metrics.map((m) => (
        <Card
          key={m.label}
          className="relative overflow-hidden border-border/50 bg-card/60 backdrop-blur"
        >
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${m.glow} to-transparent opacity-50`}
          />
          <CardContent className="relative flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {m.label}
              </p>
              <p className="mt-1 font-heading text-3xl font-bold text-foreground">
                {m.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{m.sub}</p>
            </div>
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/50 ${m.accent}`}
            >
              <m.icon className="h-7 w-7" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

interface LeaderboardCardProps {
  title: string;
  entries: LeaderboardEntry[];
  direction: "givers" | "receivers";
}

export function LeaderboardCard({
  title,
  entries,
  direction,
}: LeaderboardCardProps) {
  const Icon = direction === "givers" ? ArrowUpRight : ArrowDownRight;
  const accent = direction === "givers" ? "text-warning" : "text-success";

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Icon className={`h-5 w-5 ${accent}`} />
          <h3 className="font-heading text-lg font-semibold">{title}</h3>
        </div>
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No data yet
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div
                key={entry.unique_id}
                className="flex items-center gap-3 rounded-lg border border-border/40 bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold">
                  {i === 0 ? <Crown className="h-4 w-4 text-warning" /> : i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    @{entry.unique_id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.gift_count} gifts
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-right">
                  <Gift className={`h-4 w-4 ${accent}`} />
                  <span className="font-heading text-sm font-semibold">
                    {formatDiamonds(entry.total_diamonds)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
