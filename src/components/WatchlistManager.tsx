import { useState } from "react";
import { Plus, Radio, Trash2, Loader2, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { isValidHandle, sanitizeHandle } from "@/lib/handle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { TrackedTarget } from "@/types/database";

interface WatchlistManagerProps {
  targets: TrackedTarget[];
  currentHandle: string | null;
  onTargetsChanged: () => void;
}

export function WatchlistManager({
  targets,
  currentHandle,
  onTargetsChanged,
}: WatchlistManagerProps) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { session } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = sanitizeHandle(input);
    if (!isValidHandle(handle)) {
      toast({
        title: "Invalid handle",
        description:
          "Use 2-24 characters: letters, numbers, dots, and underscores only.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const userId = session?.user?.id;
    if (!userId) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add targets.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from("tracked_targets").upsert({
      unique_id: handle,
      user_id: userId,
      is_registered_user: handle === currentHandle,
    } as any);

    setSubmitting(false);

    if (error) {
      toast({
        title: "Failed to add target",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Target added", description: `Now monitoring @${handle}` });
    setInput("");
    onTargetsChanged();
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    const { error } = await supabase
      .from("tracked_targets")
      .delete()
      .eq("id", id);
    setRemovingId(null);

    if (error) {
      toast({
        title: "Failed to remove target",
        description: "You can only remove targets that you added.",
        variant: "destructive",
      });
      return;
    }
    onTargetsChanged();
  };

  return (
    <Card className="border-border/50 bg-card/60 backdrop-blur">
      <CardHeader>
        <CardTitle className="font-heading text-lg">
          Watchlist Manager
        </CardTitle>
        <CardDescription>
          Monitor any TikTok live stream for gift activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              @
            </span>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="tiktok_handle"
              className="pl-7"
              disabled={submitting}
            />
          </div>
          <Button type="submit" disabled={submitting || !input.trim()}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </Button>
        </form>

        <div className="space-y-2">
          {targets.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No targets being monitored yet.
            </p>
          ) : (
            targets.map((target) => (
              <div
                key={target.id}
                className="flex items-center gap-3 rounded-lg border border-border/40 bg-secondary/30 p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
                  {target.is_registered_user ? (
                    <User className="h-4 w-4 text-primary" />
                  ) : (
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    @{target.unique_id}
                  </p>
                  <div className="flex items-center gap-2">
                    {target.is_live ? (
                      <Badge
                        variant="default"
                        className="gap-1 bg-destructive/90 text-xs"
                      >
                        <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />{" "}
                        LIVE
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Offline
                      </Badge>
                    )}
                    {target.is_registered_user && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                </div>

                <Radio
                  className={`h-4 w-4 ${target.is_live ? "text-success" : "text-muted-foreground/40"}`}
                />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={removingId === target.id}
                  onClick={() => handleRemove(target.id)}
                >
                  {removingId === target.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
