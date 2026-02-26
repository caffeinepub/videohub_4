import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Play,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const CELL = 20;
const COLS = 20;
const ROWS = 20;
const CANVAS_W = CELL * COLS;
const CANVAS_H = CELL * ROWS;
const TICK_MS = 110;

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

interface Point {
  x: number;
  y: number;
}

function rand(max: number) {
  return Math.floor(Math.random() * max);
}

function newFood(snake: Point[]): Point {
  let p: Point;
  do {
    p = { x: rand(COLS), y: rand(ROWS) };
  } while (snake.some((s) => s.x === p.x && s.y === p.y));
  return p;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }] as Point[],
    dir: "RIGHT" as Dir,
    nextDir: "RIGHT" as Dir,
    food: { x: 5, y: 5 } as Point,
    score: 0,
    running: false,
    dead: false,
  });
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "dead">("idle");

  // ─── Draw ──────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { snake, food } = stateRef.current;

    // background
    ctx.fillStyle = "#0d0d12";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.025)";
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

    // food — pulsing crimson dot
    const cx = food.x * CELL + CELL / 2;
    const cy = food.y * CELL + CELL / 2;
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL / 2);
    grd.addColorStop(0, "#ff3333");
    grd.addColorStop(1, "rgba(180,20,20,0)");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(cx, cy, CELL / 2 - 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff4040";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // snake
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      const lightness = isHead ? 1 : Math.max(0.3, 1 - i * (0.6 / snake.length));
      const r = Math.round(220 * lightness);
      const g = Math.round(240 * lightness);
      const b = Math.round(220 * lightness);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      const pad = isHead ? 1 : 2;
      ctx.fillRect(
        seg.x * CELL + pad,
        seg.y * CELL + pad,
        CELL - pad * 2,
        CELL - pad * 2
      );
      if (isHead) {
        // eyes
        ctx.fillStyle = "#0d0d12";
        const eyeSize = 3;
        if (stateRef.current.dir === "RIGHT" || stateRef.current.dir === "LEFT") {
          const ex = stateRef.current.dir === "RIGHT" ? seg.x * CELL + CELL - 6 : seg.x * CELL + 4;
          ctx.fillRect(ex, seg.y * CELL + 4, eyeSize, eyeSize);
          ctx.fillRect(ex, seg.y * CELL + CELL - 7, eyeSize, eyeSize);
        } else {
          const ey = stateRef.current.dir === "DOWN" ? seg.y * CELL + CELL - 6 : seg.y * CELL + 4;
          ctx.fillRect(seg.x * CELL + 4, ey, eyeSize, eyeSize);
          ctx.fillRect(seg.x * CELL + CELL - 7, ey, eyeSize, eyeSize);
        }
      }
    });
  }, []);

  // ─── Tick ──────────────────────────────────────────────────────────────────

  const tick = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;

    s.dir = s.nextDir;
    const head = s.snake[0];
    const newHead: Point = { ...head };

    if (s.dir === "UP") newHead.y -= 1;
    else if (s.dir === "DOWN") newHead.y += 1;
    else if (s.dir === "LEFT") newHead.x -= 1;
    else newHead.x += 1;

    // wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= COLS ||
      newHead.y < 0 ||
      newHead.y >= ROWS
    ) {
      s.running = false;
      s.dead = true;
      setStatus("dead");
      if (tickRef.current) clearInterval(tickRef.current);
      draw();
      return;
    }

    // self collision
    if (s.snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
      s.running = false;
      s.dead = true;
      setStatus("dead");
      if (tickRef.current) clearInterval(tickRef.current);
      draw();
      return;
    }

    const ate = newHead.x === s.food.x && newHead.y === s.food.y;
    s.snake = [newHead, ...s.snake];
    if (!ate) s.snake.pop();
    else {
      s.food = newFood(s.snake);
      s.score += 1;
      setScore(s.score);
    }

    draw();
  }, [draw]);

  // ─── Start / Restart ──────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    const initialSnake = [{ x: 10, y: 10 }];
    stateRef.current = {
      snake: initialSnake,
      dir: "RIGHT",
      nextDir: "RIGHT",
      food: newFood(initialSnake),
      score: 0,
      running: true,
      dead: false,
    };
    setScore(0);
    setStatus("running");
    tickRef.current = setInterval(tick, TICK_MS);
    draw();
  }, [tick, draw]);

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s.running) return;
      const map: Record<string, Dir> = {
        ArrowUp: "UP",
        w: "UP",
        W: "UP",
        ArrowDown: "DOWN",
        s: "DOWN",
        S: "DOWN",
        ArrowLeft: "LEFT",
        a: "LEFT",
        A: "LEFT",
        ArrowRight: "RIGHT",
        d: "RIGHT",
        D: "RIGHT",
      };
      const next = map[e.key];
      if (!next) return;
      const opposites: Record<Dir, Dir> = {
        UP: "DOWN",
        DOWN: "UP",
        LEFT: "RIGHT",
        RIGHT: "LEFT",
      };
      if (next !== opposites[s.dir]) {
        e.preventDefault();
        s.nextDir = next;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    draw();
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [draw]);

  // ─── D-Pad handler ────────────────────────────────────────────────────────

  const handleDpad = (dir: Dir) => {
    const s = stateRef.current;
    if (!s.running) return;
    const opposites: Record<Dir, Dir> = {
      UP: "DOWN",
      DOWN: "UP",
      LEFT: "RIGHT",
      RIGHT: "LEFT",
    };
    if (dir !== opposites[s.dir]) s.nextDir = dir;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score bar */}
      <div className="flex items-center justify-between w-full max-w-[400px] px-1">
        <span className="text-xs text-muted-foreground font-mono">SCORE</span>
        <span className="text-2xl font-bold font-mono vh-crimson-text tabular-nums">
          {String(score).padStart(4, "0")}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={start}
          className="h-7 px-2 text-xs gap-1 border-border hover:border-primary hover:text-primary"
        >
          {status === "idle" ? (
            <>
              <Play className="w-3 h-3" /> Start
            </>
          ) : (
            <>
              <RotateCcw className="w-3 h-3" /> Restart
            </>
          )}
        </Button>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="border border-border rounded-sm block max-w-full"
          style={{ imageRendering: "pixelated" }}
        />
        {status === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-sm gap-3">
            <p className="text-3xl font-bold font-mono text-foreground">
              GAME OVER
            </p>
            <p className="text-muted-foreground font-mono text-sm">
              Score: {score}
            </p>
            <Button
              onClick={start}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 mt-1"
            >
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </div>
        )}
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-sm gap-3">
            <p className="text-4xl">🐍</p>
            <p className="text-xl font-bold font-mono text-foreground">
              SNAKE
            </p>
            <p className="text-xs text-muted-foreground font-mono text-center px-4">
              Arrow keys or WASD to move
            </p>
            <Button
              onClick={start}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 mt-1"
            >
              <Play className="w-4 h-4" /> Start Game
            </Button>
          </div>
        )}
      </div>

      {/* Mobile D-Pad */}
      <div className="grid grid-cols-3 gap-1 md:hidden">
        <div />
        <Button
          variant="outline"
          size="sm"
          className="w-10 h-10 p-0"
          onPointerDown={() => handleDpad("UP")}
        >
          <ArrowUp className="w-4 h-4" />
        </Button>
        <div />
        <Button
          variant="outline"
          size="sm"
          className="w-10 h-10 p-0"
          onPointerDown={() => handleDpad("LEFT")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-10 h-10 p-0"
          onPointerDown={() => handleDpad("DOWN")}
        >
          <ArrowDown className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-10 h-10 p-0"
          onPointerDown={() => handleDpad("RIGHT")}
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
