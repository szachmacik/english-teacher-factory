import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RotateCcw, Eye, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface WordSearchGameProps {
  gameData: {
    grid?: string[][];
    words?: string[];
    title?: string;
    size?: number;
  };
  onComplete?: (score: number) => void;
}

interface Selection {
  start: { row: number; col: number };
  end: { row: number; col: number };
}

interface FoundWord {
  word: string;
  cells: { row: number; col: number }[];
  color: string;
}

const COLORS = [
  "rgba(59,130,246,0.35)", "rgba(16,185,129,0.35)", "rgba(245,158,11,0.35)",
  "rgba(239,68,68,0.35)", "rgba(139,92,246,0.35)", "rgba(236,72,153,0.35)",
  "rgba(20,184,166,0.35)", "rgba(249,115,22,0.35)", "rgba(132,204,22,0.35)",
  "rgba(99,102,241,0.35)",
];

function getCellsBetween(start: { row: number; col: number }, end: { row: number; col: number }) {
  const cells: { row: number; col: number }[] = [];
  const dr = Math.sign(end.row - start.row);
  const dc = Math.sign(end.col - start.col);
  let r = start.row, c = start.col;
  while (true) {
    cells.push({ row: r, col: c });
    if (r === end.row && c === end.col) break;
    r += dr;
    c += dc;
  }
  return cells;
}

function buildWordSearchGrid(words: string[], size: number): string[][] {
  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => "")
  );
  const directions = [
    [0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]
  ];

  for (const word of words) {
    const upper = word.toUpperCase();
    let placed = false;
    for (let attempt = 0; attempt < 100 && !placed; attempt++) {
      const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      const endRow = row + dr * (upper.length - 1);
      const endCol = col + dc * (upper.length - 1);
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
      let canPlace = true;
      for (let i = 0; i < upper.length; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (grid[r][c] !== "" && grid[r][c] !== upper[i]) { canPlace = false; break; }
      }
      if (canPlace) {
        for (let i = 0; i < upper.length; i++) {
          grid[row + dr * i][col + dc * i] = upper[i];
        }
        placed = true;
      }
    }
  }

  // Fill empty cells with random letters
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) grid[r][c] = letters[Math.floor(Math.random() * letters.length)];
    }
  }
  return grid;
}

export default function WordSearchGame({ gameData, onComplete }: WordSearchGameProps) {
  const { words = [], title = "Word Search", size = 12 } = gameData;
  const [grid] = useState<string[][]>(() =>
    gameData.grid || buildWordSearchGrid(words, size)
  );
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [currentSelection, setCurrentSelection] = useState<Selection | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const cellSize = size <= 10 ? 38 : size <= 13 ? 32 : 26;
  const fontSize = size <= 10 ? 15 : size <= 13 ? 13 : 11;

  const getHighlightColor = (row: number, col: number): string | null => {
    for (const fw of foundWords) {
      if (fw.cells.some(c => c.row === row && c.col === col)) return fw.color;
    }
    return null;
  };

  const isInCurrentSelection = (row: number, col: number) => {
    if (!currentSelection) return false;
    const cells = getCellsBetween(currentSelection.start, currentSelection.end);
    return cells.some(c => c.row === row && c.col === col);
  };

  const handleMouseDown = (row: number, col: number) => {
    setSelecting(true);
    setCurrentSelection({ start: { row, col }, end: { row, col } });
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (!selecting || !currentSelection) return;
    const { start } = currentSelection;
    const dr = row - start.row;
    const dc = col - start.col;
    // Only allow straight lines (horizontal, vertical, diagonal)
    if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
      setCurrentSelection({ start, end: { row, col } });
    }
  };

  const handleMouseUp = () => {
    if (!selecting || !currentSelection) { setSelecting(false); return; }
    setSelecting(false);
    const cells = getCellsBetween(currentSelection.start, currentSelection.end);
    const selected = cells.map(c => grid[c.row][c.col]).join("");
    const reversed = selected.split("").reverse().join("");

    const matchedWord = words.find(w => {
      const upper = w.toUpperCase();
      return (upper === selected || upper === reversed) && !foundWords.some(fw => fw.word === w);
    });

    if (matchedWord) {
      const newFound: FoundWord = {
        word: matchedWord,
        cells,
        color: COLORS[foundWords.length % COLORS.length],
      };
      const newFoundWords = [...foundWords, newFound];
      setFoundWords(newFoundWords);
      if (newFoundWords.length === words.length) {
        setCompleted(true);
        onComplete?.(100);
      }
    }
    setCurrentSelection(null);
  };

  const handleRevealAll = () => {
    const allFound: FoundWord[] = words.map((word, i) => ({
      word,
      cells: [], // simplified reveal
      color: COLORS[i % COLORS.length],
    }));
    setFoundWords(allFound);
    setRevealed(true);
  };

  const handleReset = () => {
    setFoundWords([]);
    setRevealed(false);
    setCompleted(false);
    setCurrentSelection(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">{title}</h3>
        <Badge variant="outline">{foundWords.length}/{words.length} words found</Badge>
      </div>

      {completed && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Trophy className="w-5 h-5 text-green-600" />
          <span className="font-semibold text-green-700">All words found! Excellent!</span>
        </div>
      )}

      <div className="flex gap-6 flex-wrap">
        {/* Grid */}
        <div
          className="select-none"
          onMouseLeave={() => { if (selecting) { setSelecting(false); setCurrentSelection(null); } }}
        >
          {grid.map((row, ri) => (
            <div key={ri} style={{ display: "flex" }}>
              {row.map((letter, ci) => {
                const highlightColor = getHighlightColor(ri, ci);
                const inSelection = isInCurrentSelection(ri, ci);
                return (
                  <div
                    key={ci}
                    onMouseDown={() => handleMouseDown(ri, ci)}
                    onMouseEnter={() => handleMouseEnter(ri, ci)}
                    onMouseUp={handleMouseUp}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize,
                      fontWeight: 700,
                      cursor: "pointer",
                      backgroundColor: highlightColor || (inSelection ? "rgba(59,130,246,0.2)" : "transparent"),
                      borderRadius: 4,
                      border: inSelection ? "2px solid #3b82f6" : "2px solid transparent",
                      color: "#111827",
                      transition: "background-color 0.1s",
                      userSelect: "none",
                    }}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Word list */}
        <div className="min-w-[140px]">
          <h4 className="font-bold text-sm mb-2 text-gray-700">FIND THESE WORDS:</h4>
          <div className="space-y-1">
            {words.map((word, i) => {
              const found = foundWords.find(fw => fw.word === word);
              return (
                <div
                  key={i}
                  className={cn(
                    "text-sm font-medium px-2 py-1 rounded",
                    found ? "line-through text-gray-400" : "text-gray-800"
                  )}
                  style={{ backgroundColor: found ? found.color : "transparent" }}
                >
                  {found && <CheckCircle className="w-3 h-3 inline mr-1 text-green-600" />}
                  {word.toUpperCase()}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleRevealAll} disabled={revealed}>
          <Eye className="w-4 h-4 mr-1" /> Reveal All
        </Button>
        <Button size="sm" variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-1" /> Reset
        </Button>
      </div>
    </div>
  );
}
