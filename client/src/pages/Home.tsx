import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Youtube, Zap, BookOpen, Gamepad2, FileText, Sparkles,
  ChevronRight, Play, Users, Star, ArrowRight, CheckCircle2,
  Brain, PenTool, Headphones, MessageSquare, GraduationCap, Trophy
} from "lucide-react";

const PRODUCT_TYPES = [
  { icon: "📄", label: "Worksheet", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { icon: "📚", label: "Vocabulary List", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { icon: "🃏", label: "Flashcards", color: "bg-pink-50 border-pink-200 text-pink-700" },
  { icon: "📖", label: "Grammar Guide", color: "bg-green-50 border-green-200 text-green-700" },
  { icon: "✏️", label: "Writing Exercises", color: "bg-orange-50 border-orange-200 text-orange-700" },
  { icon: "🎧", label: "Listening Tasks", color: "bg-cyan-50 border-cyan-200 text-cyan-700" },
  { icon: "📋", label: "Lesson Plan", color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  { icon: "📕", label: "Mini Textbook", color: "bg-red-50 border-red-200 text-red-700" },
  { icon: "💬", label: "Discussion Qs", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { icon: "🏠", label: "Homework", color: "bg-teal-50 border-teal-200 text-teal-700" },
  { icon: "📝", label: "Teacher Notes", color: "bg-gray-50 border-gray-200 text-gray-700" },
];

const GAME_TYPES = [
  { icon: "🧠", label: "Quiz", color: "bg-blue-500" },
  { icon: "🃏", label: "Memory Game", color: "bg-purple-500" },
  { icon: "🔗", label: "Matching", color: "bg-green-500" },
  { icon: "✏️", label: "Fill in Blanks", color: "bg-orange-500" },
  { icon: "🐝", label: "Spelling Bee", color: "bg-yellow-500" },
  { icon: "🔀", label: "Sentence Scramble", color: "bg-red-500" },
];

const STATS = [
  { value: "11+", label: "Product Types" },
  { value: "6", label: "Interactive Games" },
  { value: "1-Click", label: "Generation" },
  { value: "∞", label: "Possibilities" },
];

function isValidYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/.test(url);
}

export default function Home() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createProject = trpc.factory.projects.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created! Generating your materials...");
      navigate(`/project/${data.projectId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create project");
      setIsCreating(false);
    },
  });

  const handleCreate = async () => {
    if (!youtubeUrl.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    if (!isValidYouTubeUrl(youtubeUrl)) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    setIsCreating(true);
    createProject.mutate({ youtubeUrl: youtubeUrl.trim() });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg">EduFactory</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
                <Button size="sm" onClick={() => navigate("/dashboard")}>
                  <Sparkles className="w-4 h-4 mr-1.5" /> Create
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => window.location.href = getLoginUrl()}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => window.location.href = getLoginUrl()}>
                  Get Started Free
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero-gradient pt-32 pb-24 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-white/10 text-white border-white/20 text-sm px-4 py-1.5">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              AI-Powered Digital Product Factory for EFL Teachers
            </Badge>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              One YouTube Video.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-cyan-300">
                Entire Lesson Ecosystem.
              </span>
            </h1>

            <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed">
              Paste any YouTube URL and instantly generate worksheets, vocabulary lists, grammar guides,
              lesson plans, interactive games, and more — all ready to sell or use in class.
            </p>

            {/* URL INPUT */}
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-2">
                <div className="flex items-center gap-2 flex-1 bg-white rounded-xl px-4 py-3">
                  <Youtube className="w-5 h-5 text-red-500 shrink-0" />
                  <Input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    placeholder="https://youtube.com/watch?v=..."
                    className="border-0 shadow-none focus-visible:ring-0 p-0 text-foreground placeholder:text-muted-foreground"
                  />
                </div>
                <Button
                  size="lg"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="shrink-0 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 px-6"
                >
                  {isCreating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Generate
                    </div>
                  )}
                </Button>
              </div>
              <p className="text-white/40 text-xs mt-3">
                Works with any English YouTube video — lectures, documentaries, interviews, TED talks
              </p>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-4 gap-6 mt-16 max-w-2xl mx-auto">
              {STATS.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="font-display text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-white/50 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS SHOWCASE */}
      <section className="py-20 px-4 factory-bg">
        <div className="container">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">What Gets Generated</Badge>
            <h2 className="font-display text-3xl font-bold mb-4">11 Digital Products Per Video</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every video generates a complete ecosystem of teaching materials, all customised to the video's content and CEFR level.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {PRODUCT_TYPES.map((p) => (
              <div
                key={p.label}
                className={`flex items-center gap-3 p-4 rounded-xl border ${p.color} font-medium text-sm`}
              >
                <span className="text-2xl">{p.icon}</span>
                <span>{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GAMES SHOWCASE */}
      <section className="py-20 px-4 bg-background">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">Interactive Games</Badge>
              <h2 className="font-display text-3xl font-bold mb-4">
                6 Playable Games — Shareable by Link
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Every project generates 6 interactive games built directly from the video's vocabulary and content.
                Share with students via a unique link — no login required to play.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Brain, text: "Multiple-choice quiz with instant feedback" },
                  { icon: BookOpen, text: "Memory card matching (word ↔ definition)" },
                  { icon: Gamepad2, text: "Drag-and-drop word matching" },
                  { icon: PenTool, text: "Fill in the blanks from transcript" },
                  { icon: Headphones, text: "Spelling bee with text-to-speech" },
                  { icon: MessageSquare, text: "Sentence scramble with Polish hints" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {GAME_TYPES.map((g) => (
                <div
                  key={g.label}
                  className={`${g.color} rounded-2xl p-6 text-white text-center`}
                >
                  <div className="text-4xl mb-3">{g.icon}</div>
                  <div className="font-semibold text-sm">{g.label}</div>
                  <div className="text-white/60 text-xs mt-1">Shareable link</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CANVA SECTION */}
      <section className="py-20 px-4 bg-gradient-to-br from-pink-50 to-purple-50 border-y border-border">
        <div className="container">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-pink-100 text-pink-700 border-pink-200">
              <PenTool className="w-3.5 h-3.5 mr-1.5" /> Canva Integration
            </Badge>
            <h2 className="font-display text-3xl font-bold mb-4">
              Beautiful Designs, Automatically
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Each product gets a professionally designed Canva template — edit in Canva, export as PDF, PNG, or PPTX.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {[
              { icon: "🎨", title: "Auto-designed", desc: "Canva creates branded templates for each product type" },
              { icon: "✏️", title: "Fully editable", desc: "Open in Canva and customise colours, fonts, images" },
              { icon: "📤", title: "Multi-format export", desc: "Download as PDF, PNG, or PowerPoint presentation" },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-border">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-20 px-4 bg-background">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">From YouTube to sellable products in minutes</p>
          </div>
          <div className="grid sm:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", icon: Youtube, title: "Paste URL", desc: "Any English YouTube video — lectures, interviews, documentaries" },
              { step: "2", icon: Brain, title: "AI Analyses", desc: "Transcribes audio, detects CEFR level, extracts vocabulary & grammar" },
              { step: "3", icon: Sparkles, title: "Factory Generates", desc: "11 products + 6 games created automatically with AI" },
              { step: "4", icon: GraduationCap, title: "Teach & Sell", desc: "Download, share game links, or edit designs in Canva" },
            ].map((item, i) => (
              <div key={item.step} className="text-center relative">
                {i < 3 && (
                  <div className="hidden sm:block absolute top-8 left-full w-full h-px bg-border -translate-x-1/2 z-0" />
                )}
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-primary" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 hero-gradient">
        <div className="container text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Ready to build your first lesson ecosystem?
          </h2>
          <p className="text-white/70 mb-8 max-w-md mx-auto">
            Paste a YouTube URL and watch the factory run. First project is free.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 font-semibold"
              onClick={() => isAuthenticated ? navigate("/dashboard") : window.location.href = getLoginUrl()}
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Creating Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={() => navigate("/dashboard")}
            >
              View Dashboard <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">EduFactory</span>
            <span>— Digital Products for English Teachers</span>
          </div>
          <div>Built with AI + Canva</div>
        </div>
      </footer>
    </div>
  );
}
