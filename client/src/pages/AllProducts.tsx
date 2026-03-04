import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, Search, Filter, Download, Eye, Edit3, BookOpen,
  FileText, Loader2, ExternalLink, Grid3X3, List
} from "lucide-react";
import ProductPreviewModal from "@/components/ProductPreviewModal";

const PRODUCT_META: Record<string, { icon: string; color: string; label: string; bg: string }> = {
  worksheet:              { icon: "📄", color: "text-blue-700",   label: "Worksheet",         bg: "bg-blue-50 border-blue-200" },
  vocabulary_list:        { icon: "📚", color: "text-purple-700", label: "Vocabulary List",   bg: "bg-purple-50 border-purple-200" },
  flashcards:             { icon: "🃏", color: "text-pink-700",   label: "Flashcards",        bg: "bg-pink-50 border-pink-200" },
  grammar_guide:          { icon: "📐", color: "text-orange-700", label: "Grammar Guide",     bg: "bg-orange-50 border-orange-200" },
  writing_exercise:       { icon: "✍️", color: "text-green-700",  label: "Writing Exercises", bg: "bg-green-50 border-green-200" },
  listening_comprehension:{ icon: "🎧", color: "text-cyan-700",   label: "Listening Tasks",   bg: "bg-cyan-50 border-cyan-200" },
  lesson_plan:            { icon: "📋", color: "text-yellow-700", label: "Lesson Plan",       bg: "bg-yellow-50 border-yellow-200" },
  mini_textbook:          { icon: "📖", color: "text-red-700",    label: "Mini Textbook",     bg: "bg-red-50 border-red-200" },
  discussion_questions:   { icon: "💬", color: "text-indigo-700", label: "Discussion Qs",     bg: "bg-indigo-50 border-indigo-200" },
  homework:               { icon: "🏠", color: "text-teal-700",   label: "Homework",          bg: "bg-teal-50 border-teal-200" },
  teacher_notes:          { icon: "👩‍🏫", color: "text-violet-700", label: "Teacher Notes",     bg: "bg-violet-50 border-violet-200" },
  song_worksheet:         { icon: "🎵", color: "text-rose-700",   label: "Song Worksheet",    bg: "bg-rose-50 border-rose-200" },
};

const PRODUCT_TYPES = Object.keys(PRODUCT_META);

export default function AllProducts() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const { data: projects, isLoading } = trpc.factory.projects.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Collect all completed products from all projects
  const allProducts = (projects || [])
    .filter(p => p.status === "completed")
    .flatMap(p => (p as any).completedProducts || []);

  // For now, use a different approach - get products from each project
  // We'll use the projects list and show product counts
  const completedProjects = (projects || []).filter(p => p.status === "completed");

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
            <h1 className="font-display font-bold">Product Library</h1>
            <p className="text-xs text-muted-foreground">{completedProjects.length} completed projects</p>
          </div>
        </div>
      </div>

      <div className="container py-8">
        {/* FILTERS */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2 flex-1 min-w-60 bg-card border border-border rounded-xl px-4 py-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
            />
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "outline"}
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PRODUCT TYPE FILTER */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Button
            size="sm"
            variant={typeFilter === "all" ? "default" : "outline"}
            onClick={() => setTypeFilter("all")}
          >
            All Types
          </Button>
          {PRODUCT_TYPES.map((type) => {
            const meta = PRODUCT_META[type];
            return (
              <Button
                key={type}
                size="sm"
                variant={typeFilter === type ? "default" : "outline"}
                onClick={() => setTypeFilter(type)}
                className="text-xs"
              >
                {meta.icon} {meta.label}
              </Button>
            );
          })}
        </div>

        {/* PROJECTS WITH PRODUCTS */}
        {completedProjects.length === 0 ? (
          <div className="text-center py-20 bg-muted/30 rounded-2xl border border-dashed border-border">
            <div className="text-5xl mb-4">📚</div>
            <h3 className="font-display font-bold text-lg mb-2">No completed projects yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Create a project from a YouTube URL to generate your product library
            </p>
            <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </div>
        ) : (
          <div className="space-y-8">
            {completedProjects
              .filter(p => !search || (p.title || "").toLowerCase().includes(search.toLowerCase()))
              .map((project) => (
                <div key={project.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  {/* Project Header */}
                  <div
                    className="flex items-center gap-4 p-5 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate(`/project/${project.id}`)}
                  >
                    {project.thumbnailUrl ? (
                      <img
                        src={project.thumbnailUrl}
                        alt={project.title || ""}
                        className="w-16 h-10 object-cover rounded-lg shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-10 bg-muted rounded-lg shrink-0 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{project.title || "Untitled"}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {project.cefrLevel && <Badge variant="outline" className="text-xs">{project.cefrLevel}</Badge>}
                        <span>{new Date(project.createdAt).toLocaleDateString("pl-PL")}</span>
                        <span>products</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>

                  {/* Product Type Grid */}
                  <div className="p-5">
                    <div className={viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3"
                      : "space-y-2"
                    }>
                      {PRODUCT_TYPES
                        .filter(type => typeFilter === "all" || typeFilter === type)
                        .map((type) => {
                          const meta = PRODUCT_META[type];
                          return viewMode === "grid" ? (
                            <div
                              key={type}
                              className={`${meta.bg} border rounded-xl p-3 text-center cursor-pointer hover:shadow-sm transition-all`}
                              onClick={() => navigate(`/project/${project.id}`)}
                            >
                              <div className="text-2xl mb-1">{meta.icon}</div>
                              <div className={`text-xs font-medium ${meta.color}`}>{meta.label}</div>
                            </div>
                          ) : (
                            <div
                              key={type}
                              className={`${meta.bg} border rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-all`}
                              onClick={() => navigate(`/project/${project.id}`)}
                            >
                              <span className="text-xl">{meta.icon}</span>
                              <span className={`text-sm font-medium ${meta.color} flex-1`}>{meta.label}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
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

      {selectedProduct && (
        <ProductPreviewModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  );
}
