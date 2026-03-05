import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Shuffle, BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";

type CardState = "new" | "learning" | "review" | "mastered";

interface FlashCard {
  id: number;
  word: string;
  definition: string;
  example: string;
  partOfSpeech: string;
  state: CardState;
  interval: number; // days
  easeFactor: number; // SM-2
  repetitions: number;
  dueDate: Date;
}

const QUALITY_LABELS = [
  { q: 0, label: "Blackout", color: "bg-red-500 hover:bg-red-600", desc: "Complete blackout" },
  { q: 1, label: "Hard", color: "bg-orange-500 hover:bg-orange-600", desc: "Incorrect, but remembered" },
  { q: 2, label: "Difficult", color: "bg-yellow-500 hover:bg-yellow-600", desc: "Correct with difficulty" },
  { q: 3, label: "Good", color: "bg-blue-500 hover:bg-blue-600", desc: "Correct after hesitation" },
  { q: 4, label: "Easy", color: "bg-green-500 hover:bg-green-600", desc: "Correct with effort" },
  { q: 5, label: "Perfect", color: "bg-emerald-500 hover:bg-emerald-600", desc: "Perfect recall" },
];

// SM-2 Algorithm
function sm2(card: FlashCard, quality: number): FlashCard {
  let { interval, easeFactor, repetitions } = card;
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions++;
  }
  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const state: CardState = repetitions === 0 ? "learning" : interval >= 21 ? "mastered" : interval >= 7 ? "review" : "learning";
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);
  return { ...card, interval, easeFactor, repetitions, state, dueDate };
}

export default function FlashcardStudy() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const projectId = parseInt(params.id || "0");

  const [cards, setCards] = useState<FlashCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<"study" | "stats">("study");
  const [shuffled, setShuffled] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0, total: 0 });

  const { data: projectData, isLoading } = trpc.factory.projects.get.useQuery(
    { id: projectId },
    { enabled: !!projectId }
  );

  useEffect(() => {
    if (!projectData?.vocabulary) return;
    const vocab = projectData.vocabulary;
    const initialized: FlashCard[] = vocab.map((v, i) => ({
      id: v.id,
      word: v.word,
      definition: v.definition ?? "",
      example: v.exampleSentence ?? "",
      partOfSpeech: v.partOfSpeech ?? "word",
      state: "new",
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      dueDate: new Date(),
    }));
    setCards(initialized);
  }, [projectData]);

  const current = cards[currentIdx];
  const dueCards = cards.filter(c => c.dueDate <= new Date() || c.state === "new");
  const masteredCount = cards.filter(c => c.state === "mastered").length;
  const progress = cards.length > 0 ? Math.round((masteredCount / cards.length) * 100) : 0;

  const handleQuality = useCallback((quality: number) => {
    if (!current) return;
    const updated = sm2(current, quality);
    setCards(prev => prev.map(c => c.id === current.id ? updated : c));
    setSessionStats(prev => ({
      ...prev,
      total: prev.total + 1,
      correct: quality >= 3 ? prev.correct + 1 : prev.correct,
      incorrect: quality < 3 ? prev.incorrect + 1 : prev.incorrect,
    }));
    setFlipped(false);
    // Move to next due card
    const nextDue = cards.findIndex((c, i) => i !== currentIdx && (c.dueDate <= new Date() || c.state === "new"));
    if (nextDue !== -1) {
      setCurrentIdx(nextDue);
    } else {
      toast.success("Session complete! All due cards reviewed.", { description: `${masteredCount + (quality >= 3 ? 1 : 0)} cards mastered` });
    }
  }, [current, cards, currentIdx, masteredCount]);

  const handleShuffle = () => {
    setCards(prev => [...prev].sort(() => Math.random() - 0.5));
    setCurrentIdx(0);
    setFlipped(false);
    setShuffled(true);
    toast.success("Cards shuffled!");
  };

  const handleReset = () => {
    setCards(prev => prev.map(c => ({ ...c, state: "new" as CardState, interval: 0, repetitions: 0, easeFactor: 2.5, dueDate: new Date() })));
    setCurrentIdx(0);
    setFlipped(false);
    setSessionStats({ correct: 0, incorrect: 0, total: 0 });
    toast.success("Progress reset");
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped(f => !f); }
      if (e.key === "ArrowLeft") setCurrentIdx(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setCurrentIdx(i => Math.min(cards.length - 1, i + 1));
      if (flipped) {
        if (e.key === "1") handleQuality(0);
        if (e.key === "2") handleQuality(2);
        if (e.key === "3") handleQuality(3);
        if (e.key === "4") handleQuality(5);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [flipped, handleQuality, cards.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📚</div>
          <h2 className="text-xl font-bold mb-2">No vocabulary found</h2>
          <p className="text-muted-foreground mb-4">This project doesn't have vocabulary items yet.</p>
          <Button onClick={() => navigate(`/project/${projectId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Project
          </Button>
        </div>
      </div>
    );
  }

  const stateColors: Record<CardState, string> = {
    new: "bg-gray-100 text-gray-700",
    learning: "bg-blue-100 text-blue-700",
    review: "bg-yellow-100 text-yellow-700",
    mastered: "bg-green-100 text-green-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* NAV */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/project/${projectId}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Project
          </Button>
          <div className="flex-1">
            <h1 className="font-bold">Flashcard Study</h1>
            <p className="text-xs text-muted-foreground">{projectData?.project?.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={mode === "study" ? "default" : "outline"} size="sm" onClick={() => setMode("study")}>Study</Button>
            <Button variant={mode === "stats" ? "default" : "outline"} size="sm" onClick={() => setMode("stats")}>
              <BarChart3 className="w-4 h-4 mr-1" /> Stats
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* PROGRESS BAR */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{masteredCount}/{cards.length} mastered</span>
            <span className="text-sm text-muted-foreground">{dueCards.length} due today</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex gap-3 mt-3">
            {(["new","learning","review","mastered"] as CardState[]).map(s => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${stateColors[s].split(" ")[0]}`} />
                <span className="text-xs text-muted-foreground capitalize">{s}: {cards.filter(c => c.state === s).length}</span>
              </div>
            ))}
          </div>
        </div>

        {mode === "stats" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Session Total", value: sessionStats.total, color: "text-blue-600" },
                { label: "Correct", value: sessionStats.correct, color: "text-green-600" },
                { label: "Incorrect", value: sessionStats.incorrect, color: "text-red-600" },
              ].map(s => (
                <Card key={s.label} className="border-0 shadow-sm">
                  <CardContent className="p-5 text-center">
                    <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <h3 className="font-semibold mb-4">All Cards</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {cards.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => { setCurrentIdx(i); setMode("study"); setFlipped(false); }}>
                      <Badge className={`${stateColors[c.state]} border-0 text-xs w-20 justify-center`}>{c.state}</Badge>
                      <span className="font-medium text-sm flex-1">{c.word}</span>
                      <span className="text-xs text-muted-foreground">{c.partOfSpeech}</span>
                      <span className="text-xs text-muted-foreground">×{c.repetitions}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* FLASHCARD */}
            <div className="relative mb-6" style={{ perspective: "1000px" }}>
              <div
                className={`relative w-full transition-transform duration-500 cursor-pointer`}
                style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", minHeight: "280px" }}
                onClick={() => setFlipped(f => !f)}
              >
                {/* FRONT */}
                <div className="absolute inset-0 bg-white rounded-2xl shadow-xl border border-border p-8 flex flex-col items-center justify-center"
                  style={{ backfaceVisibility: "hidden" }}>
                  <Badge className={`${stateColors[current?.state ?? "new"]} border-0 mb-4 capitalize`}>{current?.state}</Badge>
                  <div className="text-4xl font-bold text-center mb-3">{current?.word}</div>
                  <div className="text-sm text-muted-foreground italic">{current?.partOfSpeech}</div>
                  <div className="mt-6 text-xs text-muted-foreground">Click to reveal definition</div>
                  <div className="mt-2 text-xs text-muted-foreground opacity-60">or press Space / Enter</div>
                </div>
                {/* BACK */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-xl border border-indigo-200 p-8 flex flex-col items-center justify-center"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                  <div className="text-2xl font-bold text-center mb-4 text-indigo-700">{current?.word}</div>
                  <div className="text-lg text-center mb-4 font-medium">{current?.definition}</div>
                  {current?.example && (
                    <div className="bg-white/70 rounded-xl p-3 text-sm text-muted-foreground italic text-center">
                      "{current.example}"
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* QUALITY BUTTONS (shown after flip) */}
            {flipped && (
              <div className="mb-6">
                <p className="text-center text-sm text-muted-foreground mb-3">How well did you remember?</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {QUALITY_LABELS.map(({ q, label, color, desc }) => (
                    <button key={q} onClick={() => handleQuality(q)}
                      className={`${color} text-white rounded-xl py-2 px-1 text-center transition-all hover:scale-105 active:scale-95`}>
                      <div className="font-bold text-sm">{label}</div>
                      <div className="text-xs opacity-80 hidden sm:block">{desc}</div>
                    </button>
                  ))}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">Keyboard: 1=Blackout, 2=Difficult, 3=Good, 4=Perfect</p>
              </div>
            )}

            {/* NAVIGATION */}
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setFlipped(false); }}
                disabled={currentIdx === 0}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleShuffle}>
                  <Shuffle className="w-4 h-4 mr-1" /> Shuffle
                </Button>
                <span className="text-sm text-muted-foreground font-medium">{currentIdx + 1} / {cards.length}</span>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-1" /> Reset
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setCurrentIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}
                disabled={currentIdx === cards.length - 1}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
