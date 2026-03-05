import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, TrendingUp, Gamepad2, Users, BookOpen, Loader2 } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#14b8a6","#f43f5e"];

const PRODUCT_LABELS: Record<string, string> = {
  worksheet: "Worksheet", vocabulary_list: "Vocabulary", flashcards: "Flashcards",
  grammar_guide: "Grammar", writing_exercise: "Writing", listening_comprehension: "Listening",
  lesson_plan: "Lesson Plan", mini_textbook: "Textbook", discussion_questions: "Discussion",
  homework: "Homework", teacher_notes: "Teacher Notes", crossword: "Crossword",
  word_search: "Word Search", role_play: "Role Play", pronunciation_guide: "Pronunciation",
  song_worksheet: "Song WS", debate_cards: "Debate", error_correction: "Error Fix",
  reading_passage: "Reading", assessment_rubric: "Rubric", parent_newsletter: "Newsletter",
};

export default function Analytics() {
  useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();

  const { data: stats } = trpc.factory.stats.overview.useQuery();
  const { data: analytics, isLoading } = trpc.factory.analytics.overview.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const projectsData = analytics?.projectsOverTime ?? [];
  const productData = (analytics?.productTypeBreakdown ?? []).map(d => ({
    ...d,
    name: PRODUCT_LABELS[d.type] ?? d.type,
  }));
  const topGames = analytics?.topGames ?? [];
  const activityData = analytics?.studentActivity ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Analytics</h1>
            <p className="text-xs text-muted-foreground">Production & student engagement metrics</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* KPI CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Projects", value: stats?.totalProjects ?? 0, icon: BookOpen, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Products Created", value: stats?.totalProducts ?? 0, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Games Published", value: stats?.totalGames ?? 0, icon: Gamepad2, color: "text-pink-600", bg: "bg-pink-50" },
            { label: "Vocabulary Items", value: stats?.totalVocabulary ?? 0, icon: Users, color: "text-orange-600", bg: "bg-orange-50" },
          ].map(kpi => (
            <Card key={kpi.label} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div className="text-3xl font-bold">{kpi.value.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground mt-1">{kpi.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* PROJECTS OVER TIME */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
              Projects Created — Last 30 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectsData.every(d => d.count === 0) ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No projects yet — create your first one!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={projectsData}>
                  <defs>
                    <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }}
                    tickFormatter={v => v.slice(5)} interval={4} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip labelFormatter={v => `Date: ${v}`} formatter={(v: number) => [v, "Projects"]} />
                  <Area type="monotone" dataKey="count" stroke="#6366f1" fill="url(#projGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PRODUCT TYPE BREAKDOWN */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Product Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {productData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  No products generated yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={productData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                      {productData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, "Products"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* TOP GAMES */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Top Games by Plays</CardTitle>
            </CardHeader>
            <CardContent>
              {topGames.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  No games played yet — share your game links!
                </div>
              ) : (
                <div className="space-y-3">
                  {topGames.map((game, i) => (
                    <div key={game.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{game.title}</div>
                        <div className="text-xs text-muted-foreground capitalize">{game.type.replace(/_/g," ")}</div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {game.plays} plays
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* STUDENT ACTIVITY */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-green-500" />
              Student Game Sessions — Last 14 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activityData.every(d => d.sessions === 0) ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                No student sessions yet — share your game links with students!
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip labelFormatter={v => `Date: ${v}`} formatter={(v: number) => [v, "Sessions"]} />
                  <Bar dataKey="sessions" fill="#22c55e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
