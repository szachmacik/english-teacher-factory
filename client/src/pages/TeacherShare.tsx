import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Copy, Share2, Trophy, Users, Gamepad2, TrendingUp,
  CheckCircle2, Clock, Star, RefreshCw, ExternalLink, Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function TeacherShare() {
  useAuth({ redirectOnUnauthenticated: true });
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = parseInt(params.id || "0");

  const { data: projectData, isLoading: projectLoading } = trpc.factory.projects.get.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  const { data: sessionData, isLoading: sessionsLoading, refetch } = trpc.factory.sessions.byProject.useQuery(
    { projectId },
    { enabled: !!projectId, refetchInterval: 10000 }
  );

  const copyGameLink = (token: string, title: string) => {
    const url = `${window.location.origin}/game/${token}`;
    navigator.clipboard.writeText(url);
    toast.success(`Link copied!`, { description: `Share "${title}" with students` });
  };

  const copyAllLinks = () => {
    if (!projectData?.games) return;
    const links = projectData.games
      .filter(g => g.isPublic && g.shareToken)
      .map(g => `${g.title}: ${window.location.origin}/game/${g.shareToken}`)
      .join("\n");
    navigator.clipboard.writeText(links);
    toast.success("All game links copied!");
  };

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const project = projectData?.project;
  const games = projectData?.games ?? [];
  const stats = sessionData?.stats ?? { totalPlays: 0, avgScore: 0, completionRate: 0, topPlayers: [] };
  const sessions = sessionData?.sessions ?? [];
  const publicGames = games.filter(g => g.isPublic && g.shareToken);

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Project
          </Button>
          <div className="flex-1">
            <h1 className="font-bold">Teacher Share Hub</h1>
            <p className="text-xs text-muted-foreground truncate">{project?.title || "Loading..."}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          {publicGames.length > 0 && (
            <Button size="sm" onClick={copyAllLinks}>
              <Copy className="w-4 h-4 mr-2" /> Copy All Links
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* LIVE STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Plays", value: stats.totalPlays, icon: Gamepad2, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Avg Score", value: `${stats.avgScore}%`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
            { label: "Completion Rate", value: `${stats.completionRate}%`, icon: CheckCircle2, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Unique Players", value: stats.topPlayers.length, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
          ].map(stat => (
            <Card key={stat.label} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="games">
          <TabsList>
            <TabsTrigger value="games">Game Links ({publicGames.length})</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="sessions">Recent Sessions ({sessions.length})</TabsTrigger>
          </TabsList>

          {/* GAME LINKS */}
          <TabsContent value="games" className="mt-4">
            {publicGames.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No public games yet</p>
                  <p className="text-sm mt-1">Generate games from your project to share with students</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicGames.map(game => {
                  const gameUrl = `${window.location.origin}/game/${game.shareToken ?? ""}`;
                  return (
                    <Card key={game.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-semibold text-sm">{game.title}</div>
                            <Badge variant="secondary" className="mt-1 capitalize text-xs">
                              {game.type.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Gamepad2 className="w-3 h-3" />
                            {game.plays ?? 0}
                          </div>
                        </div>
                        <div className="bg-muted rounded-lg p-2 mb-3">
                          <p className="text-xs text-muted-foreground truncate font-mono">{gameUrl}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => copyGameLink(game.shareToken ?? "", game.title ?? "")}
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copy
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(gameUrl, "_blank")}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (navigator.share) {
                                navigator.share({ title: game.title ?? "", url: gameUrl ?? "" });
                              } else {
                                copyGameLink(game.shareToken ?? "", game.title ?? "");
                              }
                            }}
                          >
                            <Share2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* LEADERBOARD */}
          <TabsContent value="leaderboard" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Top Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.topPlayers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No players yet — share game links with students!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.topPlayers.map((player, i) => (
                      <div key={player.name} className="flex items-center gap-4 p-3 rounded-xl bg-muted/50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          i === 0 ? "bg-yellow-100 text-yellow-700" :
                          i === 1 ? "bg-gray-100 text-gray-600" :
                          i === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {i < 3 ? ["🥇","🥈","🥉"][i] : i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{player.name}</div>
                          <div className="text-xs text-muted-foreground">{player.plays} game{player.plays !== 1 ? "s" : ""} played</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm">{player.bestScore}%</div>
                          <div className="text-xs text-muted-foreground">best score</div>
                        </div>
                        <div className="w-24">
                          <Progress value={player.bestScore} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RECENT SESSIONS */}
          <TabsContent value="sessions" className="mt-4">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Recent Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sessions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>No sessions recorded yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Player</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Score</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Time</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map(session => {
                          const pct = session.maxScore > 0 ? Math.round((session.score / session.maxScore) * 100) : 0;
                          return (
                            <tr key={session.id} className="border-b border-border/50 hover:bg-muted/30">
                              <td className="py-2 px-3 font-medium">{session.playerName}</td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <span className={`font-bold ${pct >= 80 ? "text-green-600" : pct >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                                    {pct}%
                                  </span>
                                  <span className="text-muted-foreground text-xs">({session.score}/{session.maxScore})</span>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">
                                {session.timeSeconds ? `${Math.floor(session.timeSeconds / 60)}m ${session.timeSeconds % 60}s` : "—"}
                              </td>
                              <td className="py-2 px-3">
                                {session.completed === 1 ? (
                                  <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">In Progress</Badge>
                                )}
                              </td>
                              <td className="py-2 px-3 text-muted-foreground text-xs">
                                {new Date(session.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
