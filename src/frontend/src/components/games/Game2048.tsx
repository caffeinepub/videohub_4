import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

// ─── Types & Constants ────────────────────────────────────────────────────────

const SIZE = 4;

type Grid = (number | null)[][];

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}

function cloneGrid(g: Grid): Grid {
  return g.map((row) => [...row]);
}

function addRandomTile(g: Grid): Grid {
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === null) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return g;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = cloneGrid(g);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function initGrid(): Grid {
  let g = emptyGrid();
  g = addRandomTile(g);
  g = addRandomTile(g);
  return g;
}

// Slide a single row left, return { row, points }
function slideRow(row: (number | null)[]): { row: (number | null)[]; points: number } {
  const vals = row.filter((v): v is number => v !== null);
  let points = 0;
  const merged: (number | null)[] = [];
  let i = 0;
  while (i < vals.length) {
    if (i + 1 < vals.length && vals[i] === vals[i + 1]) {
      const m = vals[i] * 2;
      merged.push(m);
      points += m;
      i += 2;
    } else {
      merged.push(vals[i]);
      i++;
    }
  }
  while (merged.length < SIZE) merged.push(null);
  return { row: merged, points };
}

type Direction = "left" | "right" | "up" | "down";

function moveGrid(g: Grid, dir: Direction): { grid: Grid; points: number; moved: boolean } {
  let total = 0;
  let moved = false;
  let next = cloneGrid(g);

  const processRows = (grid: Grid): Grid => {
    return grid.map((row) => {
      const { row: newRow, points } = slideRow(row);
      total += points;
      if (newRow.some((v, i) => v !== row[i])) moved = true;
      return newRow;
    });
  };

  const transpose = (grid: Grid): Grid =>
    Array.from({ length: SIZE }, (_, r) => Array.from({ length: SIZE }, (__, c) => grid[c][r]));

  const reverseRows = (grid: Grid): Grid => grid.map((row) => [...row].reverse());

  if (dir === "left") {
    next = processRows(next);
  } else if (dir === "right") {
    next = reverseRows(processRows(reverseRows(next)));
  } else if (dir === "up") {
    next = transpose(processRows(transpose(next)));
  } else {
    next = transpose(reverseRows(processRows(reverseRows(transpose(next)))));
  }

  return { grid: next, points: total, moved };
}

function hasWon(g: Grid): boolean {
  return g.some((row) => row.some((v) => v !== null && v >= 2048));
}

function hasMovesLeft(g: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (g[r][c] === null) return true;
      if (c + 1 < SIZE && g[r][c] === g[r][c + 1]) return true;
      if (r + 1 < SIZE && g[r][c] === g[r + 1][c]) return true;
    }
  }
  return false;
}

// ─── Tile colors (dark retro neon theme) ──────────────────────────────────────

function tileStyles(value: number | null): { bg: string; fg: string; shadow?: string } {
  if (!value) return { bg: "#0d0d1a", fg: "transparent" };
  const map: Record<number, { bg: string; fg: string; shadow?: string }> = {
    2:    { bg: "#1a1a2e", fg: "#a0a0c0" },
    4:    { bg: "#16213e", fg: "#b0b0d8" },
    8:    { bg: "#0f3460", fg: "#ffffff", shadow: "#0f3460" },
    16:   { bg: "#533483", fg: "#ffffff", shadow: "#533483" },
    32:   { bg: "#e94560", fg: "#ffffff", shadow: "#e94560" },
    64:   { bg: "#ff2244", fg: "#ffffff", shadow: "#ff2244" },
    128:  { bg: "#ff9900", fg: "#ffffff", shadow: "#ff9900" },
    256:  { bg: "#ffcc00", fg: "#111111", shadow: "#ffcc00" },
    512:  { bg: "#00cc99", fg: "#ffffff", shadow: "#00cc99" },
    1024: { bg: "#00ffcc", fg: "#111111", shadow: "#00ffcc" },
    2048: { bg: "#00ff41", fg: "#000000", shadow: "#00ff41" },
  };
  return map[value] ?? { bg: "#ff00ff", fg: "#ffffff", shadow: "#ff00ff" };
}

function tileFontSize(value: number | null): string {
  if (!value) return "1rem";
  if (value < 100) return "1.6rem";
  if (value < 1000) return "1.2rem";
  return "0.85rem";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Game2048Props {
  onGameOver?: (score: number) => void;
}

export default function Game2048({ onGameOver }: Game2048Props) {
  const [grid, setGrid] = useState<Grid>(initGrid);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const onGameOverCalledRef = useRef(false);

  const newGame = useCallback(() => {
    setGrid(initGrid());
    setScore(0);
    setStatus("playing");
    onGameOverCalledRef.current = false;
  }, []);

  const handleMove = useCallback((dir: Direction) => {
    setGrid((prev) => {
      if (status === "lost") return prev;
      const { grid: next, points, moved } = moveGrid(prev, dir);
      if (!moved) return prev;
      const withNew = addRandomTile(next);
      setScore((s) => {
        const ns = s + points;
        setBest((b) => Math.max(b, ns));
        if (!hasMovesLeft(withNew) && !onGameOverCalledRef.current) {
          onGameOverCalledRef.current = true;
          onGameOver?.(ns);
        }
        return ns;
      });
      if (hasWon(withNew) && status === "playing") {
        setStatus("won");
      } else if (!hasMovesLeft(withNew)) {
        if (!onGameOverCalledRef.current) {
          onGameOverCalledRef.current = true;
        }
        setStatus("lost");
      }
      return withNew;
    });
  }, [status, onGameOver]);

  // ─── Keyboard ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowLeft: "left", a: "left", A: "left",
        ArrowRight: "right", d: "right", D: "right",
        ArrowUp: "up", w: "up", W: "up",
        ArrowDown: "down", s: "down", S: "down",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        handleMove(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleMove]);

  // ─── Touch ──────────────────────────────────────────────────────────────────

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? "right" : "left");
    } else {
      handleMove(dy > 0 ? "down" : "up");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col items-center gap-4 select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-[360px] px-1">
        <div>
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "1rem",
              color: "#00ff41",
              textShadow: "0 0 10px #00ff41",
            }}
          >
            2048
          </span>
        </div>
        <div className="flex gap-2">
          <div
            className="px-3 py-1 text-center"
            style={{
              background: "#0d0d1a",
              border: "1px solid #333",
              minWidth: "64px",
            }}
          >
            <p
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.4rem", color: "#888" }}
            >
              SCORE
            </p>
            <p
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.7rem", color: "#00ff41" }}
            >
              {score}
            </p>
          </div>
          <div
            className="px-3 py-1 text-center"
            style={{ background: "#0d0d1a", border: "1px solid #333", minWidth: "64px" }}
          >
            <p
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.4rem", color: "#888" }}
            >
              BEST
            </p>
            <p
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.7rem", color: "#ffcc00" }}
            >
              {best}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={newGame}
            className="h-full px-2 gap-1 border-border hover:border-primary hover:text-primary"
          >
            <RotateCcw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div
        style={{
          background: "#111122",
          padding: "10px",
          gap: "8px",
          display: "grid",
          gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          border: "2px solid #222244",
          position: "relative",
        }}
      >
        {grid.map((row, r) =>
          row.map((val, c) => {
            const style = tileStyles(val);
            return (
              <div
                key={`cell-${r * SIZE + c}`}
                style={{
                  width: "76px",
                  height: "76px",
                  background: style.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: tileFontSize(val),
                  fontWeight: "bold",
                  color: style.fg,
                  fontFamily: "'Press Start 2P', monospace",
                  boxShadow: style.shadow
                    ? `0 0 12px ${style.shadow}66, inset 0 0 4px ${style.shadow}33`
                    : "none",
                  transition: "background 0.1s, color 0.1s",
                }}
              >
                {val ?? ""}
              </div>
            );
          })
        )}

        {/* Overlay for won/lost */}
        {(status === "won" || status === "lost") && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: "rgba(0,0,0,0.75)" }}
          >
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "0.8rem",
                color: status === "won" ? "#00ff41" : "#ff3333",
                textShadow: `0 0 12px ${status === "won" ? "#00ff41" : "#ff3333"}`,
              }}
            >
              {status === "won" ? "YOU WIN!" : "GAME OVER"}
            </p>
            <Button
              onClick={newGame}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <RotateCcw className="w-3 h-3" /> New Game
            </Button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <p className="text-xs text-muted-foreground font-mono text-center">
        Arrow keys / WASD · Swipe on mobile
      </p>
    </div>
  );
}
