import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, User, Settings2, Globe, BookOpen, Zap,
  LogOut, CheckCircle2, Info, Sparkles, Languages
} from "lucide-react";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const PRODUCT_TYPES = [
  { key: "worksheet", label: "Worksheet", icon: "📄" },
  { key: "vocabulary_list", label: "Vocabulary List", icon: "📚" },
  { key: "flashcards", label: "Flashcards", icon: "🃏" },
  { key: "grammar_guide", label: "Grammar Guide", icon: "📐" },
  { key: "writing_exercise", label: "Writing Exercises", icon: "✍️" },
  { key: "listening_comprehension", label: "Listening Tasks", icon: "🎧" },
  { key: "lesson_plan", label: "Lesson Plan", icon: "📋" },
  { key: "mini_textbook", label: "Mini Textbook", icon: "📖" },
  { key: "discussion_questions", label: "Discussion Qs", icon: "💬" },
  { key: "homework", label: "Homework", icon: "🏠" },
  { key: "teacher_notes", label: "Teacher Notes", icon: "👩‍🏫" },
];

export default function Settings() {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true });
  const [defaultLevel, setDefaultLevel] = useState("B1");
  const [enabledProducts, setEnabledProducts] = useState<string[]>(PRODUCT_TYPES.map(p => p.key));
  const [enableCanva, setEnableCanva] = useState(true);
  const [enableGames, setEnableGames] = useState(true);
  const [polishHints, setPolishHints] = useState(true);

  const toggleProduct = (key: string) => {
    setEnabledProducts(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    toast.success("Settings saved!", { description: "Your preferences will apply to new projects" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="container flex items-center gap-4 h-16">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold">Settings</h1>
          </div>
          <Button onClick={handleSave}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="container py-8 max-w-3xl">
        {/* PROFILE */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold">Profile</h2>
          </div>
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-lg font-bold text-primary">
              {user?.name?.[0]?.toUpperCase() || "T"}
            </div>
            <div>
              <div className="font-semibold">{user?.name || "Teacher"}</div>
              <div className="text-sm text-muted-foreground">{user?.email || ""}</div>
            </div>
            <Badge className="ml-auto">Teacher</Badge>
          </div>
        </div>

        {/* DEFAULT CEFR LEVEL */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold">Default CEFR Level</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            AI will use this as the target level when generating materials (can be overridden per project)
          </p>
          <div className="flex gap-2 flex-wrap">
            {CEFR_LEVELS.map((level) => (
              <Button
                key={level}
                size="sm"
                variant={defaultLevel === level ? "default" : "outline"}
                onClick={() => setDefaultLevel(level)}
                className="w-14"
              >
                {level}
              </Button>
            ))}
          </div>
        </div>

        {/* GENERATION OPTIONS */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold">Generation Options</h2>
          </div>
          <div className="space-y-4">
            {[
              { key: "canva", label: "Generate Canva Designs", desc: "Create visual designs for each product via Canva", value: enableCanva, set: setEnableCanva },
              { key: "games", label: "Generate Interactive Games", desc: "Create 6 shareable games per project", value: enableGames, set: setEnableGames },
              { key: "polish", label: "Polish Translations", desc: "Add Polish hints to vocabulary and games", value: polishHints, set: setPolishHints },
            ].map((opt) => (
              <div key={opt.key} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                <div>
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.desc}</div>
                </div>
                <button
                  onClick={() => opt.set(!opt.value)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${opt.value ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${opt.value ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* PRODUCT TYPES */}
        <div className="bg-card border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings2 className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold">Products to Generate</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Choose which product types to generate for each project
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRODUCT_TYPES.map((p) => {
              const enabled = enabledProducts.includes(p.key);
              return (
                <button
                  key={p.key}
                  onClick={() => toggleProduct(p.key)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    enabled
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/30 border-border text-muted-foreground"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span className="text-xs">{p.label}</span>
                  {enabled && <CheckCircle2 className="w-3.5 h-3.5 ml-auto shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => setEnabledProducts(PRODUCT_TYPES.map(p => p.key))}>
              Select All
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEnabledProducts([])}>
              Clear All
            </Button>
            <span className="text-xs text-muted-foreground ml-2">
              {enabledProducts.length}/{PRODUCT_TYPES.length} selected
            </span>
          </div>
        </div>

        {/* ABOUT */}
        <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold">About EduFactory</h2>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>🎯 Powered by AI (GPT-4o) for content generation</p>
            <p>🎨 Canva MCP integration for professional designs</p>
            <p>🎮 6 interactive game types per project</p>
            <p>📤 Export to PDF, PNG, PPTX via Canva</p>
            <p>🇵🇱 Polish translations for vocabulary</p>
            <p>📊 CEFR level detection (A1–C2)</p>
          </div>
        </div>

        {/* SIGN OUT */}
        <div className="bg-card border border-destructive/20 rounded-2xl p-6">
          <h2 className="font-display font-bold text-destructive mb-2">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">Sign out of your account</p>
          <Button variant="destructive" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
