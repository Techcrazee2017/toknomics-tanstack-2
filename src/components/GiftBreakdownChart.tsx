import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Gift } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GiftTransaction } from "@/types/database";
import { formatDiamonds } from "@/lib/handle";

interface GiftBreakdownChartProps {
  transactions: GiftTransaction[];
}

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

interface ChartDatum {
  name: string;
  value: number;
  count: number;
}

export function GiftBreakdownChart({ transactions }: GiftBreakdownChartProps) {
  const data = useMemo<ChartDatum[]>(() => {
    const map = new Map<string, ChartDatum>();
    for (const tx of transactions) {
      const entry = map.get(tx.gift_name) ?? {
        name: tx.gift_name,
        value: 0,
        count: 0,
      };
      entry.value += tx.diamond_cost;
      entry.count += 1;
      map.set(tx.gift_name, entry);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalDiamonds = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">
            Gift Type Breakdown
          </h3>
        </div>

        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No gifts received yet
          </p>
        ) : (
          <div className="flex flex-col items-center gap-5 sm:flex-row">
            {/* Donut */}
            <div className="relative h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                    stroke="var(--background)"
                    strokeWidth={2}
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                    formatter={(value: number, _name: string, entry) => {
                      const datum = entry.payload as ChartDatum;
                      const pct =
                        totalDiamonds > 0
                          ? ((value / totalDiamonds) * 100).toFixed(1)
                          : "0";
                      return [
                        `${formatDiamonds(value)} · ${datum.count}x (${pct}%)`,
                        datum.name,
                      ];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-heading text-xl font-bold text-foreground">
                  {formatDiamonds(totalDiamonds)}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Total
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="w-full space-y-1.5">
              {data.slice(0, 6).map((d, i) => {
                const pct =
                  totalDiamonds > 0
                    ? ((d.value / totalDiamonds) * 100).toFixed(1)
                    : "0";
                return (
                  <div key={d.name} className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-xs"
                      style={{ background: PALETTE[i % PALETTE.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">
                      {d.name}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {pct}%
                    </span>
                  </div>
                );
              })}
              {data.length > 6 && (
                <p className="pl-5 text-xs text-muted-foreground">
                  +{data.length - 6} more
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
