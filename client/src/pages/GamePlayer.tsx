import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";
import { useState, useEffect, useRef } from "react";
import CrosswordGame from "@/components/games/CrosswordGame";
import WordSearchGame from "@/components/games/WordSearchGame";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Trophy, Timer, CheckCircle2, XCircle, ArrowRight, RotateCcw,
  Volume2, Star, Zap, Home
} from "lucide-react";

// ====== QUIZ GAME ======
function QuizGame({ config, onFinish }: { config: any; onFinish: (score: number, max: number, time: number) => void }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const questions = config.questions || [];
  const q = questions[current];

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === q.correctIndex;
    if (correct) setScore(s => s + 1);
    setTimeout(() => {
      if (current + 1 >= questions.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        setShowResult(true);
        onFinish(correct ? score + 1 : score, questions.length, time);
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 1200);
  };

  if (!q) return <div className="text-center text-muted-foreground">No questions available</div>;

  if (showResult) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">{pct >= 80 ? "🏆" : pct >= 60 ? "⭐" : "📚"}</div>
        <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
        <p className="text-muted-foreground mb-4">You scored {score}/{questions.length} ({pct}%)</p>
        <div className="text-sm text-muted-foreground mb-6">Time: {Math.floor(time/60)}:{String(time%60).padStart(2,"0")}</div>
        <Button onClick={() => { setCurrent(0); setSelected(null); setScore(0); setTime(0); setShowResult(false); }}>
          <RotateCcw className="w-4 h-4 mr-2" /> Play Again
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline">{current + 1} / {questions.length}</Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="w-4 h-4" />
          {Math.floor(time/60)}:{String(time%60).padStart(2,"0")}
        </div>
        <Badge className="bg-primary/10 text-primary border-0">Score: {score}</Badge>
      </div>
      <Progress value={((current) / questions.length) * 100} className="mb-6 h-2" />
      <div className="bg-muted/50 rounded-2xl p-6 mb-6">
        <p className="text-lg font-semibold text-center">{q.question}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(q.options || []).map((opt: string, i: number) => {
          let cls = "border-border bg-card hover:border-primary/50 hover:bg-primary/5";
          if (selected !== null) {
            if (i === q.correctIndex) cls = "border-green-500 bg-green-50 text-green-700";
            else if (i === selected && i !== q.correctIndex) cls = "border-red-500 bg-red-50 text-red-700";
          }
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all font-medium text-sm ${cls}`}
            >
              <span className="font-bold mr-2">{String.fromCharCode(65+i)}.</span> {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ====== MEMORY GAME ======
function MemoryGame({ config, onFinish }: { config: any; onFinish: (score: number, max: number, time: number) => void }) {
  const pairs = config.pairs || [];
  const cards = [...pairs.map((p: any, i: number) => ({ id: i*2, pairId: i, text: p.word, type: "word" })),
                 ...pairs.map((p: any, i: number) => ({ id: i*2+1, pairId: i, text: p.definition, type: "def" }))];
  const shuffled = [...cards].sort(() => Math.random() - 0.5);

  const [deck, setDeck] = useState(shuffled);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleFlip = (idx: number) => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(deck[idx].pairId)) return;
    const newFlipped = [...flipped, idx];
    setFlipped(newFlipped);
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (deck[a].pairId === deck[b].pairId && deck[a].type !== deck[b].type) {
        const newMatched = [...matched, deck[a].pairId];
        setMatched(newMatched);
        setFlipped([]);
        if (newMatched.length === pairs.length) {
          if (timerRef.current) clearInterval(timerRef.current);
          onFinish(pairs.length, pairs.length, time);
        }
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  const isFlipped = (idx: number) => flipped.includes(idx) || matched.includes(deck[idx].pairId);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline">Moves: {moves}</Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="w-4 h-4" />
          {Math.floor(time/60)}:{String(time%60).padStart(2,"0")}
        </div>
        <Badge className="bg-green-100 text-green-700 border-0">Matched: {matched.length}/{pairs.length}</Badge>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {deck.map((card, idx) => {
          const isMatch = matched.includes(card.pairId);
          return (
            <button
              key={card.id}
              onClick={() => handleFlip(idx)}
              className={`h-24 rounded-xl border-2 text-xs font-medium transition-all p-2 ${
                isFlipped(idx)
                  ? isMatch
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted hover:border-primary/50 cursor-pointer"
              }`}
            >
              {isFlipped(idx) ? (
                <span className="line-clamp-3 text-center">{card.text}</span>
              ) : (
                <span className="text-2xl">🃏</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ====== MATCHING GAME ======
function MatchingGame({ config, onFinish }: { config: any; onFinish: (score: number, max: number, time: number) => void }) {
  const pairs = (config.pairs || []).slice(0, 8);
  const [selected, setSelected] = useState<{ side: "left"|"right"; idx: number } | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrong, setWrong] = useState<{ side: "left"|"right"; idx: number } | null>(null);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rightItems = [...pairs].sort(() => Math.random() - 0.5);
  const [rights] = useState(rightItems);

  useEffect(() => {
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleSelect = (side: "left"|"right", idx: number) => {
    if (matched.includes(idx)) return;
    if (!selected) { setSelected({ side, idx }); return; }
    if (selected.side === side) { setSelected({ side, idx }); return; }

    const leftIdx = side === "right" ? selected.idx : idx;
    const rightIdx = side === "right" ? idx : selected.idx;
    const leftWord = pairs[leftIdx]?.word;
    const rightWord = rights[rightIdx]?.word;

    if (leftWord === rightWord) {
      const newMatched = [...matched, leftIdx];
      setMatched(newMatched);
      setScore(s => s + 1);
      setSelected(null);
      if (newMatched.length === pairs.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        onFinish(pairs.length, pairs.length, time);
      }
    } else {
      setWrong({ side, idx });
      setTimeout(() => { setWrong(null); setSelected(null); }, 800);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Badge className="bg-primary/10 text-primary border-0">Score: {score}/{pairs.length}</Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="w-4 h-4" />
          {Math.floor(time/60)}:{String(time%60).padStart(2,"0")}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Words</p>
          {pairs.map((p: any, i: number) => {
            const isMatched = matched.includes(i);
            const isSel = selected?.side === "left" && selected.idx === i;
            return (
              <button
                key={i}
                onClick={() => !isMatched && handleSelect("left", i)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  isMatched ? "border-green-500 bg-green-50 text-green-700" :
                  isSel ? "border-primary bg-primary/10 text-primary" :
                  "border-border bg-card hover:border-primary/50"
                }`}
              >
                {p.word}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Definitions</p>
          {rights.map((p: any, i: number) => {
            const pairIdx = pairs.findIndex((pair: any) => pair.word === p.word);
            const isMatched = matched.includes(pairIdx);
            const isSel = selected?.side === "right" && selected.idx === i;
            return (
              <button
                key={i}
                onClick={() => !isMatched && handleSelect("right", i)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 text-xs transition-all ${
                  isMatched ? "border-green-500 bg-green-50 text-green-700" :
                  isSel ? "border-primary bg-primary/10 text-primary" :
                  "border-border bg-card hover:border-primary/50"
                }`}
              >
                {p.definition}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ====== FILL BLANKS GAME ======
function FillBlanksGame({ config, onFinish }: { config: any; onFinish: (score: number, max: number, time: number) => void }) {
  const sentences = config.sentences || [];
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct"|"wrong"|null>(null);
  const [time, setTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const s = sentences[current];

  const handleSubmit = () => {
    if (!input.trim()) return;
    const correct = input.trim().toLowerCase() === s.answer.toLowerCase();
    setFeedback(correct ? "correct" : "wrong");
    if (correct) setScore(sc => sc + 1);
    setTimeout(() => {
      if (current + 1 >= sentences.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        onFinish(correct ? score + 1 : score, sentences.length, time);
      } else {
        setCurrent(c => c + 1);
        setInput("");
        setFeedback(null);
      }
    }, 1200);
  };

  if (!s) return <div className="text-center text-muted-foreground">No sentences available</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline">{current + 1} / {sentences.length}</Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="w-4 h-4" />
          {Math.floor(time/60)}:{String(time%60).padStart(2,"0")}
        </div>
        <Badge className="bg-primary/10 text-primary border-0">Score: {score}</Badge>
      </div>
      <Progress value={(current / sentences.length) * 100} className="mb-6 h-2" />
      <div className="bg-muted/50 rounded-2xl p-6 mb-6 text-center">
        <p className="text-lg font-semibold">
          {s.sentence.replace("___", "______")}
        </p>
        {s.hint && <p className="text-sm text-muted-foreground mt-2 italic">Hint: {s.hint}</p>}
      </div>
      <div className={`flex gap-3 transition-all ${feedback === "correct" ? "opacity-70" : ""}`}>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Type the missing word..."
          className={`text-base ${feedback === "correct" ? "border-green-500" : feedback === "wrong" ? "border-red-500" : ""}`}
          disabled={!!feedback}
        />
        <Button onClick={handleSubmit} disabled={!!feedback || !input.trim()}>
          {feedback === "correct" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> :
           feedback === "wrong" ? <XCircle className="w-4 h-4 text-red-500" /> :
           <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
      {feedback === "wrong" && (
        <p className="text-sm text-red-600 mt-2">Correct answer: <strong>{s.answer}</strong></p>
      )}
    </div>
  );
}

// ====== SPELLING BEE GAME ======
function SpellingBeeGame({ config, onFinish }: { config: any; onFinish: (score: number, max: number, time: number) => void }) {
  const words = config.words || [];
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<"correct"|"wrong"|null>(null);
  const [revealed, setRevealed] = useState(false);
  const [time, setTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const w = words[current];

  const speak = () => {
    if ("speechSynthesis" in window && w) {
      const utt = new SpeechSynthesisUtterance(w.word);
      utt.lang = "en-US";
      utt.rate = 0.8;
      window.speechSynthesis.speak(utt);
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    const correct = input.trim().toLowerCase() === w.word.toLowerCase();
    setFeedback(correct ? "correct" : "wrong");
    if (correct) setScore(sc => sc + 1);
    setTimeout(() => {
      if (current + 1 >= words.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        onFinish(correct ? score + 1 : score, words.length, time);
      } else {
        setCurrent(c => c + 1);
        setInput("");
        setFeedback(null);
        setRevealed(false);
      }
    }, 1500);
  };

  if (!w) return <div className="text-center text-muted-foreground">No words available</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline">{current + 1} / {words.length}</Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="w-4 h-4" />
          {Math.floor(time/60)}:{String(time%60).padStart(2,"0")}
        </div>
        <Badge className="bg-primary/10 text-primary border-0">Score: {score}</Badge>
      </div>
      <Progress value={(current / words.length) * 100} className="mb-6 h-2" />
      <div className="bg-muted/50 rounded-2xl p-8 mb-6 text-center">
        <p className="text-sm text-muted-foreground mb-4">Listen and spell the word</p>
        <Button size="lg" variant="outline" onClick={speak} className="mb-4 gap-2">
          <Volume2 className="w-5 h-5" /> Hear Word
        </Button>
        {w.definition && <p className="text-sm text-muted-foreground italic mt-2">"{w.definition}"</p>}
        {revealed && <p className="text-lg font-bold text-primary mt-3">{w.word}</p>}
      </div>
      <div className="flex gap-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Spell the word..."
          className={`text-base ${feedback === "correct" ? "border-green-500" : feedback === "wrong" ? "border-red-500" : ""}`}
          disabled={!!feedback}
        />
        <Button onClick={handleSubmit} disabled={!!feedback || !input.trim()}>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex gap-2 mt-3">
        <Button variant="ghost" size="sm" onClick={() => setRevealed(true)} className="text-xs text-muted-foreground">
          Reveal word
        </Button>
        <Button variant="ghost" size="sm" onClick={speak} className="text-xs text-muted-foreground">
          <Volume2 className="w-3 h-3 mr-1" /> Hear again
        </Button>
      </div>
      {feedback === "wrong" && (
        <p className="text-sm text-red-600 mt-2">Correct spelling: <strong>{w.word}</strong></p>
      )}
    </div>
  );
}

// ====== SENTENCE SCRAMBLE GAME ======
function SentenceScrambleGame({ config, onFinish }: { config: any; onFinish: (score: number, max: number, time: number) => void }) {
  const sentences = config.sentences || [];
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const s = sentences[current];
  const [words, setWords] = useState<string[]>(() => (s?.words || s?.sentence?.split(" ") || []).sort(() => Math.random() - 0.5));
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct"|"wrong"|null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (s) setWords((s.words || s.sentence?.split(" ") || []).sort(() => Math.random() - 0.5));
  }, [current]);

  const addWord = (word: string, idx: number) => {
    setSelected(prev => [...prev, word]);
    setWords(prev => prev.filter((_, i) => i !== idx));
  };

  const removeWord = (word: string, idx: number) => {
    setWords(prev => [...prev, word]);
    setSelected(prev => prev.filter((_, i) => i !== idx));
  };

  const checkAnswer = () => {
    const answer = selected.join(" ");
    const correct = answer.toLowerCase() === (s.answer || s.sentence).toLowerCase();
    setFeedback(correct ? "correct" : "wrong");
    if (correct) setScore(sc => sc + 1);
    setTimeout(() => {
      if (current + 1 >= sentences.length) {
        if (timerRef.current) clearInterval(timerRef.current);
        onFinish(correct ? score + 1 : score, sentences.length, time);
      } else {
        setCurrent(c => c + 1);
        setSelected([]);
        setFeedback(null);
      }
    }, 1500);
  };

  if (!s) return <div className="text-center text-muted-foreground">No sentences available</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Badge variant="outline">{current + 1} / {sentences.length}</Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="w-4 h-4" />
          {Math.floor(time/60)}:{String(time%60).padStart(2,"0")}
        </div>
        <Badge className="bg-primary/10 text-primary border-0">Score: {score}</Badge>
      </div>
      <Progress value={(current / sentences.length) * 100} className="mb-6 h-2" />
      {s.translation && (
        <div className="bg-muted/50 rounded-xl p-4 mb-4 text-center">
          <p className="text-sm text-muted-foreground">Build this sentence:</p>
          <p className="font-semibold mt-1">🇵🇱 {s.translation}</p>
        </div>
      )}
      {/* Answer area */}
      <div className={`min-h-16 bg-background border-2 rounded-xl p-3 mb-4 flex flex-wrap gap-2 transition-colors ${
        feedback === "correct" ? "border-green-500 bg-green-50" : feedback === "wrong" ? "border-red-500 bg-red-50" : "border-border"
      }`}>
        {selected.length === 0 && <span className="text-muted-foreground text-sm self-center">Click words to build the sentence...</span>}
        {selected.map((word, i) => (
          <button
            key={i}
            onClick={() => !feedback && removeWord(word, i)}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
          >
            {word}
          </button>
        ))}
      </div>
      {/* Word bank */}
      <div className="flex flex-wrap gap-2 mb-6">
        {words.map((word, i) => (
          <button
            key={i}
            onClick={() => !feedback && addWord(word, i)}
            className="px-3 py-1.5 bg-muted border border-border rounded-lg text-sm font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            {word}
          </button>
        ))}
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => { setWords(prev => [...prev, ...selected]); setSelected([]); }}
          disabled={!!feedback || selected.length === 0}
        >
          <RotateCcw className="w-4 h-4 mr-2" /> Reset
        </Button>
        <Button
          className="flex-1"
          onClick={checkAnswer}
          disabled={!!feedback || selected.length === 0}
        >
          Check Answer <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      {feedback === "wrong" && (
        <p className="text-sm text-red-600 mt-3">Correct: <strong>{s.answer || s.sentence}</strong></p>
      )}
    </div>
  );
}

// ====== MAIN GAME PLAYER ======
export default function GamePlayer() {
  const params = useParams<{ token: string }>();
  const [playerName, setPlayerName] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState({ score: 0, max: 0, time: 0 });

  const { data: game, isLoading, error } = trpc.factory.games.getByToken.useQuery(
    { token: params.token || "" },
    { enabled: !!params.token, retry: false }
  );

  const submitScore = trpc.factory.games.submitScore.useMutation({
    onSuccess: () => toast.success("Score saved to leaderboard!"),
  });

  const { data: leaderboard } = trpc.factory.games.getLeaderboard.useQuery(
    { gameId: game?.id || 0 },
    { enabled: !!game?.id && finished }
  );

  const handleFinish = (score: number, max: number, time: number) => {
    setFinalScore({ score, max, time });
    setFinished(true);
    if (game?.id) {
      submitScore.mutate({ gameId: game.id, playerName: playerName || "Anonymous", score, maxScore: max, timeSeconds: time });
    }
  };

  const renderGame = () => {
    if (!game?.config) return null;
    const config = game.config as any;
    switch (game.type) {
      case "quiz": return <QuizGame config={config} onFinish={handleFinish} />;
      case "memory": return <MemoryGame config={config} onFinish={handleFinish} />;
      case "matching": return <MatchingGame config={config} onFinish={handleFinish} />;
      case "fill_blanks": return <FillBlanksGame config={config} onFinish={handleFinish} />;
      case "spelling_bee": return <SpellingBeeGame config={config} onFinish={handleFinish} />;
      case "sentence_scramble": return <SentenceScrambleGame config={config} onFinish={handleFinish} />;
      case "crossword_game": return <CrosswordGame gameData={config} onComplete={(score) => handleFinish(score, 100, 0)} />;
      case "word_search_game": return <WordSearchGame gameData={config} onComplete={(score) => handleFinish(score, 100, 0)} />;
      default: return <div className="text-center text-muted-foreground">Unknown game type: {game.type}</div>;
    }
  };

  const GAME_META: Record<string, { emoji: string; label: string; color: string }> = {
    quiz: { emoji: "🧠", label: "Quiz", color: "from-blue-500 to-blue-600" },
    memory: { emoji: "🃏", label: "Memory Game", color: "from-purple-500 to-purple-600" },
    matching: { emoji: "🔗", label: "Matching", color: "from-green-500 to-green-600" },
    fill_blanks: { emoji: "✏️", label: "Fill in the Blanks", color: "from-orange-500 to-orange-600" },
    spelling_bee: { emoji: "🐝", label: "Spelling Bee", color: "from-yellow-500 to-yellow-600" },
    sentence_scramble: { emoji: "🔀", label: "Sentence Scramble", color: "from-red-500 to-red-600" },
    crossword_game: { emoji: "📝", label: "Crossword", color: "from-teal-500 to-teal-600" },
    word_search_game: { emoji: "🔍", label: "Word Search", color: "from-cyan-500 to-cyan-600" },
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-bounce">🎮</div>
        <p className="text-muted-foreground">Loading game...</p>
      </div>
    </div>
  );

  if (error || !game) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">😕</div>
        <h2 className="font-bold text-lg mb-2">Game not found</h2>
        <p className="text-muted-foreground text-sm">This game link may be invalid or the game is not public.</p>
      </div>
    </div>
  );

  const meta = GAME_META[game.type] || { emoji: "🎮", label: game.type, color: "from-gray-500 to-gray-600" };

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <div className={`bg-gradient-to-r ${meta.color} py-8 px-4`}>
        <div className="max-w-2xl mx-auto text-center text-white">
          <div className="text-5xl mb-3">{meta.emoji}</div>
          <h1 className="text-2xl font-bold mb-1">{meta.label}</h1>
          <p className="text-white/80 text-sm">{game.title}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* START SCREEN */}
        {!started && !finished && (
          <div className="text-center">
            <div className="bg-card border border-border rounded-2xl p-8 mb-6">
              <h2 className="text-xl font-bold mb-2">Ready to play?</h2>
              <p className="text-muted-foreground text-sm mb-6">Enter your name to track your score on the leaderboard</p>
              <Input
                placeholder="Your name (optional)"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="mb-4 text-center"
                onKeyDown={(e) => e.key === "Enter" && setStarted(true)}
              />
              <Button size="lg" onClick={() => setStarted(true)} className="w-full">
                <Zap className="w-5 h-5 mr-2" /> Start Game
              </Button>
            </div>
            {leaderboard && leaderboard.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" /> Leaderboard
                </h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((entry, i) => (
                    <div key={entry.id} className="flex items-center gap-3 text-sm">
                      <span className="w-6 font-bold text-muted-foreground">{i + 1}.</span>
                      <span className="flex-1 font-medium">{entry.playerName}</span>
                      <span className="text-primary font-bold">{entry.score}/{entry.maxScore}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* GAME */}
        {started && !finished && (
          <div className="bg-card border border-border rounded-2xl p-6">
            {renderGame()}
          </div>
        )}

        {/* FINISH SCREEN */}
        {finished && (
          <div className="text-center">
            <div className="bg-card border border-border rounded-2xl p-8 mb-6">
              <div className="text-6xl mb-4">
                {finalScore.score / finalScore.max >= 0.8 ? "🏆" : finalScore.score / finalScore.max >= 0.6 ? "⭐" : "📚"}
              </div>
              <h2 className="text-2xl font-bold mb-2">
                {finalScore.score / finalScore.max >= 0.8 ? "Excellent!" : finalScore.score / finalScore.max >= 0.6 ? "Good job!" : "Keep practising!"}
              </h2>
              <div className="text-4xl font-bold text-primary mb-2">
                {finalScore.score}/{finalScore.max}
              </div>
              <p className="text-muted-foreground text-sm mb-2">
                {Math.round((finalScore.score / finalScore.max) * 100)}% correct
              </p>
              <p className="text-xs text-muted-foreground">
                Time: {Math.floor(finalScore.time/60)}:{String(finalScore.time%60).padStart(2,"0")}
              </p>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => { setStarted(false); setFinished(false); }}>
                  <RotateCcw className="w-4 h-4 mr-2" /> Play Again
                </Button>
                <Button className="flex-1" onClick={() => setStarted(true)}>
                  <Zap className="w-4 h-4 mr-2" /> New Round
                </Button>
              </div>
            </div>
            {leaderboard && leaderboard.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" /> Leaderboard
                </h3>
                <div className="space-y-2">
                  {leaderboard.slice(0, 10).map((entry, i) => (
                    <div key={entry.id} className={`flex items-center gap-3 text-sm p-2 rounded-lg ${entry.playerName === playerName ? "bg-primary/10" : ""}`}>
                      <span className="w-6 font-bold">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`}</span>
                      <span className="flex-1 font-medium">{entry.playerName}</span>
                      <span className="text-primary font-bold">{entry.score}/{entry.maxScore}</span>
                      {entry.timeSeconds && <span className="text-xs text-muted-foreground">{Math.floor(entry.timeSeconds/60)}:{String(entry.timeSeconds%60).padStart(2,"0")}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
