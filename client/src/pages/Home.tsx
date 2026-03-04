import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import {
  Zap, Youtube, Globe, FileText, Mic, Image, Lightbulb,
  Music, Layers, ArrowRight, BookOpen, Gamepad2, Palette,
  Download, Share2, Star, ChevronRight, Sparkles, Play
} from "lucide-react";

const SOURCES = [
  { icon: Youtube,    label: "YouTube Video",     color: "bg-red-100 text-red-700",     desc: "Extract transcript & metadata" },
  { icon: Globe,      label: "Web Article",        color: "bg-blue-100 text-blue-700",   desc: "Scrape any webpage or blog" },
  { icon: FileText,   label: "PDF Document",       color: "bg-orange-100 text-orange-700", desc: "Upload textbooks or articles" },
  { icon: Mic,        label: "Audio / Podcast",    color: "bg-purple-100 text-purple-700", desc: "AI transcribes & creates" },
  { icon: Image,      label: "Image / Infographic",color: "bg-green-100 text-green-700", desc: "AI reads visual content" },
  { icon: FileText,   label: "Paste Text",         color: "bg-cyan-100 text-cyan-700",   desc: "Any text, story or dialogue" },
  { icon: Lightbulb,  label: "AI Topic Generator", color: "bg-yellow-100 text-yellow-700", desc: "Just give AI a topic" },
  { icon: Mic,        label: "Voice Note",         color: "bg-pink-100 text-pink-700",   desc: "Record lesson ideas" },
  { icon: Music,      label: "Song / Lyrics",      color: "bg-indigo-100 text-indigo-700", desc: "Music-based lessons" },
  { icon: Layers,     label: "Multi-Source Blend", color: "bg-violet-100 text-violet-700", desc: "Combine multiple sources" },
];

const PRODUCTS = [
  { emoji: "📄", label: "Worksheet" },
  { emoji: "📚", label: "Vocabulary List" },
  { emoji: "🃏", label: "Flashcards" },
  { emoji: "📐", label: "Grammar Guide" },
  { emoji: "✍️", label: "Writing Exercise" },
  { emoji: "🎧", label: "Listening Task" },
  { emoji: "📋", label: "Lesson Plan" },
  { emoji: "📖", label: "Mini Textbook" },
  { emoji: "💬", label: "Discussion Qs" },
  { emoji: "🏠", label: "Homework Sheet" },
  { emoji: "👩‍🏫", label: "Teacher Notes" },
  { emoji: "🎵", label: "Song Worksheet" },
  { emoji: "🔲", label: "Crossword" },
  { emoji: "🔍", label: "Word Search" },
  { emoji: "🎭", label: "Role-Play Cards" },
  { emoji: "🗣️", label: "Pronunciation Guide" },
  { emoji: "⚖️", label: "Debate Cards" },
  { emoji: "✏️", label: "Error Correction" },
  { emoji: "📰", label: "Reading Passage" },
  { emoji: "📊", label: "Assessment Rubric" },
  { emoji: "📬", label: "Parent Newsletter" },
];

const GAMES = [
  { emoji: "🧠", label: "Quiz Game" },
  { emoji: "🃏", label: "Memory Cards" },
  { emoji: "🔗", label: "Matching Game" },
  { emoji: "✏️", label: "Fill in Blanks" },
  { emoji: "🐝", label: "Spelling Bee" },
  { emoji: "🔀", label: "Sentence Scramble" },
];

const FEATURES = [
  {
    icon: Zap,
    title: "One Click, Full Ecosystem",
    desc: "From any source to 21 products + 6 games + Canva designs in minutes. No manual work.",
    color: "text-yellow-500",
    bg: "bg-yellow-50",
  },
  {
    icon: Palette,
    title: "Canva MCP Integration",
    desc: "Every product gets a professional Canva design. Export as PDF, PNG or PPTX instantly.",
    color: "text-pink-500",
    bg: "bg-pink-50",
  },
  {
    icon: Gamepad2,
    title: "Interactive Games",
    desc: "6 types of online games with shareable links for students. Leaderboards included.",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    icon: Sparkles,
    title: "AI Context Engine",
    desc: "Configure CEFR level, age group, teaching method, school type — AI adapts everything.",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    icon: Share2,
    title: "Sell-Ready Products",
    desc: "All materials formatted for Etsy, Gumroad, Teachers Pay Teachers or your own store.",
    color: "text-green-500",
    bg: "bg-green-50",
  },
  {
    icon: Download,
    title: "Multi-Format Export",
    desc: "Download as PDF, PNG, PPTX or ZIP bundle. Canva edit links included for customization.",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">EduFactory</span>
            <Badge variant="outline" className="text-xs ml-1">for English Teachers</Badge>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">Hello, {user?.name?.split(" ")[0]}</span>
                <Button onClick={() => navigate("/dashboard")} size="sm">
                  Dashboard <ArrowRight className="w-4 h-4 ml-1" />
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
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/3 to-background" />
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            10 Source Types · 21 Product Types · 6 Game Types · Canva MCP
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight">
            Turn Any Content Into a<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
              Complete Lesson Ecosystem
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            One click generates 21 educational products + 6 interactive games + professional Canva designs
            — ready to sell or use in class immediately.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-base px-8 gap-2"
              onClick={() => isAuthenticated ? navigate("/create") : window.location.href = getLoginUrl()}
            >
              <Zap className="w-5 h-5" />
              Launch the Factory
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 gap-2"
              onClick={() => isAuthenticated ? navigate("/dashboard") : window.location.href = getLoginUrl()}
            >
              <Play className="w-5 h-5" />
              See Demo
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">No credit card required · Free to start</p>
        </div>
      </section>

      {/* SOURCES SECTION */}
      <section className="py-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">10 Ways to Feed the Factory</h2>
            <p className="text-muted-foreground">Any content format becomes a full lesson package</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {SOURCES.map((src, i) => {
              const Icon = src.icon;
              return (
                <div key={i} className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all">
                  <div className={`w-10 h-10 rounded-lg ${src.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="font-semibold text-sm mb-1">{src.label}</div>
                  <div className="text-xs text-muted-foreground">{src.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRODUCTS SECTION */}
      <section className="py-16 bg-muted/30 border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">21 Product Types Generated Automatically</h2>
            <p className="text-muted-foreground">Every product is AI-generated, Canva-designed and export-ready</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3 mb-8">
            {PRODUCTS.map((p, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-3 text-center hover:border-primary/40 transition-colors">
                <div className="text-2xl mb-1">{p.emoji}</div>
                <div className="text-xs font-medium">{p.label}</div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">Plus 6 interactive online games:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {GAMES.map((g, i) => (
                <div key={i} className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2">
                  <span className="text-lg">{g.emoji}</span>
                  <span className="text-sm font-medium">{g.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Everything You Need to Sell Digital Products</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="bg-card border border-border rounded-xl p-6">
                  <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${f.color}`} />
                  </div>
                  <h3 className="font-bold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-20 border-t border-border bg-gradient-to-br from-primary/5 to-purple-500/5">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Your Product Library?</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join teachers who use EduFactory to create and sell premium digital materials.
            One source → full ecosystem in minutes.
          </p>
          <Button
            size="lg"
            className="text-base px-10 gap-2"
            onClick={() => isAuthenticated ? navigate("/create") : window.location.href = getLoginUrl()}
          >
            <Zap className="w-5 h-5" />
            Start Creating for Free
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm">EduFactory</span>
          </div>
          <p className="text-xs text-muted-foreground">Digital product factory for English teachers</p>
        </div>
      </footer>
    </div>
  );
}
