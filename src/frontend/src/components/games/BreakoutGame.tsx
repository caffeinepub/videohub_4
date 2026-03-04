import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 480;
const H = 480;
const PADDLE_W = 80;
const PADDLE_H = 12;
const PADDLE_Y = H - 36;
const BALL_R = 7;
const BRICK_COLS = 10;
const BRICK_ROWS = 6;
const BRICK_W = (W - 20) / BRICK_COLS - 4;
const BRICK_H = 16;
const BRICK_START_Y = 56;
const BRICK_GAP = 4;
const PADDLE_SPEED = 6;
const INIT_BALL_SPEED = 4.5;
const SPEED_INC = 0.06;
const MAX_LIVES = 3;

interface Brick {
  x: number;
  y: number;
  alive: boolean;
  color: string;
}

const ROW_COLORS = [
  "#ff3333", "#ff6600", "#ffcc00", "#33ff99", "#00ccff", "#cc66ff",
];

function makeBricks(): Brick[] {
  const bricks: Brick[] = [];
  const totalW = BRICK_COLS * (BRICK_W + BRICK_GAP) - BRICK_GAP;
  const startX = (W - totalW) / 2;
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: startX + c * (BRICK_W + BRICK_GAP),
        y: BRICK_START_Y + r * (BRICK_H + BRICK_GAP),
        alive: true,
        color: ROW_COLORS[r % ROW_COLORS.length],
      });
    }
  }
  return bricks;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BreakoutGameProps {
  onGameOver?: (score: number) => void;
}

export default function BreakoutGame({ onGameOver }: BreakoutGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [status, setStatus] = useState<"idle" | "running" | "won" | "lost">("idle");

  const gameRef = useRef({
    paddleX: W / 2 - PADDLE_W / 2,
    ballX: W / 2,
    ballY: H / 2 + 60,
    ballVX: 3,
    ballVY: -INIT_BALL_SPEED,
    ballSpeed: INIT_BALL_SPEED,
    bricks: makeBricks(),
    score: 0,
    lives: MAX_LIVES,
    running: false,
    leftDown: false,
    rightDown: false,
    mousePaddleX: -1,
  });

  // ─── Draw ──────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#050810");
    bg.addColorStop(1, "#0d0520");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Bricks
    for (const b of g.bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
      // Highlight top
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(b.x + 1, b.y + 1, BRICK_W - 2, 3);
      ctx.shadowBlur = 0;
    }

    // Paddle
    ctx.fillStyle = "#00ff41";
    ctx.shadowColor = "#00ff41";
    ctx.shadowBlur = 12;
    const rx = 4;
    ctx.beginPath();
    ctx.roundRect(g.paddleX, PADDLE_Y, PADDLE_W, PADDLE_H, rx);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ball
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "#88eeff";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(g.ballX, g.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Lives dots
    for (let i = 0; i < g.lives; i++) {
      ctx.fillStyle = "#ff3333";
      ctx.shadowColor = "#ff3333";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(10 + i * 18, H - 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Score
    ctx.fillStyle = "#00ff41";
    ctx.font = "10px 'Press Start 2P', monospace";
    const sw = ctx.measureText(`${g.score}`).width;
    ctx.fillText(`${g.score}`, W - sw - 8, H - 6);
  }, []);

  // ─── Update ────────────────────────────────────────────────────────────────

  const update = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;

    // Paddle movement
    if (g.mousePaddleX >= 0) {
      g.paddleX = Math.max(0, Math.min(W - PADDLE_W, g.mousePaddleX - PADDLE_W / 2));
    } else {
      if (g.leftDown) g.paddleX = Math.max(0, g.paddleX - PADDLE_SPEED);
      if (g.rightDown) g.paddleX = Math.min(W - PADDLE_W, g.paddleX + PADDLE_SPEED);
    }

    // Move ball
    g.ballX += g.ballVX;
    g.ballY += g.ballVY;

    // Wall collisions
    if (g.ballX - BALL_R <= 0) { g.ballX = BALL_R; g.ballVX = Math.abs(g.ballVX); }
    if (g.ballX + BALL_R >= W) { g.ballX = W - BALL_R; g.ballVX = -Math.abs(g.ballVX); }
    if (g.ballY - BALL_R <= 0) { g.ballY = BALL_R; g.ballVY = Math.abs(g.ballVY); }

    // Ball lost
    if (g.ballY - BALL_R > H) {
      g.lives -= 1;
      setLives(g.lives);
      if (g.lives <= 0) {
        g.running = false;
        onGameOver?.(g.score);
        setStatus("lost");
        return;
      }
      // Reset ball
      g.ballX = g.paddleX + PADDLE_W / 2;
      g.ballY = PADDLE_Y - 20;
      g.ballVX = (Math.random() > 0.5 ? 1 : -1) * 3;
      g.ballVY = -g.ballSpeed;
      return;
    }

    // Paddle collision
    if (
      g.ballY + BALL_R >= PADDLE_Y &&
      g.ballY + BALL_R <= PADDLE_Y + PADDLE_H + Math.abs(g.ballVY) &&
      g.ballX >= g.paddleX - BALL_R &&
      g.ballX <= g.paddleX + PADDLE_W + BALL_R
    ) {
      g.ballVY = -Math.abs(g.ballVY);
      // Angle based on hit position
      const hitPos = (g.ballX - g.paddleX) / PADDLE_W; // 0..1
      g.ballVX = (hitPos - 0.5) * 2 * g.ballSpeed;
      // Speed up
      g.ballSpeed += SPEED_INC;
      const mag = Math.sqrt(g.ballVX ** 2 + g.ballVY ** 2);
      const scale = g.ballSpeed / mag;
      g.ballVX *= scale;
      g.ballVY *= scale;
      g.ballY = PADDLE_Y - BALL_R - 1;
    }

    // Brick collisions
    let hitAny = false;
    for (const b of g.bricks) {
      if (!b.alive) continue;
      const bRight = b.x + BRICK_W;
      const bBottom = b.y + BRICK_H;
      if (
        g.ballX + BALL_R > b.x &&
        g.ballX - BALL_R < bRight &&
        g.ballY + BALL_R > b.y &&
        g.ballY - BALL_R < bBottom
      ) {
        b.alive = false;
        hitAny = true;
        g.score += 10;
        setScore(g.score);

        // Determine bounce axis
        const overlapL = g.ballX + BALL_R - b.x;
        const overlapR = bRight - (g.ballX - BALL_R);
        const overlapT = g.ballY + BALL_R - b.y;
        const overlapB = bBottom - (g.ballY - BALL_R);
        const minH = Math.min(overlapL, overlapR);
        const minV = Math.min(overlapT, overlapB);
        if (minH < minV) {
          g.ballVX = -g.ballVX;
        } else {
          g.ballVY = -g.ballVY;
        }
        break;
      }
    }

    if (!hitAny && g.bricks.every((b) => !b.alive)) {
      g.running = false;
      onGameOver?.(g.score);
      setStatus("won");
    }
  }, [onGameOver]);

  // ─── Loop ──────────────────────────────────────────────────────────────────

  const loop = useCallback(() => {
    update();
    draw();
    animRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  const startGame = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const g = gameRef.current;
    g.paddleX = W / 2 - PADDLE_W / 2;
    g.ballX = W / 2;
    g.ballY = H / 2 + 60;
    g.ballSpeed = INIT_BALL_SPEED;
    g.ballVX = 3;
    g.ballVY = -INIT_BALL_SPEED;
    g.bricks = makeBricks();
    g.score = 0;
    g.lives = MAX_LIVES;
    g.running = true;
    g.leftDown = false;
    g.rightDown = false;
    g.mousePaddleX = -1;
    setScore(0);
    setLives(MAX_LIVES);
    setStatus("running");
    animRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // ─── Mouse ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      gameRef.current.mousePaddleX = (e.clientX - rect.left) * scaleX;
    };
    const onMouseLeave = () => { gameRef.current.mousePaddleX = -1; };
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);
    return () => {
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      const g = gameRef.current;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        g.leftDown = down;
        if (down) e.preventDefault();
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        g.rightDown = down;
        if (down) e.preventDefault();
      }
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    draw();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [draw]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-[480px] px-1">
        <span className="text-xs text-muted-foreground font-mono">BREAKOUT</span>
        <span
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.6rem", color: "#00ff41" }}
        >
          {String(score).padStart(5, "0")}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={startGame}
          className="h-7 px-2 text-xs gap-1 border-border hover:border-primary hover:text-primary"
        >
          {status === "idle" ? (
            <><Play className="w-3 h-3" /> Start</>
          ) : (
            <><RotateCcw className="w-3 h-3" /> Restart</>
          )}
        </Button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="border border-border block max-w-full"
          style={{ imageRendering: "pixelated", cursor: "none" }}
        />
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-3">
            <p className="text-4xl">🧱</p>
            <p
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.7rem", color: "#00ff41" }}
            >
              BREAKOUT
            </p>
            <p className="text-xs text-muted-foreground font-mono text-center px-6">
              Mouse or Arrow keys to move paddle
            </p>
            <Button onClick={startGame} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Play className="w-4 h-4" /> Start Game
            </Button>
          </div>
        )}
        {status === "lost" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-3">
            <p
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.8rem", color: "#ff3333" }}
            >
              GAME OVER
            </p>
            <p className="text-xs text-muted-foreground font-mono">Score: {score}</p>
            <Button onClick={startGame} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </div>
        )}
        {status === "won" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-3">
            <p
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.7rem", color: "#00ff41" }}
            >
              YOU WIN!
            </p>
            <p className="text-xs text-muted-foreground font-mono">Score: {score}</p>
            <Button onClick={startGame} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </div>
        )}
      </div>

      {/* Mobile controls */}
      <div className="flex gap-4 md:hidden">
        <Button
          variant="outline"
          size="sm"
          className="w-14 h-10"
          onPointerDown={() => { gameRef.current.leftDown = true; }}
          onPointerUp={() => { gameRef.current.leftDown = false; }}
        >
          ◀
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-14 h-10"
          onPointerDown={() => { gameRef.current.rightDown = true; }}
          onPointerUp={() => { gameRef.current.rightDown = false; }}
        >
          ▶
        </Button>
      </div>
    </div>
  );
}
