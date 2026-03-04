import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Copy, Play, Trophy, Gamepad2, Loader2,
  ExternalLink, Share2, BarChart3, Users, Clock
} from "lucide-react";

const GAME_META: Record<string, { emoji: string; label: string; gradient: string; desc: string }> = {
  quiz:             { emoji: "🧠", label: "Quiz",             gradient: "from-blue-500 to-indigo-600",    desc: "Multiple choice questions" },
  memory:           { emoji: "🃏", label: "Memory",           gradient: "from-purple-500 to-pink-600",    desc: "Match word pairs" },
  matching:         { emoji: "🔗", label: "Matching",         gradient: "from-green-500 to-teal-600",     desc: "Drag and drop matching" },
  fill_blanks:      { emoji: "✏️", label: "Fill in Blanks",   gradient: "from-orange-500 to-amber-600",   desc: "Complete the sentences" },
  spelling_bee:     { emoji: "🐝", label: "Spelling Bee",     gradient: "from-yellow-500 to-orange-600",  desc: "Type the correct spelling" },
  sentence_scramble:{ emoji: "🔀", label: "Sentence Scramble",gradient: "from-red-500 to-rose-600",       desc: "Unscramble the words" },
};

export default function GamesLibrary() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const { data: projects, isLoading } = trpc.factory.projects.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const completedProjects = (projects || []).filter(p => p.status === "completed");

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/game/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success("Game link copied!", { description: "Share with your students" });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="container flex items-center gap-4 h-16">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold">Games Library</h1>
            <p className="text-xs text-muted-foreground">
              {completedProjects.length} projects · {completedProjects.length * 6} games total
            </p>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* GAME TYPE FILTER */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            size="sm"
            variant={typeFilter === "all" ? "default" : "outline"}
            onClick={() => setTypeFilter("all")}
          >
            All Games
          </Button>
          {Object.entries(GAME_META).map(([type, meta]) => (
            <Button
              key={type}
              size="sm"
              variant={typeFilter === type ? "default" : "outline"}
              onClick={() => setTypeFilter(type)}
              className="text-xs"
            >
              {meta.emoji} {meta.label}
            </Button>
          ))}
        </div>

        {/* GAME TYPE OVERVIEW */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {Object.entries(GAME_META).map(([type, meta]) => (
            <div
              key={type}
              className={`bg-gradient-to-br ${meta.gradient} rounded-2xl p-4 text-white text-center cursor-pointer transition-transform hover:-translate-y-1`}
              onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
            >
              <div className="text-3xl mb-2">{meta.emoji}</div>
              <div className="font-semibold text-sm">{meta.label}</div>
              <div className="text-white/60 text-xs mt-0.5">{meta.desc}</div>
            </div>
          ))}
        </div>

        {/* PROJECTS WITH GAMES */}
        {completedProjects.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
            <div className="text-5xl mb-4">🎮</div>
            <h3 className="font-display font-bold text-lg mb-2">No games yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Create a project from a YouTube URL to generate interactive games
            </p>
            <Button onClick={() => navigate("/dashboard")}>Create First Project</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {completedProjects.map((project) => (
              <div key={project.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Project header */}
                <div
                  className="flex items-center gap-4 p-4 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => navigate(`/project/${project.id}`)}
                >
                  {project.thumbnailUrl ? (
                    <img
                      src={project.thumbnailUrl}
                      alt={project.title || ""}
                      className="w-14 h-9 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-9 bg-muted rounded-lg shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{project.title || "Untitled"}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {project.cefrLevel && <Badge variant="outline" className="text-xs">{project.cefrLevel}</Badge>}
                      <span>{new Date(project.createdAt).toLocaleDateString("pl-PL")}</span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>

                {/* Games grid */}
                <div className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {Object.entries(GAME_META)
                      .filter(([type]) => typeFilter === "all" || typeFilter === type)
                      .map(([type, meta]) => {
                        const gameUrl = `${window.location.origin}/game/PLACEHOLDER-${project.id}-${type}`;
                        return (
                          <div
                            key={type}
                            className="border border-border rounded-xl overflow-hidden hover:shadow-md transition-all"
                          >
                            <div className={`bg-gradient-to-br ${meta.gradient} p-3 text-center text-white`}>
                              <div className="text-2xl">{meta.emoji}</div>
                              <div className="text-xs font-semibold mt-1">{meta.label}</div>
                            </div>
                            <div className="p-2 space-y-1.5">
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs"
                                onClick={() => navigate(`/project/${project.id}`)}
                              >
                                <Play className="w-3 h-3 mr-1" /> Play
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full h-7 text-xs"
                                onClick={() => navigate(`/project/${project.id}`)}
                              >
                                <Copy className="w-3 h-3 mr-1" /> Share
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
