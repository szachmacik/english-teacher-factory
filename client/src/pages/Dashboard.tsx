import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState } from "react";
import {
  Youtube, Zap, Plus, Clock, CheckCircle2, AlertCircle,
  Loader2, ArrowRight, Trash2, BookOpen, Gamepad2, LayoutDashboard,
  LogOut, Settings, ChevronRight, Play, RefreshCw
} from "lucide-react";
import { useAuth as useCoreAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const STATUS_CONFIG = {
  pending:      { label: "Pending",      color: "bg-gray-100 text-gray-600",   icon: Clock },
  transcribing: { label: "Transcribing", color: "bg-blue-100 text-blue-600",   icon: Loader2 },
  analyzing:    { label: "Analyzing",    color: "bg-yellow-100 text-yellow-700", icon: Loader2 },
  generating:   { label: "Generating",   color: "bg-purple-100 text-purple-700", icon: Loader2 },
  completed:    { label: "Completed",    color: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  error:        { label: "Error",        color: "bg-red-100 text-red-600",      icon: AlertCircle },
};

export default function Dashboard() {
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: projects, refetch, isLoading } = trpc.factory.projects.list.useQuery(undefined, {
    refetchInterval: 5000,
  });
  const { data: stats } = trpc.factory.stats.overview.useQuery(undefined, {
    refetchInterval: 15000,
  });

  const createProject = trpc.factory.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("🚀 Pipeline started!", { description: "Generating your product ecosystem..." });
      setYoutubeUrl("");
      setIsCreating(false);
      refetch();
      navigate(`/project/${data.projectId}`);
    },
    onError: (err) => {
      toast.error("Failed to start", { description: err.message });
      setIsCreating(false);
    },
  });

  const deleteProject = trpc.factory.projects.delete.useMutation({
    onSuccess: () => { toast.success("Project deleted"); refetch(); },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) { toast.error("Enter a YouTube URL"); return; }
    setIsCreating(true);
    createProject.mutate({ youtubeUrl: youtubeUrl.trim() });
  };

  const activeProjects = projects?.filter(p => ["pending","transcribing","analyzing","generating"].includes(p.status)) || [];
  const completedProjects = projects?.filter(p => p.status === "completed") || [];
  const errorProjects = projects?.filter(p => p.status === "error") || [];

  return (
    <div className="min-h-screen bg-background flex">
      {/* SIDEBAR */}
      <aside className="w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col hidden lg:flex">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-sidebar-foreground">EduFactory</span>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard", active: true },
            { icon: BookOpen, label: "All Products", path: "/products" },
            { icon: Gamepad2, label: "Games", path: "/games" },
            { icon: Settings, label: "Settings", path: "/settings" },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-sidebar-foreground truncate">{user?.name || "Teacher"}</div>
              <div className="text-xs text-sidebar-foreground/50 truncate">{user?.email || ""}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-auto">
        {/* TOP BAR */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {projects?.length || 0} project{projects?.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
        </div>

        <div className="p-6 space-y-8 max-w-5xl">
          {/* NEW PROJECT FORM */}
          <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">New Project</h2>
            </div>
            <form onSubmit={handleCreate} className="flex gap-3">
              <div className="flex-1 flex items-center gap-3 bg-background border border-border rounded-xl px-4">
                <Youtube className="w-5 h-5 text-red-500 shrink-0" />
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="border-0 bg-transparent focus-visible:ring-0 text-sm"
                />
              </div>
              <Button type="submit" disabled={isCreating} className="shrink-0">
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Generate Pack
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-3">
              Generates 11 products + 6 games + 6 Canva designs automatically
            </p>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Projects", value: stats?.projects ?? 0, emoji: "📁", color: "text-blue-600" },
              { label: "Completed", value: stats?.completed ?? 0, emoji: "✅", color: "text-green-600" },
              { label: "Est. Products", value: stats?.products ?? 0, emoji: "📄", color: "text-purple-600" },
              { label: "Est. Games", value: stats?.games ?? 0, emoji: "🎮", color: "text-orange-600" },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ACTIVE PROJECTS */}
          {activeProjects.length > 0 && (
            <div>
              <h2 className="font-bold text-base mb-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                In Production ({activeProjects.length})
              </h2>
              <div className="space-y-3">
                {activeProjects.map((p) => {
                  const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/project/${p.id}`)}
                      className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/40 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Youtube className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{p.title || p.youtubeUrl}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.youtubeId && `youtube.com/watch?v=${p.youtubeId}`}
                        </div>
                      </div>
                      <Badge className={`${cfg.color} border-0 shrink-0`}>
                        <Icon className={`w-3 h-3 mr-1 ${["transcribing","analyzing","generating"].includes(p.status) ? "animate-spin" : ""}`} />
                        {cfg.label}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COMPLETED PROJECTS */}
          {completedProjects.length > 0 && (
            <div>
              <h2 className="font-bold text-base mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Completed ({completedProjects.length})
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {completedProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/project/${p.id}`)}
                    className="product-card bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/40"
                  >
                    {p.thumbnailUrl ? (
                      <img src={p.thumbnailUrl} alt={p.title || ""} className="w-full h-36 object-cover" />
                    ) : (
                      <div className="w-full h-36 bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center">
                        <Youtube className="w-10 h-10 text-red-500/50" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">{p.title || "Untitled"}</h3>
                        <Badge className="bg-green-100 text-green-700 border-0 shrink-0 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {p.cefrLevel && <span className="font-medium text-primary">{p.cefrLevel}</span>}
                        <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                          <BookOpen className="w-3 h-3 mr-1" /> Products
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs">
                          <Gamepad2 className="w-3 h-3 mr-1" /> Games
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ERROR PROJECTS */}
          {errorProjects.length > 0 && (
            <div>
              <h2 className="font-bold text-base mb-3 flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                Failed ({errorProjects.length})
              </h2>
              <div className="space-y-2">
                {errorProjects.map((p) => (
                  <div key={p.id} className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-center gap-4">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{p.title || p.youtubeUrl}</div>
                      <div className="text-xs text-destructive/70 mt-0.5">{p.errorMessage}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteProject.mutate({ id: p.id })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {!isLoading && (!projects || projects.length === 0) && (
            <div className="text-center py-20">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Youtube className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-sm mb-6">
                Paste a YouTube URL above to generate your first teaching pack
              </p>
              <Button onClick={() => setYoutubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")}>
                <Play className="w-4 h-4 mr-2" /> Try Demo Video
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
