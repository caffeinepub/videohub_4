import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 600;
const H = 400;
const PADDLE_W = 12;
const PADDLE_H = 70;
const BALL_SIZE = 10;
const PADDLE_SPEED = 5;
const BALL_SPEED_INIT = 4;
const BALL_SPEED_MAX = 10;
const WINNING_SCORE = 5;
const AI_SPEED = 3.5;

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameState {
  ballX: number;
  ballY: number;
  ballVX: number;
  ballVY: number;
  leftY: number;
  rightY: number;
  scoreLeft: number;
  scoreRight: number;
  running: boolean;
  over: boolean;
  winner: "left" | "right" | null;
}

function initState(): GameState {
  const angle = (Math.random() * Math.PI) / 4 - Math.PI / 8;
  const dir = Math.random() < 0.5 ? 1 : -1;
  return {
    ballX: W / 2,
    ballY: H / 2,
    ballVX: Math.cos(angle) * BALL_SPEED_INIT * dir,
    ballVY: Math.sin(angle) * BALL_SPEED_INIT,
    leftY: H / 2 - PADDLE_H / 2,
    rightY: H / 2 - PADDLE_H / 2,
    scoreLeft: 0,
    scoreRight: 0,
    running: false,
    over: false,
    winner: null,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(initState());
  const rafRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());

  const [scoreLeft, setScoreLeft] = useState(0);
  const [scoreRight, setScoreRight] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "over">("idle");
  const [winner, setWinner] = useState<"left" | "right" | null>(null);

  // ─── Draw ──────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;

    // Background
    ctx.fillStyle = "#020a02";
    ctx.fillRect(0, 0, W, H);

    // Center line (dashed)
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = "rgba(0,255,0,0.15)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Court border
    ctx.strokeStyle = "rgba(0,255,0,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, W - 2, H - 2);

    // Left Paddle
    ctx.shadowColor = "rgba(0,255,160,0.8)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#00ffa0";
    ctx.fillRect(20, s.leftY, PADDLE_W, PADDLE_H);

    // Right Paddle
    ctx.shadowColor = "rgba(0,200,255,0.8)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#00c8ff";
    ctx.fillRect(W - 20 - PADDLE_W, s.rightY, PADDLE_W, PADDLE_H);

    // Ball
    ctx.shadowColor = "rgba(255,255,0,0.9)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ffff00";
    ctx.fillRect(
      s.ballX - BALL_SIZE / 2,
      s.ballY - BALL_SIZE / 2,
      BALL_SIZE,
      BALL_SIZE
    );
    ctx.shadowBlur = 0;

    // Scores
    ctx.font = "bold 32px 'Press Start 2P', monospace";
    ctx.fillStyle = "rgba(0,255,0,0.5)";
    ctx.textAlign = "center";
    ctx.fillText(String(s.scoreLeft), W / 4, 50);
    ctx.fillText(String(s.scoreRight), (3 * W) / 4, 50);
  }, []);

  // ─── Reset ball helper ─────────────────────────────────────────────────────

  const resetBall = useCallback((s: GameState, dir: number) => {
    s.ballX = W / 2;
    s.ballY = H / 2;
    const angle = (Math.random() * Math.PI) / 4 - Math.PI / 8;
    s.ballVX = Math.cos(angle) * BALL_SPEED_INIT * dir;
    s.ballVY = Math.sin(angle) * BALL_SPEED_INIT;
  }, []);

  // ─── Game loop ─────────────────────────────────────────────────────────────

  const loop = useCallback(() => {
    const s = stateRef.current;
    if (!s.running) return;

    // Player left paddle (W/S keys)
    if (keysRef.current.has("w") || keysRef.current.has("W")) {
      s.leftY = Math.max(0, s.leftY - PADDLE_SPEED);
    }
    if (keysRef.current.has("s") || keysRef.current.has("S")) {
      s.leftY = Math.min(H - PADDLE_H, s.leftY + PADDLE_SPEED);
    }

    // AI right paddle (tracks ball)
    const rightCenter = s.rightY + PADDLE_H / 2;
    if (rightCenter < s.ballY - 5) {
      s.rightY = Math.min(H - PADDLE_H, s.rightY + AI_SPEED);
    } else if (rightCenter > s.ballY + 5) {
      s.rightY = Math.max(0, s.rightY - AI_SPEED);
    }

    // Move ball
    s.ballX += s.ballVX;
    s.ballY += s.ballVY;

    // Top/bottom bounce
    if (s.ballY - BALL_SIZE / 2 <= 0) {
      s.ballY = BALL_SIZE / 2;
      s.ballVY = Math.abs(s.ballVY);
    }
    if (s.ballY + BALL_SIZE / 2 >= H) {
      s.ballY = H - BALL_SIZE / 2;
      s.ballVY = -Math.abs(s.ballVY);
    }

    // Left paddle collision
    if (
      s.ballX - BALL_SIZE / 2 <= 20 + PADDLE_W &&
      s.ballX - BALL_SIZE / 2 >= 20 &&
      s.ballY >= s.leftY &&
      s.ballY <= s.leftY + PADDLE_H
    ) {
      const hitPos = (s.ballY - s.leftY) / PADDLE_H - 0.5;
      const speed = Math.min(
        BALL_SPEED_MAX,
        Math.sqrt(s.ballVX ** 2 + s.ballVY ** 2) + 0.3
      );
      const angle = hitPos * (Math.PI / 3);
      s.ballVX = Math.cos(angle) * speed;
      s.ballVY = Math.sin(angle) * speed;
      s.ballX = 20 + PADDLE_W + BALL_SIZE / 2;
    }

    // Right paddle collision
    if (
      s.ballX + BALL_SIZE / 2 >= W - 20 - PADDLE_W &&
      s.ballX + BALL_SIZE / 2 <= W - 20 &&
      s.ballY >= s.rightY &&
      s.ballY <= s.rightY + PADDLE_H
    ) {
      const hitPos = (s.ballY - s.rightY) / PADDLE_H - 0.5;
      const speed = Math.min(
        BALL_SPEED_MAX,
        Math.sqrt(s.ballVX ** 2 + s.ballVY ** 2) + 0.3
      );
      const angle = hitPos * (Math.PI / 3);
      s.ballVX = -Math.cos(angle) * speed;
      s.ballVY = Math.sin(angle) * speed;
      s.ballX = W - 20 - PADDLE_W - BALL_SIZE / 2;
    }

    // Score left (ball goes off right)
    if (s.ballX > W + 20) {
      s.scoreLeft += 1;
      setScoreLeft(s.scoreLeft);
      if (s.scoreLeft >= WINNING_SCORE) {
        s.running = false;
        s.over = true;
        s.winner = "left";
        setStatus("over");
        setWinner("left");
        draw();
        return;
      }
      resetBall(s, 1);
    }

    // Score right (ball goes off left)
    if (s.ballX < -20) {
      s.scoreRight += 1;
      setScoreRight(s.scoreRight);
      if (s.scoreRight >= WINNING_SCORE) {
        s.running = false;
        s.over = true;
        s.winner = "right";
        setStatus("over");
        setWinner("right");
        draw();
        return;
      }
      resetBall(s, -1);
    }

    draw();
    rafRef.current = requestAnimationFrame(loop);
  }, [draw, resetBall]);

  // ─── Start ────────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stateRef.current = initState();
    stateRef.current.running = true;
    setScoreLeft(0);
    setScoreRight(0);
    setStatus("running");
    setWinner(null);
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (["w", "W", "s", "S", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    draw();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Score bar */}
      <div className="flex items-center justify-between w-full max-w-[600px] px-1">
        <div className="text-center">
          <p
            className="text-[0.4rem] neon-text-cyan mb-1"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            PLAYER
          </p>
          <p className="text-2xl neon-text-cyan tabular-nums">{scoreLeft}</p>
        </div>
        <div className="text-center">
          <p
            className="text-[0.4rem] neon-text-green mb-1"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            FIRST TO {WINNING_SCORE}
          </p>
          <p className="text-xs text-muted-foreground">W/S to move</p>
        </div>
        <div className="text-center">
          <p
            className="text-[0.4rem] neon-text-amber mb-1"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            AI
          </p>
          <p className="text-2xl neon-text-amber tabular-nums">{scoreRight}</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="block pixel-border max-w-full"
          style={{ imageRendering: "pixelated", maxWidth: "min(600px, calc(100vw - 2rem))" }}
        />
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 gap-3">
            <p className="text-4xl">🏓</p>
            <p
              className="text-sm neon-text-amber text-center"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              PONG
            </p>
            <p className="text-sm text-muted-foreground text-center px-4">
              W / S to move your paddle<br />First to {WINNING_SCORE} wins
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
              {winner === "left" ? "YOU WIN!" : "AI WINS"}
            </p>
            <p className="text-base text-muted-foreground">
              {scoreLeft} — {scoreRight}
            </p>
            <Button
              onClick={start}
              className="bg-primary hover:bg-primary/80 text-primary-foreground gap-2 rounded-none font-['Press_Start_2P'] text-[0.5rem] mt-1"
            >
              <RotateCcw className="w-4 h-4" /> PLAY AGAIN
            </Button>
          </div>
        )}
      </div>

      {status === "running" && (
        <Button
          size="sm"
          variant="outline"
          onClick={start}
          className="rounded-none border-border font-['Press_Start_2P'] text-[0.45rem] hover:border-primary hover:text-primary"
        >
          <RotateCcw className="w-3 h-3 mr-1" /> RESTART
        </Button>
      )}
    </div>
  );
}
