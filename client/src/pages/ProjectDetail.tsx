import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState } from "react";
import {
  ArrowLeft, Youtube, BookOpen, Gamepad2, Download, ExternalLink,
  CheckCircle2, Loader2, AlertCircle, Clock, FileText, Headphones,
  PenTool, Users, Sparkles, Copy, Share2, Trophy, Zap, RefreshCw,
  Eye, Edit3, Play
} from "lucide-react";
import ProductPreviewModal from "@/components/ProductPreviewModal";

const PRODUCT_META: Record<string, { icon: string; color: string; label: string }> = {
  worksheet:              { icon: "📄", color: "bg-blue-500",   label: "Worksheet" },
  vocabulary_list:        { icon: "📚", color: "bg-purple-500", label: "Vocabulary List" },
  flashcards:             { icon: "🃏", color: "bg-pink-500",   label: "Flashcards" },
  grammar_guide:          { icon: "📐", color: "bg-orange-500", label: "Grammar Guide" },
  writing_exercise:       { icon: "✍️", color: "bg-green-500",  label: "Writing Exercises" },
  listening_comprehension:{ icon: "🎧", color: "bg-cyan-500",   label: "Listening Tasks" },
  lesson_plan:            { icon: "📋", color: "bg-yellow-500", label: "Lesson Plan" },
  mini_textbook:          { icon: "📖", color: "bg-red-500",    label: "Mini Textbook" },
  discussion_questions:   { icon: "💬", color: "bg-indigo-500", label: "Discussion Qs" },
  homework:               { icon: "🏠", color: "bg-teal-500",   label: "Homework" },
  teacher_notes:          { icon: "👩‍🏫", color: "bg-violet-500", label: "Teacher Notes" },
};

const GAME_META: Record<string, { emoji: string; label: string; color: string }> = {
  quiz:             { emoji: "🧠", label: "Quiz",          color: "from-blue-500 to-blue-600" },
  memory:           { emoji: "🃏", label: "Memory",        color: "from-purple-500 to-purple-600" },
  matching:         { emoji: "🔗", label: "Matching",      color: "from-green-500 to-green-600" },
  fill_blanks:      { emoji: "✏️", label: "Fill Blanks",   color: "from-orange-500 to-orange-600" },
  spelling_bee:     { emoji: "🐝", label: "Spelling Bee",  color: "from-yellow-500 to-yellow-600" },
  sentence_scramble:{ emoji: "🔀", label: "Scramble",      color: "from-red-500 to-red-600" },
};

const STATUS_CONFIG = {
  pending:   { label: "Pending",    color: "bg-gray-100 text-gray-600",    spin: false },
  generating:{ label: "Generating", color: "bg-blue-100 text-blue-700",    spin: true  },
  designing: { label: "Designing",  color: "bg-purple-100 text-purple-700",spin: true  },
  completed: { label: "Ready",      color: "bg-green-100 text-green-700",  spin: false },
  error:     { label: "Error",      color: "bg-red-100 text-red-600",      spin: false },
};

export default function ProjectDetail() {
  useAuth({ redirectOnUnauthenticated: true });
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedGame, setSelectedGame] = useState<any>(null);
  const [exportingId, setExportingId] = useState<number | null>(null);

  const projectId = parseInt(params.id || "0");

  const { data, isLoading, refetch } = trpc.factory.projects.get.useQuery(
    { id: projectId },
    {
      refetchInterval: 4000,
      enabled: !!projectId,
    }
  );

  const exportCanva = trpc.factory.products.exportCanva.useMutation({
    onSuccess: (result) => {
      toast.success("Export ready!", {
        description: (
          <a href={result.downloadUrl} target="_blank" rel="noopener noreferrer" className="underline">
            Download {result.format.toUpperCase()}
          </a>
        ) as any,
      });
      setExportingId(null);
      refetch();
    },
    onError: (err) => {
      toast.error("Export failed", { description: err.message });
      setExportingId(null);
    },
  });

  const exportAll = trpc.factory.canva.exportAll.useMutation({
    onSuccess: (result) => {
      toast.success(`Exported ${result.exported} products to PDF`);
      refetch();
    },
    onError: (err) => toast.error("Export failed", { description: err.message }),
  });

  const generateSocialMedia = trpc.factory.canva.generateSocialMedia.useMutation({
    onSuccess: (result) => {
      if (result.editUrl) {
        toast.success("Social media post created in Canva!", {
          description: (
            <a href={result.editUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Open in Canva to edit
            </a>
          ) as any,
        });
      } else {
        toast.success("Social media post generated!");
      }
    },
    onError: (err) => toast.error("Failed to generate", { description: err.message }),
  });

  const generateThumbnail = trpc.factory.canva.generateThumbnail.useMutation({
    onSuccess: (result) => {
      if (result.editUrl) {
        toast.success("YouTube thumbnail created in Canva!", {
          description: (
            <a href={result.editUrl} target="_blank" rel="noopener noreferrer" className="underline">
              Open in Canva to edit
            </a>
          ) as any,
        });
      } else {
        toast.success("Thumbnail generated!");
      }
    },
    onError: (err) => toast.error("Failed to generate", { description: err.message }),
  });

  const copyGameLink = (token: string) => {
    const url = `${window.location.origin}/game/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Game link copied!", { description: "Share with your students" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
          <p className="font-semibold">Project not found</p>
          <Button className="mt-4" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const { project, products, games, vocabulary } = data;
  const isProcessing = ["pending","transcribing","analyzing","generating"].includes(project.status);
  const completedProducts = products.filter(p => p.status === "completed");
  const completedGames = games;

  return (
    <div className="min-h-screen bg-background">
      {/* TOP NAV */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold truncate">{project.title || "Processing..."}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {project.cefrLevel && <Badge variant="outline" className="text-xs">{project.cefrLevel}</Badge>}
              {project.topics && Array.isArray(project.topics) && project.topics.slice(0,3).map((t: string) => (
                <span key={t} className="text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            {completedProducts.some(p => p.canvaDesignId) && (
              <Button
                size="sm"
                onClick={() => exportAll.mutate({ projectId })}
                disabled={exportAll.isPending}
              >
                {exportAll.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                Export All PDFs
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* STATUS BANNER */}
        {isProcessing && (
          <div className="mb-6 bg-primary/5 border border-primary/20 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center pulse-ring">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-bold">Factory is running...</div>
                <div className="text-sm text-muted-foreground capitalize">{project.status.replace(/_/g," ")}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Transcription", done: ["analyzing","generating","completed"].includes(project.status) },
                { label: "AI Analysis", done: ["generating","completed"].includes(project.status) },
                { label: "Products", done: completedProducts.length > 0 },
                { label: "Games", done: completedGames.length > 0 },
              ].map((step) => (
                <div key={step.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${step.done ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"}`}>
                  {step.done ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Loader2 className="w-4 h-4 shrink-0 animate-spin" />}
                  {step.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIDEO INFO */}
        {project.thumbnailUrl && (
          <div className="mb-6 bg-card border border-border rounded-2xl overflow-hidden flex flex-col sm:flex-row gap-0">
            <img src={project.thumbnailUrl} alt={project.title || ""} className="w-full sm:w-64 h-40 object-cover" />
            <div className="p-5 flex-1">
              <h2 className="font-bold text-lg mb-1">{project.title}</h2>
              <div className="flex flex-wrap gap-2 mb-3">
                {project.cefrLevel && <Badge variant="outline">{project.cefrLevel} Level</Badge>}
                {project.language && <Badge variant="outline">{project.language.toUpperCase()}</Badge>}
                {vocabulary.length > 0 && <Badge variant="outline">{vocabulary.length} vocabulary items</Badge>}
              </div>
              <a
                href={project.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Youtube className="w-4 h-4 text-red-500" />
                Watch on YouTube
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* TABS */}
        <Tabs defaultValue="products">
          <TabsList className="mb-6">
            <TabsTrigger value="products" className="gap-2">
              <BookOpen className="w-4 h-4" />
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2">
              <Gamepad2 className="w-4 h-4" />
              Games ({games.length})
            </TabsTrigger>
            <TabsTrigger value="vocabulary" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Vocabulary ({vocabulary.length})
            </TabsTrigger>
            <TabsTrigger value="canva" className="gap-2">
              <Zap className="w-4 h-4" />
              Canva Tools
            </TabsTrigger>
          </TabsList>

          {/* PRODUCTS TAB */}
          <TabsContent value="products">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => {
                const meta = PRODUCT_META[product.type] || { icon: "📄", color: "bg-gray-500", label: product.type };
                const statusCfg = STATUS_CONFIG[product.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                return (
                  <div key={product.id} className="product-card bg-card border border-border rounded-xl overflow-hidden">
                    <div className={`h-2 ${product.status === "completed" ? "bg-green-500" : product.status === "error" ? "bg-red-500" : "bg-primary/30"}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{meta.icon}</span>
                          <div>
                            <div className="font-semibold text-sm">{meta.label}</div>
                            <Badge className={`${statusCfg.color} border-0 text-xs mt-0.5`}>
                              {statusCfg.spin && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                              {statusCfg.label}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {product.status === "completed" && (
                        <div className="space-y-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-8 text-xs"
                            onClick={() => setSelectedProduct(product)}
                          >
                            <Eye className="w-3 h-3 mr-1.5" /> Preview Content
                          </Button>

                          {product.canvaEditUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full h-8 text-xs"
                              onClick={() => window.open(product.canvaEditUrl!, "_blank")}
                            >
                              <Edit3 className="w-3 h-3 mr-1.5" /> Edit in Canva
                            </Button>
                          )}

                          {product.canvaDesignId && (
                            <div className="flex gap-1.5">
                              {(["pdf","png","pptx"] as const).map((fmt) => {
                                const existing = fmt === "pdf" ? product.pdfUrl : fmt === "png" ? product.pngUrl : product.pptxUrl;
                                return existing ? (
                                  <a
                                    key={fmt}
                                    href={existing}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1"
                                  >
                                    <Button size="sm" variant="secondary" className="w-full h-7 text-xs">
                                      <Download className="w-3 h-3 mr-1" />{fmt.toUpperCase()}
                                    </Button>
                                  </a>
                                ) : (
                                  <Button
                                    key={fmt}
                                    size="sm"
                                    variant="ghost"
                                    className="flex-1 h-7 text-xs border border-dashed border-border"
                                    disabled={exportingId === product.id}
                                    onClick={() => {
                                      setExportingId(product.id);
                                      exportCanva.mutate({ productId: product.id, format: fmt });
                                    }}
                                  >
                                    {exportingId === product.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>{fmt.toUpperCase()}</>
                                    )}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {product.status === "error" && (
                        <p className="text-xs text-destructive mt-2">{product.errorMessage}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* GAMES TAB */}
          <TabsContent value="games">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map((game) => {
                const meta = GAME_META[game.type] || { emoji: "🎮", label: game.type, color: "from-gray-500 to-gray-600" };
                const gameUrl = `${window.location.origin}/game/${game.shareToken}`;
                return (
                  <div key={game.id} className="game-card bg-card border border-border rounded-xl overflow-hidden">
                    <div className={`h-24 bg-gradient-to-br ${meta.color} flex items-center justify-center`}>
                      <span className="text-5xl">{meta.emoji}</span>
                    </div>
                    <div className="p-4">
                      <div className="font-bold mb-1">{meta.label}</div>
                      <div className="text-xs text-muted-foreground mb-3 line-clamp-1">{game.title}</div>
                      <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
                        <Trophy className="w-3 h-3" />
                        <span>{game.plays || 0} plays</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => window.open(gameUrl, "_blank")}
                        >
                          <Play className="w-3 h-3 mr-1" /> Play
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs px-3"
                          onClick={() => copyGameLink(game.shareToken)}
                        >
                          <Copy className="w-3 h-3 mr-1" /> Share
                        </Button>
                      </div>
                      <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground truncate font-mono">
                        {gameUrl}
                      </div>
                    </div>
                  </div>
                );
              })}
              {games.length === 0 && isProcessing && (
                <div className="col-span-3 text-center py-12 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                  <p>Games are being generated...</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* VOCABULARY TAB */}
          <TabsContent value="vocabulary">
            {vocabulary.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vocabulary.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-bold text-primary">{item.word}</span>
                        {item.partOfSpeech && (
                          <span className="text-xs text-muted-foreground ml-2 italic">({item.partOfSpeech})</span>
                        )}
                      </div>
                      {item.cefrLevel && (
                        <Badge variant="outline" className="text-xs shrink-0">{item.cefrLevel}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground mb-1">{item.definition}</p>
                    {item.exampleSentence && (
                      <p className="text-xs text-muted-foreground italic mb-1">"{item.exampleSentence}"</p>
                    )}
                    {item.polishTranslation && (
                      <div className="text-xs font-medium text-primary/70 mt-2">
                        🇵🇱 {item.polishTranslation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                    <p>Extracting vocabulary...</p>
                  </>
                ) : (
                  <p>No vocabulary items found</p>
                )}
              </div>
            )}
          </TabsContent>

          {/* CANVA TOOLS TAB */}
          <TabsContent value="canva">
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* EXPORT ALL */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                    <Download className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-bold mb-1">Export All to PDF</h3>
                  <p className="text-sm text-muted-foreground mb-4">Export all Canva designs as PDF files ready to sell or print.</p>
                  <Button
                    className="w-full"
                    onClick={() => exportAll.mutate({ projectId })}
                    disabled={exportAll.isPending || !completedProducts.some(p => p.canvaDesignId)}
                  >
                    {exportAll.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                    Export All PDFs
                  </Button>
                </div>

                {/* SOCIAL MEDIA */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center mb-3">
                    <Share2 className="w-5 h-5 text-pink-600" />
                  </div>
                  <h3 className="font-bold mb-1">Social Media Post</h3>
                  <p className="text-sm text-muted-foreground mb-4">Generate an Instagram/Facebook post in Canva to promote your materials.</p>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => generateSocialMedia.mutate({ projectId })}
                    disabled={generateSocialMedia.isPending}
                  >
                    {generateSocialMedia.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Generate Post
                  </Button>
                </div>

                {/* YOUTUBE THUMBNAIL */}
                <div className="bg-card border border-border rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center mb-3">
                    <Youtube className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="font-bold mb-1">YouTube Thumbnail</h3>
                  <p className="text-sm text-muted-foreground mb-4">Generate a professional YouTube thumbnail in Canva for your lesson video.</p>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => generateThumbnail.mutate({ projectId })}
                    disabled={generateThumbnail.isPending}
                  >
                    {generateThumbnail.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                    Generate Thumbnail
                  </Button>
                </div>
              </div>

              {/* INDIVIDUAL PRODUCT CANVA LINKS */}
              {completedProducts.filter(p => p.canvaEditUrl || p.canvaDesignId).length > 0 && (
                <div>
                  <h3 className="font-bold mb-3">Individual Product Designs</h3>
                  <div className="space-y-2">
                    {completedProducts.filter(p => p.canvaEditUrl || p.canvaDesignId).map((product) => {
                      const meta = PRODUCT_META[product.type] || { icon: "📄", color: "bg-gray-500", label: product.type };
                      return (
                        <div key={product.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                          <span className="text-2xl">{meta.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{product.title || meta.label}</div>
                            <div className="text-xs text-muted-foreground">{meta.label}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {product.canvaEditUrl && (
                              <Button size="sm" variant="outline" onClick={() => window.open(product.canvaEditUrl!, "_blank")}>
                                <Edit3 className="w-3 h-3 mr-1" /> Edit
                              </Button>
                            )}
                            {product.canvaDesignId && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setExportingId(product.id);
                                  exportCanva.mutate({ productId: product.id, format: "pdf" });
                                }}
                                disabled={exportingId === product.id}
                              >
                                {exportingId === product.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                                PDF
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      {/* PRODUCT PREVIEW MODAL */}
      {selectedProduct && (
        <ProductPreviewModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}


