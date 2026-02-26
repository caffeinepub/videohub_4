import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const COLS = 10;
const ROWS = 20;
const CELL = 28;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;
const PREVIEW_CELL = 20;
const PREVIEW_SIZE = 4 * PREVIEW_CELL;

// Scoring per lines cleared at once
const LINE_SCORES = [0, 100, 300, 500, 800];

// Tetrominoes: shape matrices + colors
const TETROMINOES = [
  // I
  {
    shape: [[1, 1, 1, 1]],
    color: "#00f0f0",
    glow: "rgba(0,240,240,0.6)",
  },
  // O
  {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "#f0f000",
    glow: "rgba(240,240,0,0.6)",
  },
  // T
  {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: "#a000f0",
    glow: "rgba(160,0,240,0.6)",
  },
  // S
  {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "#00f000",
    glow: "rgba(0,240,0,0.6)",
  },
  // Z
  {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "#f00000",
    glow: "rgba(240,0,0,0.6)",
  },
  // J
  {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: "#0000f0",
    glow: "rgba(0,0,240,0.6)",
  },
  // L
  {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: "#f0a000",
    glow: "rgba(240,160,0,0.6)",
  },
] as const;

type TetrominoIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

interface Piece {
  type: TetrominoIndex;
  shape: number[][];
  x: number;
  y: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function newBoard(): number[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function randomPiece(): Piece {
  const type = Math.floor(Math.random() * 7) as TetrominoIndex;
  const shape = TETROMINOES[type].shape.map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
  };
}

function rotate(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = shape[r][c];
    }
  }
  return rotated;
}

function isValidPosition(board: number[][], shape: number[][], x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nr = y + r;
      const nc = x + c;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return false;
      if (board[nr][nc]) return false;
    }
  }
  return true;
}

function lockPiece(board: number[][], piece: Piece): number[][] {
  const newB = board.map((row) => [...row]);
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (piece.shape[r][c]) {
        const nr = piece.y + r;
        const nc = piece.x + c;
        if (nr >= 0) newB[nr][nc] = piece.type + 1;
      }
    }
  }
  return newB;
}

function clearLines(board: number[][]): { board: number[][]; cleared: number } {
  const remaining = board.filter((row) => row.some((v) => v === 0));
  const cleared = ROWS - remaining.length;
  const newRows = Array.from({ length: cleared }, () => Array(COLS).fill(0));
  return { board: [...newRows, ...remaining], cleared };
}

// ─── Draw helpers ─────────────────────────────────────────────────────────────

function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  glow: string
) {
  ctx.shadowColor = glow;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  ctx.shadowBlur = 0;

  // bright top/left edges
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 2);
  ctx.fillRect(x * size + 1, y * size + 1, 2, size - 2);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TetrisGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const stateRef = useRef({
    board: newBoard(),
    piece: randomPiece(),
    nextPiece: randomPiece(),
    score: 0,
    level: 1,
    lines: 0,
    running: false,
    over: false,
  });

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "over">("idle");

  // ─── Draw ──────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const preview = previewRef.current;
    if (!canvas || !preview) return;
    const ctx = canvas.getContext("2d");
    const pCtx = preview.getContext("2d");
    if (!ctx || !pCtx) return;

    const { board, piece } = stateRef.current;

    // Background
    ctx.fillStyle = "#050a05";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid
    ctx.strokeStyle = "rgba(0,255,0,0.05)";
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL, 0);
      ctx.lineTo(c * CELL, CANVAS_H);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL);
      ctx.lineTo(CANVAS_W, r * CELL);
      ctx.stroke();
    }

    // Locked pieces
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = board[r][c];
        if (v) {
          const t = TETROMINOES[v - 1];
          drawCell(ctx, c, r, CELL, t.color, t.glow);
        }
      }
    }

    // Ghost piece
    let ghostY = piece.y;
    while (isValidPosition(board, piece.shape, piece.x, ghostY + 1)) ghostY++;
    if (ghostY !== piece.y) {
      const tInfo = TETROMINOES[piece.type];
      ctx.globalAlpha = 0.18;
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
          if (piece.shape[r][c]) {
            ctx.fillStyle = tInfo.color;
            ctx.fillRect(
              (piece.x + c) * CELL + 1,
              (ghostY + r) * CELL + 1,
              CELL - 2,
              CELL - 2
            );
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // Active piece
    const tInfo = TETROMINOES[piece.type];
    for (let r = 0; r < piece.shape.length; r++) {
      for (let c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          drawCell(ctx, piece.x + c, piece.y + r, CELL, tInfo.color, tInfo.glow);
        }
      }
    }

    // Preview
    pCtx.fillStyle = "#050a05";
    pCtx.fillRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);

    const { nextPiece } = stateRef.current;
    const nInfo = TETROMINOES[nextPiece.type];
    const offsetX = Math.floor((4 - nextPiece.shape[0].length) / 2);
    const offsetY = Math.floor((4 - nextPiece.shape.length) / 2);
    for (let r = 0; r < nextPiece.shape.length; r++) {
      for (let c = 0; c < nextPiece.shape[r].length; c++) {
        if (nextPiece.shape[r][c]) {
          drawCell(pCtx, c + offsetX, r + offsetY, PREVIEW_CELL, nInfo.color, nInfo.glow);
        }
      }
    }
  }, []);

  // ─── Tick ──────────────────────────────────────────────────────────────────

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;

    if (isValidPosition(s.board, s.piece.shape, s.piece.x, s.piece.y + 1)) {
      s.piece.y += 1;
    } else {
      // Lock piece
      s.board = lockPiece(s.board, s.piece);
      const { board: cleared, cleared: numCleared } = clearLines(s.board);
      s.board = cleared;
      s.lines += numCleared;
      s.score += LINE_SCORES[numCleared] * s.level;
      s.level = Math.floor(s.lines / 10) + 1;

      setScore(s.score);
      setLevel(s.level);
      setLines(s.lines);

      // Next piece
      s.piece = { ...s.nextPiece, x: Math.floor((COLS - s.nextPiece.shape[0].length) / 2), y: 0 };
      s.nextPiece = randomPiece();

      // Game over?
      if (!isValidPosition(s.board, s.piece.shape, s.piece.x, s.piece.y)) {
        s.running = false;
        s.over = true;
        setStatus("over");
        if (tickRef.current) clearInterval(tickRef.current);
      }

      // Update speed
      if (tickRef.current) {
        clearInterval(tickRef.current);
        const speed = Math.max(100, 600 - (s.level - 1) * 50);
        tickRef.current = setInterval(tick, speed);
      }
    }

    draw();
  }, [draw]);

  // ─── Start ────────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    stateRef.current = {
      board: newBoard(),
      piece: randomPiece(),
      nextPiece: randomPiece(),
      score: 0,
      level: 1,
      lines: 0,
      running: true,
      over: false,
    };
    setScore(0);
    setLevel(1);
    setLines(0);
    setStatus("running");
    tickRef.current = setInterval(tick, 600);
    draw();
  }, [tick, draw]);

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s.running) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          if (isValidPosition(s.board, s.piece.shape, s.piece.x - 1, s.piece.y)) {
            s.piece.x -= 1;
            draw();
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (isValidPosition(s.board, s.piece.shape, s.piece.x + 1, s.piece.y)) {
            s.piece.x += 1;
            draw();
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (isValidPosition(s.board, s.piece.shape, s.piece.x, s.piece.y + 1)) {
            s.piece.y += 1;
            s.score += 1;
            setScore(s.score);
            draw();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          {
            const rotated = rotate(s.piece.shape);
            if (isValidPosition(s.board, rotated, s.piece.x, s.piece.y)) {
              s.piece.shape = rotated;
              draw();
            } else if (isValidPosition(s.board, rotated, s.piece.x - 1, s.piece.y)) {
              s.piece.shape = rotated;
              s.piece.x -= 1;
              draw();
            } else if (isValidPosition(s.board, rotated, s.piece.x + 1, s.piece.y)) {
              s.piece.shape = rotated;
              s.piece.x += 1;
              draw();
            }
          }
          break;
        case " ":
          e.preventDefault();
          {
            // Hard drop
            let drop = 0;
            while (isValidPosition(s.board, s.piece.shape, s.piece.x, s.piece.y + 1)) {
              s.piece.y += 1;
              drop++;
            }
            s.score += drop * 2;
            setScore(s.score);
            draw();
            // Trigger lock immediately by calling tick manually
            tick();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [draw, tick]);

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    draw();
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [draw]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-4 items-start">
        {/* Game Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="block pixel-border"
            style={{ imageRendering: "pixelated" }}
          />
          {status === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 gap-3">
              <p className="text-4xl">🎮</p>
              <p
                className="text-sm neon-text-amber text-center"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                TETRIS
              </p>
              <p className="text-sm text-muted-foreground text-center px-4">
                ← → move · ↑ rotate<br />↓ soft drop · SPACE hard drop
              </p>
              <Button
                onClick={start}
                className="bg-primary hover:bg-primary/80 text-primary-foreground gap-2 rounded-none font-['Press_Start_2P'] text-[0.5rem] mt-2"
              >
                <Play className="w-4 h-4" /> START
              </Button>
            </div>
          )}
          {status === "over" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 gap-3">
              <p
                className="text-sm neon-text-amber"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                GAME OVER
              </p>
              <p className="text-base text-muted-foreground">Score: {score}</p>
              <Button
                onClick={start}
                className="bg-primary hover:bg-primary/80 text-primary-foreground gap-2 rounded-none font-['Press_Start_2P'] text-[0.5rem] mt-1"
              >
                <RotateCcw className="w-4 h-4" /> RETRY
              </Button>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-4 min-w-[90px]">
          {/* Next Piece */}
          <div>
            <p
              className="text-[0.45rem] neon-text-cyan mb-2"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              NEXT
            </p>
            <canvas
              ref={previewRef}
              width={PREVIEW_SIZE}
              height={PREVIEW_SIZE}
              className="block pixel-border-cyan"
              style={{ imageRendering: "pixelated" }}
            />
          </div>

          {/* Score */}
          <div className="pixel-border p-2">
            <p
              className="text-[0.4rem] neon-text-green mb-1"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              SCORE
            </p>
            <p className="text-lg neon-text-amber tabular-nums">{score}</p>
          </div>

          <div className="pixel-border p-2">
            <p
              className="text-[0.4rem] neon-text-green mb-1"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              LEVEL
            </p>
            <p className="text-lg neon-text-amber">{level}</p>
          </div>

          <div className="pixel-border p-2">
            <p
              className="text-[0.4rem] neon-text-green mb-1"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              LINES
            </p>
            <p className="text-lg neon-text-amber">{lines}</p>
          </div>

          {status !== "idle" && (
            <Button
              size="sm"
              onClick={start}
              variant="outline"
              className="rounded-none border-border font-['Press_Start_2P'] text-[0.45rem] hover:border-primary hover:text-primary"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              RESET
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
