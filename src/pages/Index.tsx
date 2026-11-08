import { useEffect, useState, useCallback } from "react";
import {
  LogOut,
  Loader2,
  LogIn,
  Settings,
  Sparkles,
  CheckCircle2,
  Link2,
} from "lucide-react";
import { useNavigate } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { MetricsCards, LeaderboardCard } from "@/components/MetricsCards";
import { TransactionFeed } from "@/components/TransactionFeed";
import { WatchlistManager } from "@/components/WatchlistManager";
import { GiftBreakdownChart } from "@/components/GiftBreakdownChart";
import { ActivityChart } from "@/components/ActivityChart";
import type {
  GiftTransaction,
  TrackedTarget,
  LeaderboardEntry,
} from "@/types/database";

const Dashboard = () => {
  const navigate = useNavigate();
  const {
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    connectTikTok,
    disconnectTikTokAccount,
    tiktokConnected,
    tiktokConnecting,
  } = useAuth();

  const [incoming, setIncoming] = useState<GiftTransaction[]>([]);
  const [outgoing, setOutgoing] = useState<GiftTransaction[]>([]);
  const [targets, setTargets] = useState<TrackedTarget[]>([]);
  const [topGivers, setTopGivers] = useState<LeaderboardEntry[]>([]);
  const [topReceivers, setTopReceivers] = useState<LeaderboardEntry[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  // Auth dialog state
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const myHandle = profile?.unique_id ?? null;

  const fetchTargets = useCallback(async () => {
    const { data } = await supabase
      .from("tracked_targets")
      .select("*")
      .order("created_at", { ascending: false });
    setTargets(data ?? []);
  }, []);

  const fetchFeeds = useCallback(async () => {
    if (!myHandle) return;
    setFeedLoading(true);
    const [inRes, outRes] = await Promise.all([
      supabase
        .from("gift_transactions")
        .select("*")
        .eq("receiver_unique_id", myHandle)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("gift_transactions")
        .select("*")
        .eq("sender_unique_id", myHandle)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setIncoming(inRes.data ?? []);
    setOutgoing(outRes.data ?? []);
    setFeedLoading(false);
  }, [myHandle]);

  const fetchLeaderboards = useCallback(async () => {
    const { data: allGifts } = (await supabase
      .from("gift_transactions")
      .select(
        "sender_unique_id, receiver_unique_id, diamond_cost, gift_name",
      )) as { data: GiftTransaction[] | null };

    if (!allGifts) return;

    const giversMap = new Map<string, LeaderboardEntry>();
    const receiversMap = new Map<string, LeaderboardEntry>();

    for (const g of allGifts) {
      const s = giversMap.get(g.sender_unique_id) ?? {
        unique_id: g.sender_unique_id,
        display_name: null,
        avatar_url: null,
        total_diamonds: 0,
        gift_count: 0,
      };
      s.total_diamonds += g.diamond_cost;
      s.gift_count += 1;
      giversMap.set(g.sender_unique_id, s);

      const r = receiversMap.get(g.receiver_unique_id) ?? {
        unique_id: g.receiver_unique_id,
        display_name: null,
        avatar_url: null,
        total_diamonds: 0,
        gift_count: 0,
      };
      r.total_diamonds += g.diamond_cost;
      r.gift_count += 1;
      receiversMap.set(g.receiver_unique_id, r);
    }

    setTopGivers(
      [...giversMap.values()]
        .sort((a, b) => b.total_diamonds - a.total_diamonds)
        .slice(0, 5),
    );
    setTopReceivers(
      [...receiversMap.values()]
        .sort((a, b) => b.total_diamonds - a.total_diamonds)
        .slice(0, 5),
    );
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (!myHandle) return;
    fetchFeeds();
    fetchTargets();
    fetchLeaderboards();
  }, [myHandle, fetchFeeds, fetchTargets, fetchLeaderboards]);

  // Realtime subscription
  useEffect(() => {
    if (!myHandle) return;

    const channel = supabase
      .channel("gift_transactions_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "gift_transactions" },
        (payload) => {
          const tx = payload.new as GiftTransaction;
          if (tx.receiver_unique_id === myHandle) {
            setIncoming((prev) => [tx, ...prev].slice(0, 50));
          }
          if (tx.sender_unique_id === myHandle) {
            setOutgoing((prev) => [tx, ...prev].slice(0, 50));
          }
          fetchLeaderboards();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myHandle, fetchLeaderboards]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleAuth = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) return;
      setAuthSubmitting(true);
      const result =
        authMode === "signin"
          ? await signIn(email, password)
          : await signUp(email, password);
      setAuthSubmitting(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (authMode === "signup") {
        toast.success(
          "Account created! Check your email to confirm, then sign in.",
        );
      }
      setAuthOpen(false);
      setEmail("");
      setPassword("");
    },
    [authMode, email, password, signIn, signUp],
  );

  const handleConnectTikTok = useCallback(async () => {
    try {
      await connectTikTok();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not start TikTok connection.",
      );
    }
  }, [connectTikTok]);

  const handleDisconnectTikTok = useCallback(async () => {
    try {
      await disconnectTikTokAccount();
      toast.success("TikTok disconnected.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not disconnect TikTok.",
      );
    }
  }, [disconnectTikTokAccount]);

  if (!session) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background bg-grid">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="relative z-10 mx-4 max-w-md text-center">
          <div className="mx-auto mb-6 flex h-[488px] w-[896px] max-w-full items-center justify-center">
            <a
              href="https://toknomics.vibepreview.com"
              aria-label="TokNomics home"
            >
              <img
                src="https://assets.cdn.filesafe.space/zaI9iEje5bDbOHKQXqp5/media/6a8a095ead59e6cfedd4ab36.png"
                alt="TokNomics"
                className="h-full w-full object-cover"
              />
            </a>
          </div>
          <h1 className="mb-3 font-heading text-4xl font-bold tracking-tight">
            <span className="text-gradient text-center ml-0 mr-0 pl-5 mb-0 mt-0 pb-0 border-8 border-double border-border shadow-xl not-italic text-6xl font-extrabold text-[#6cf0ec] bg-[#4f47e6] rounded-3xl pr-5 opacity-100 font-mono">
              TokNomics
            </span>
          </h1>
          <p className="mb-[15px] pl-[10px] text-center pb-0 pt-0 text-[#4f47e6] font-bold font-sans rounded-lg shadow-md border-sidebar-primary-foreground border-4 border-none mt-[30px] text-sidebar-primary-foreground bg-[#08061000]">
            Track TikTok live stream gift transactions in real time. Monitor
            incoming and outgoing diamonds, leaderboards, and arbitrary live
            targets.
          </p>
          <div className="space-y-3">
            <Button
              type="button"
              aria-label="Create your TokNomics account."
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full glow-primary-sm not-italic font-extrabold text-center text-lg font-mono rounded-full shadow-md"
              onClick={() => {
                setAuthMode("signup");
                setAuthOpen(true);
              }}
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Get started free
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="Sign in to your TokNomics account."
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap h-11 px-8 w-full font-mono rounded-full"
              onClick={() => {
                setAuthMode("signin");
                setAuthOpen(true);
              }}
            >
              <LogIn className="mr-2 h-5 w-5" />
              Sign in
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Identity uses email/password. After signing in, connect your TikTok
            via Euler Stream to pull live gift data.
          </p>
        </div>

        <Dialog open={authOpen} onOpenChange={setAuthOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {authMode === "signin" ? "Sign in" : "Create your account"}
              </DialogTitle>
              <DialogDescription>
                {authMode === "signin"
                  ? "Sign in to your TokNomics dashboard."
                  : "Create an account to track TikTok live gift activity."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auth-email">Email</Label>
                <Input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auth-password">Password</Label>
                <Input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    authMode === "signin" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={authSubmitting}
              >
                {authSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {authMode === "signin" ? "Sign in" : "Create account"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() =>
                  setAuthMode((m) => (m === "signin" ? "signup" : "signin"))
                }
              >
                {authMode === "signin"
                  ? "Need an account? Sign up"
                  : "Already have an account? Sign in"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const incomingDiamonds = incoming.reduce((s, t) => s + t.diamond_cost, 0);
  const outgoingDiamonds = outgoing.reduce((s, t) => s + t.diamond_cost, 0);

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img
              src="https://vibe.filesafe.space/1787424071490784212/attachments/423818d0-b9b2-4421-8931-0e1c394ee885.png"
              alt="TokNomics"
              className="h-9 w-auto rounded-lg"
            />
            <span className="font-heading text-lg font-bold">TokNomics</span>
          </div>

          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden items-center gap-2 sm:flex">
                <Avatar className="h-8 w-8">
                  {profile.avatar_url && (
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={profile.display_name ?? profile.unique_id}
                    />
                  )}
                  <AvatarFallback className="bg-secondary text-xs">
                    {profile.unique_id.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  @{profile.unique_id}
                </span>
              </div>
            )}
            {tiktokConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectTikTok}
                className="gap-1.5 border-success/40 text-success hover:bg-success/10"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="hidden sm:inline">TikTok connected</span>
                <span className="sm:hidden">Connected</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleConnectTikTok}
                disabled={tiktokConnecting}
                className="gap-1.5"
              >
                {tiktokConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Connect TikTok</span>
                <span className="sm:hidden">Connect</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/profile")}
              className="h-8 w-8"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-1.5 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Metrics */}
        <MetricsCards
          incomingDiamonds={incomingDiamonds}
          outgoingDiamonds={outgoingDiamonds}
          incomingGifts={incoming.length}
          outgoingGifts={outgoing.length}
        />

        {/* Live Activity Chart */}
        <ActivityChart incoming={incoming} outgoing={outgoing} />

        {/* Leaderboards + Gift Breakdown */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <LeaderboardCard
            title="Top Givers"
            entries={topGivers}
            direction="givers"
          />
          <LeaderboardCard
            title="Top Receivers"
            entries={topReceivers}
            direction="receivers"
          />
          <GiftBreakdownChart transactions={incoming} />
        </div>

        {/* Feeds + Watchlist */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Feeds - 2 cols */}
          <Card className="border-border/50 bg-card/60 backdrop-blur lg:col-span-2">
            <CardContent className="p-5">
              <Tabs defaultValue="incoming">
                <TabsList className="mb-4 grid w-full grid-cols-2">
                  <TabsTrigger value="incoming" className="gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    Incoming
                  </TabsTrigger>
                  <TabsTrigger value="outgoing" className="gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    Outgoing
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="incoming">
                  {feedLoading ? (
                    <div className="flex justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <TransactionFeed
                      transactions={incoming}
                      direction="incoming"
                    />
                  )}
                </TabsContent>
                <TabsContent value="outgoing">
                  {feedLoading ? (
                    <div className="flex justify-center py-16">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <TransactionFeed
                      transactions={outgoing}
                      direction="outgoing"
                    />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Watchlist - 1 col */}
          <WatchlistManager
            targets={targets}
            currentHandle={myHandle}
            onTargetsChanged={fetchTargets}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
