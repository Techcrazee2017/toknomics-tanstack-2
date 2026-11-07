import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GiftTransaction } from "@/types/database";
import { formatDiamonds } from "@/lib/handle";

interface ActivityChartProps {
  incoming: GiftTransaction[];
  outgoing: GiftTransaction[];
}

interface ChartPoint {
  label: string;
  received: number;
  sent: number;
  ts: number;
}

function buildTimeSeries(
  incoming: GiftTransaction[],
  outgoing: GiftTransaction[],
): ChartPoint[] {
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000; // 24h
  const bucketMs = 2 * 60 * 60 * 1000; // 2h buckets
  const bucketCount = Math.ceil(windowMs / bucketMs);

  const buckets: ChartPoint[] = [];
  for (let i = bucketCount - 1; i >= 0; i--) {
    const ts = now - i * bucketMs;
    const d = new Date(ts);
    buckets.push({
      label: `${d.getHours().toString().padStart(2, "0")}:00`,
      received: 0,
      sent: 0,
      ts,
    });
  }

  const bucketStart = now - windowMs;

  for (const tx of incoming) {
    const t = new Date(tx.created_at).getTime();
    if (t < bucketStart) continue;
    const idx = Math.min(
      Math.floor((t - bucketStart) / bucketMs),
      bucketCount - 1,
    );
    buckets[idx].received += tx.diamond_cost;
  }

  for (const tx of outgoing) {
    const t = new Date(tx.created_at).getTime();
    if (t < bucketStart) continue;
    const idx = Math.min(
      Math.floor((t - bucketStart) / bucketMs),
      bucketCount - 1,
    );
    buckets[idx].sent += tx.diamond_cost;
  }

  return buckets;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover p-3 shadow-xl">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: entry.color }}
          />
          <span className="capitalize text-foreground/80">{entry.name}</span>
          <span className="ml-auto font-semibold text-foreground">
            {formatDiamonds(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ActivityChart({ incoming, outgoing }: ActivityChartProps) {
  const data = useMemo(
    () => buildTimeSeries(incoming, outgoing),
    [incoming, outgoing],
  );

  const hasData = data.some((d) => d.received > 0 || d.sent > 0);

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-heading text-lg font-semibold">
              Live Activity
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--primary)" }}
              />
              <span className="text-muted-foreground">Received</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: "var(--warning)" }}
              />
              <span className="text-muted-foreground">Sent</span>
            </div>
          </div>
        </div>

        {hasData ? (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--primary)"
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient id="gradSent" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--warning)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--warning)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  strokeOpacity={0.3}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                  }
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#gradReceived)"
                  animationDuration={400}
                />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stroke="var(--warning)"
                  strokeWidth={2}
                  fill="url(#gradSent)"
                  animationDuration={400}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-56 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No activity in the last 24 hours
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
