import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RotateCcw, Lightbulb, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CrosswordClue {
  number: number;
  direction: "across" | "down";
  clue: string;
  answer: string;
  row: number;
  col: number;
}

interface CrosswordCell {
  letter: string;
  number?: number;
  isBlack: boolean;
  userInput: string;
  isCorrect?: boolean;
  isRevealed?: boolean;
  acrossClue?: number;
  downClue?: number;
}

interface CrosswordGameProps {
  gameData: {
    grid?: CrosswordCell[][];
    clues?: CrosswordClue[];
    title?: string;
    size?: number;
  };
  onComplete?: (score: number) => void;
}

function buildGrid(clues: CrosswordClue[], size: number): CrosswordCell[][] {
  const grid: CrosswordCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      letter: "",
      isBlack: true,
      userInput: "",
    }))
  );

  // Place words in grid
  for (const clue of clues) {
    const { row, col, direction, answer, number } = clue;
    for (let i = 0; i < answer.length; i++) {
      const r = direction === "across" ? row : row + i;
      const c = direction === "across" ? col + i : col;
      if (r < size && c < size) {
        grid[r][c].letter = answer[i].toUpperCase();
        grid[r][c].isBlack = false;
        if (i === 0) grid[r][c].number = number;
        if (direction === "across") grid[r][c].acrossClue = number;
        else grid[r][c].downClue = number;
      }
    }
  }

  return grid;
}

export default function CrosswordGame({ gameData, onComplete }: CrosswordGameProps) {
  const { clues = [], title = "Crossword Puzzle", size = 15 } = gameData;
  const [grid, setGrid] = useState<CrosswordCell[][]>(() => {
    if (gameData.grid) return gameData.grid.map(row => row.map(cell => ({ ...cell, userInput: "" })));
    return buildGrid(clues, size);
  });
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [activeClue, setActiveClue] = useState<CrosswordClue | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [hints, setHints] = useState(3);

  const checkCompletion = useCallback((currentGrid: CrosswordCell[][]) => {
    let correct = 0;
    let total = 0;
    for (const row of currentGrid) {
      for (const cell of row) {
        if (!cell.isBlack) {
          total++;
          if (cell.userInput.toUpperCase() === cell.letter) correct++;
        }
      }
    }
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    setScore(pct);
    if (correct === total && total > 0) {
      setCompleted(true);
      onComplete?.(pct);
    }
    return pct;
  }, [onComplete]);

  const handleCellClick = (row: number, col: number) => {
    if (grid[row][col].isBlack) return;
    if (selectedCell?.row === row && selectedCell?.col === col) {
      setDirection(d => d === "across" ? "down" : "across");
    } else {
      setSelectedCell({ row, col });
    }
    // Find active clue
    const cell = grid[row][col];
    const clueNum = direction === "across" ? cell.acrossClue : cell.downClue;
    const found = clues.find(c => c.number === clueNum && c.direction === direction);
    setActiveClue(found || null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;

    if (e.key === "Backspace") {
      e.preventDefault();
      setGrid(prev => {
        const next = prev.map(r => r.map(c => ({ ...c })));
        if (next[row][col].userInput) {
          next[row][col].userInput = "";
        } else {
          // Move back
          const nr = direction === "down" ? row - 1 : row;
          const nc = direction === "across" ? col - 1 : col;
          if (nr >= 0 && nc >= 0 && !next[nr][nc].isBlack) {
            next[nr][nc].userInput = "";
            setSelectedCell({ row: nr, col: nc });
          }
        }
        return next;
      });
      return;
    }

    if (e.key === "ArrowRight") { setDirection("across"); setSelectedCell({ row, col: Math.min(col + 1, size - 1) }); return; }
    if (e.key === "ArrowLeft") { setDirection("across"); setSelectedCell({ row, col: Math.max(col - 1, 0) }); return; }
    if (e.key === "ArrowDown") { setDirection("down"); setSelectedCell({ row: Math.min(row + 1, size - 1), col }); return; }
    if (e.key === "ArrowUp") { setDirection("down"); setSelectedCell({ row: Math.max(row - 1, 0), col }); return; }

    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      const letter = e.key.toUpperCase();
      setGrid(prev => {
        const next = prev.map(r => r.map(c => ({ ...c })));
        next[row][col].userInput = letter;
        next[row][col].isCorrect = letter === next[row][col].letter;
        checkCompletion(next);
        return next;
      });
      // Advance cursor
      const nr = direction === "down" ? Math.min(row + 1, size - 1) : row;
      const nc = direction === "across" ? Math.min(col + 1, size - 1) : col;
      if (!grid[nr][nc].isBlack) setSelectedCell({ row: nr, col: nc });
    }
  };

  const handleHint = () => {
    if (!selectedCell || hints <= 0) return;
    const { row, col } = selectedCell;
    setGrid(prev => {
      const next = prev.map(r => r.map(c => ({ ...c })));
      next[row][col].userInput = next[row][col].letter;
      next[row][col].isCorrect = true;
      next[row][col].isRevealed = true;
      checkCompletion(next);
      return next;
    });
    setHints(h => h - 1);
  };

  const handleRevealAll = () => {
    setGrid(prev => prev.map(row => row.map(cell => ({
      ...cell,
      userInput: cell.isBlack ? "" : cell.letter,
      isCorrect: !cell.isBlack,
      isRevealed: !cell.isBlack,
    }))));
    setRevealed(true);
    setScore(0);
  };

  const handleReset = () => {
    setGrid(prev => prev.map(row => row.map(cell => ({ ...cell, userInput: "", isCorrect: undefined, isRevealed: false }))));
    setRevealed(false);
    setScore(0);
    setCompleted(false);
    setHints(3);
    setSelectedCell(null);
  };

  // Compute cell size based on grid size
  const cellSize = size <= 10 ? 40 : size <= 13 ? 34 : 28;
  const fontSize = size <= 10 ? 16 : size <= 13 ? 13 : 11;
  const numFontSize = size <= 10 ? 9 : 7;

  const isInActiveWord = (row: number, col: number) => {
    if (!selectedCell || !activeClue) return false;
    const { direction: d, row: sr, col: sc, answer } = activeClue;
    for (let i = 0; i < answer.length; i++) {
      const r = d === "across" ? sr : sr + i;
      const c = d === "across" ? sc + i : sc;
      if (r === row && c === col) return true;
    }
    return false;
  };

  const acrossClues = clues.filter(c => c.direction === "across").sort((a, b) => a.number - b.number);
  const downClues = clues.filter(c => c.direction === "down").sort((a, b) => a.number - b.number);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Score: {score}%</Badge>
          <Badge variant="outline" className="text-amber-600">
            <Lightbulb className="w-3 h-3 mr-1" /> {hints} hints
          </Badge>
        </div>
      </div>

      {completed && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Trophy className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-700">Puzzle Complete! Score: {score}%</span>
        </div>
      )}

      {activeClue && (
        <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <span className="font-bold text-blue-700">{activeClue.number} {activeClue.direction.toUpperCase()}: </span>
          <span>{activeClue.clue}</span>
        </div>
      )}

      <div className="flex gap-6 flex-wrap">
        {/* Grid */}
        <div
          className="outline-none"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          style={{ lineHeight: 0 }}
        >
          {grid.map((row, ri) => (
            <div key={ri} style={{ display: "flex" }}>
              {row.map((cell, ci) => {
                const isSelected = selectedCell?.row === ri && selectedCell?.col === ci;
                const isHighlighted = isInActiveWord(ri, ci);
                return (
                  <div
                    key={ci}
                    onClick={() => handleCellClick(ri, ci)}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      border: cell.isBlack ? "none" : "1px solid #374151",
                      backgroundColor: cell.isBlack
                        ? "#1f2937"
                        : isSelected
                        ? "#3b82f6"
                        : isHighlighted
                        ? "#bfdbfe"
                        : cell.isRevealed
                        ? "#fef3c7"
                        : cell.isCorrect === true
                        ? "#dcfce7"
                        : cell.isCorrect === false
                        ? "#fee2e2"
                        : "#ffffff",
                      position: "relative",
                      cursor: cell.isBlack ? "default" : "pointer",
                      userSelect: "none",
                    }}
                  >
                    {!cell.isBlack && cell.number && (
                      <span style={{
                        position: "absolute",
                        top: 1,
                        left: 2,
                        fontSize: numFontSize,
                        lineHeight: 1,
                        color: isSelected ? "#fff" : "#374151",
                        fontWeight: 600,
                      }}>{cell.number}</span>
                    )}
                    {!cell.isBlack && (
                      <span style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize,
                        fontWeight: 700,
                        color: isSelected ? "#fff" : cell.isRevealed ? "#92400e" : "#111827",
                        textTransform: "uppercase",
                      }}>
                        {cell.userInput}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Clues */}
        <div className="flex gap-4 flex-1 min-w-[200px]">
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-2 text-gray-700">ACROSS</h4>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {acrossClues.map(c => (
                <div
                  key={c.number}
                  onClick={() => { setSelectedCell({ row: c.row, col: c.col }); setDirection("across"); setActiveClue(c); }}
                  className={cn(
                    "text-xs cursor-pointer p-1 rounded hover:bg-blue-50",
                    activeClue?.number === c.number && activeClue?.direction === "across" ? "bg-blue-100 font-semibold" : ""
                  )}
                >
                  <span className="font-bold text-blue-600">{c.number}.</span> {c.clue}
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-2 text-gray-700">DOWN</h4>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {downClues.map(c => (
                <div
                  key={c.number}
                  onClick={() => { setSelectedCell({ row: c.row, col: c.col }); setDirection("down"); setActiveClue(c); }}
                  className={cn(
                    "text-xs cursor-pointer p-1 rounded hover:bg-blue-50",
                    activeClue?.number === c.number && activeClue?.direction === "down" ? "bg-blue-100 font-semibold" : ""
                  )}
                >
                  <span className="font-bold text-blue-600">{c.number}.</span> {c.clue}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={handleHint} disabled={hints <= 0 || revealed}>
          <Lightbulb className="w-4 h-4 mr-1" /> Hint ({hints})
        </Button>
        <Button size="sm" variant="outline" onClick={handleRevealAll} disabled={revealed}>
          <CheckCircle className="w-4 h-4 mr-1" /> Reveal All
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1" /> Reset
        </Button>
      </div>
    </div>
  );
}
