import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@/lib/router-compat";
import {
  ArrowLeft,
  Loader2,
  Save,
  User,
  Hash,
  Calendar,
  Radio,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { formatDiamonds } from "@/lib/handle";
import type { TrackedTarget, GiftTransaction } from "@/types/database";

const Profile = () => {
  const navigate = useNavigate();
  const { session, profile, loading, signOut } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [target, setTarget] = useState<TrackedTarget | null>(null);
  const [targetLoading, setTargetLoading] = useState(true);
  const [stats, setStats] = useState({
    incoming: 0,
    outgoing: 0,
    incomingCount: 0,
    outgoingCount: 0,
  });

  const fetchTarget = useCallback(async () => {
    if (!profile?.unique_id) return;
    setTargetLoading(true);
    const { data } = await supabase
      .from("tracked_targets")
      .select("*")
      .eq("unique_id", profile.unique_id)
      .maybeSingle();
    setTarget(data ?? null);
    setTargetLoading(false);
  }, [profile?.unique_id]);

  const fetchStats = useCallback(async () => {
    if (!profile?.unique_id) return;
    const [inRes, outRes] = await Promise.all([
      supabase
        .from("gift_transactions")
        .select("diamond_cost")
        .eq("receiver_unique_id", profile.unique_id),
      supabase
        .from("gift_transactions")
        .select("diamond_cost")
        .eq("sender_unique_id", profile.unique_id),
    ]);
    const inData = (inRes.data ?? []) as Pick<
      GiftTransaction,
      "diamond_cost"
    >[];
    const outData = (outRes.data ?? []) as Pick<
      GiftTransaction,
      "diamond_cost"
    >[];
    setStats({
      incoming: inData.reduce((s, t) => s + t.diamond_cost, 0),
      outgoing: outData.reduce((s, t) => s + t.diamond_cost, 0),
      incomingCount: inData.length,
      outgoingCount: outData.length,
    });
  }, [profile?.unique_id]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      fetchTarget();
      fetchStats();
    }
  }, [profile, fetchTarget, fetchStats]);

  const handleSaveName = async () => {
    if (!session?.user || !profile) return;
    setSavingName(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null })
      .eq("id", session.user.id);
    setSavingName(false);

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Profile updated", description: "Display name saved." });
  };

  const handleSyncTarget = async () => {
    if (!profile?.unique_id) return;
    const { error } = await supabase.from("tracked_targets").upsert({
      unique_id: profile.unique_id,
      is_registered_user: true,
    });
    if (error) {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Handle synced",
      description: `@${profile.unique_id} is now tracked.`,
    });
    fetchTarget();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted-foreground">
          You must be signed in to view this page.
        </p>
        <Button onClick={() => navigate("/")}>Back to Home</Button>
      </div>
    );
  }

  const initials = profile.unique_id.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img
            src="https://vibe.filesafe.space/1787424071490784212/attachments/423818d0-b9b2-4421-8931-0e1c394ee885.png"
            alt="TokNomics"
            className="h-7 w-auto rounded-md"
          />
          <span className="font-heading text-lg font-bold">
            Profile Settings
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Profile Identity Card */}
        <Card className="relative overflow-hidden border-border/50 bg-card/60 backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-60" />
          <CardContent className="relative p-6">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <Avatar className="h-20 w-20 shrink-0 border-2 border-primary/30">
                {profile.avatar_url && (
                  <AvatarImage
                    src={profile.avatar_url}
                    alt={profile.display_name ?? profile.unique_id}
                  />
                )}
                <AvatarFallback className="bg-secondary text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 space-y-1">
                <h1 className="font-heading text-2xl font-bold">
                  {profile.display_name ?? `@${profile.unique_id}`}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <User className="h-3 w-3" />@{profile.unique_id}
                  </Badge>
                  {target?.is_live && (
                    <Badge
                      variant="default"
                      className="gap-1 bg-destructive/90"
                    >
                      <span className="live-dot h-1.5 w-1.5 rounded-full bg-white" />{" "}
                      LIVE
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-5 bg-border/50" />

            {/* Detail rows */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow
                icon={Hash}
                label="TikTok User ID"
                value={profile.tiktok_user_id}
                mono
              />
              <DetailRow
                icon={Calendar}
                label="Member Since"
                value={new Date(profile.created_at).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  },
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Gift Stats Card */}
        <Card className="border-border/50 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Gift Activity
            </CardTitle>
            <CardDescription>
              Your diamond flow across all tracked streams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border/40 bg-secondary/30 p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Diamonds Received
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-success">
                  {formatDiamonds(stats.incoming)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stats.incomingCount} gifts
                </p>
              </div>
              <div className="rounded-lg border border-border/40 bg-secondary/30 p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Diamonds Sent
                </p>
                <p className="mt-1 font-heading text-2xl font-bold text-warning">
                  {formatDiamonds(stats.outgoing)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {stats.outgoingCount} gifts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Display Name Card */}
        <Card className="border-border/50 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Display Name</CardTitle>
            <CardDescription>
              Update how your name appears across the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="displayName">Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={48}
                />
              </div>
              <Button
                onClick={handleSaveName}
                disabled={
                  savingName ||
                  displayName.trim() === (profile.display_name ?? "")
                }
                className="sm:w-auto"
              >
                {savingName ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tracked Handle Card */}
        <Card className="border-border/50 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-heading text-lg">
              Tracked Handle
            </CardTitle>
            <CardDescription>
              Your handle must be tracked for the worker to monitor your live
              stream gift activity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {targetLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading tracking
                status...
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-secondary/30 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                  <Radio
                    className={`h-5 w-5 ${target?.is_live ? "text-success" : "text-muted-foreground/50"}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">@{profile.unique_id}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {target ? (
                      <>
                        <Badge
                          variant={target.is_live ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {target.is_live ? "LIVE" : "Offline"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Registered User
                        </Badge>
                        {target.last_checked_at && (
                          <span className="text-xs text-muted-foreground">
                            Last checked{" "}
                            {new Date(target.last_checked_at).toLocaleString()}
                          </span>
                        )}
                      </>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        Not Tracked
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncTarget}
                  className="shrink-0"
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  {target ? "Re-sync" : "Track Now"}
                </Button>
              </div>
            )}

            <a
              href={`https://www.tiktok.com/@${profile.unique_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              View on TikTok
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="font-heading text-lg text-destructive">
              Session
            </CardTitle>
            <CardDescription>
              Sign out of your GiftStream account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={signOut}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

// ---- Helper component for detail rows ----
function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/50">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p
          className={`truncate text-sm font-medium ${mono ? "font-mono" : ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default Profile;
