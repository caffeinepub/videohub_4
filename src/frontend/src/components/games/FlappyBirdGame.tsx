import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 360;
const H = 480;
const BIRD_X = 80;
const BIRD_R = 14;
const GRAVITY = 0.38;
const FLAP_VEL = -7.5;
const PIPE_W = 52;
const PIPE_GAP = 140;
const PIPE_SPEED = 2.5;
const PIPE_INTERVAL = 90; // frames between pipes

interface Pipe {
  x: number;
  gapY: number; // center of gap
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FlappyBirdGameProps {
  onGameOver?: (score: number) => void;
}

export default function FlappyBirdGame({ onGameOver }: FlappyBirdGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<"idle" | "running" | "dead">("idle");

  const gameRef = useRef({
    birdY: H / 2,
    birdVY: 0,
    pipes: [] as Pipe[],
    score: 0,
    running: false,
    frame: 0,
    lastPipeFrame: -PIPE_INTERVAL,
    rotation: 0,
  });

  // ─── Draw ──────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#050c1a");
    sky.addColorStop(1, "#0a1a2e");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Parallax stars
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    const stars = [
      [30, 40], [80, 20], [140, 60], [200, 30], [270, 55],
      [320, 25], [50, 120], [110, 100], [180, 140], [250, 90],
      [300, 150], [20, 200], [90, 230], [160, 190], [240, 220],
    ];
    for (const [sx, sy] of stars) {
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Ground
    const groundH = 40;
    ctx.fillStyle = "#1a4a1a";
    ctx.fillRect(0, H - groundH, W, groundH);
    // Ground texture lines
    ctx.strokeStyle = "#00aa22";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 20) {
      const phase = ((g.frame * PIPE_SPEED) % 20);
      ctx.beginPath();
      ctx.moveTo(gx - phase, H - groundH);
      ctx.lineTo(gx - phase, H - groundH + 6);
      ctx.stroke();
    }
    // Ground top line
    ctx.strokeStyle = "#00ff41";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, H - groundH);
    ctx.lineTo(W, H - groundH);
    ctx.stroke();

    // Pipes
    for (const p of g.pipes) {
      const topH = p.gapY - PIPE_GAP / 2;
      const botY = p.gapY + PIPE_GAP / 2;
      const botH = H - groundH - botY;

      // Pipe body
      ctx.fillStyle = "#00aa33";
      ctx.shadowColor = "#00ff41";
      ctx.shadowBlur = 8;
      // Top pipe
      ctx.fillRect(p.x, 0, PIPE_W, topH - 8);
      // Top pipe cap
      ctx.fillStyle = "#00cc44";
      ctx.fillRect(p.x - 4, topH - 16, PIPE_W + 8, 16);
      // Bottom pipe cap
      ctx.fillStyle = "#00cc44";
      ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 16);
      // Bottom pipe body
      ctx.fillStyle = "#00aa33";
      ctx.fillRect(p.x, botY + 16, PIPE_W, botH);
      ctx.shadowBlur = 0;

      // Pipe highlights
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(p.x + 6, 0, 8, topH - 8);
      ctx.fillRect(p.x + 6, botY + 16, 8, botH);
    }

    // Bird
    ctx.save();
    ctx.translate(BIRD_X, g.birdY);
    ctx.rotate(Math.max(-Math.PI / 4, Math.min(Math.PI / 2, g.birdVY * 0.08)));

    // Body
    ctx.fillStyle = "#ffcc00";
    ctx.shadowColor = "#ffcc00";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_R, BIRD_R - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Wing
    ctx.fillStyle = "#ff9900";
    const wingFlap = Math.sin(g.frame * 0.3) * 4;
    ctx.beginPath();
    ctx.ellipse(-2, wingFlap, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(5, -3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(6, -3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(6, -4, 1.5, 1.5);

    // Beak
    ctx.fillStyle = "#ff6600";
    ctx.beginPath();
    ctx.moveTo(BIRD_R - 2, -2);
    ctx.lineTo(BIRD_R + 8, 0);
    ctx.lineTo(BIRD_R - 2, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Score
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    ctx.font = "bold 28px 'Press Start 2P', monospace";
    const sw = ctx.measureText(`${g.score}`).width;
    ctx.fillText(`${g.score}`, W / 2 - sw / 2, 60);
    ctx.shadowBlur = 0;
  }, []);

  // ─── Update ────────────────────────────────────────────────────────────────

  const update = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    g.frame++;

    // Gravity
    g.birdVY += GRAVITY;
    g.birdY += g.birdVY;

    // Ground/ceiling collision
    if (g.birdY + BIRD_R >= H - 40 || g.birdY - BIRD_R <= 0) {
      g.running = false;
      onGameOver?.(g.score);
      setStatus("dead");
      return;
    }

    // Spawn pipes
    if (g.frame - g.lastPipeFrame >= PIPE_INTERVAL) {
      const minGapY = 100;
      const maxGapY = H - 40 - 100;
      const gapY = minGapY + Math.random() * (maxGapY - minGapY);
      g.pipes.push({ x: W + PIPE_W, gapY });
      g.lastPipeFrame = g.frame;
    }

    // Move pipes
    for (const p of g.pipes) {
      p.x -= PIPE_SPEED;
    }

    // Remove off-screen pipes
    g.pipes = g.pipes.filter((p) => p.x + PIPE_W > -10);

    // Score (passing pipe)
    for (const p of g.pipes) {
      if (p.x + PIPE_W < BIRD_X && p.x + PIPE_W >= BIRD_X - PIPE_SPEED) {
        g.score++;
        setScore(g.score);
      }
    }

    // Pipe collision
    for (const p of g.pipes) {
      if (BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W) {
        const topEdge = p.gapY - PIPE_GAP / 2;
        const botEdge = p.gapY + PIPE_GAP / 2;
        if (g.birdY - BIRD_R < topEdge || g.birdY + BIRD_R > botEdge) {
          g.running = false;
          onGameOver?.(g.score);
          setStatus("dead");
          return;
        }
      }
    }
  }, [onGameOver]);

  // ─── Loop ──────────────────────────────────────────────────────────────────

  const loop = useCallback(() => {
    update();
    draw();
    animRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  const flap = useCallback(() => {
    const g = gameRef.current;
    if (g.running) {
      g.birdVY = FLAP_VEL;
    }
  }, []);

  const startGame = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const g = gameRef.current;
    g.birdY = H / 2;
    g.birdVY = 0;
    g.pipes = [];
    g.score = 0;
    g.running = true;
    g.frame = 0;
    g.lastPipeFrame = -PIPE_INTERVAL;
    setScore(0);
    setStatus("running");
    animRef.current = requestAnimationFrame(loop);
  }, [loop]);

  // ─── Input ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    const onClick = () => flap();
    window.addEventListener("keydown", onKeyDown);
    canvas?.addEventListener("click", onClick);
    canvas?.addEventListener("touchstart", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      canvas?.removeEventListener("click", onClick);
      canvas?.removeEventListener("touchstart", onClick);
    };
  }, [flap]);

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
      <div className="flex items-center justify-between w-full max-w-[360px] px-1">
        <span className="text-xs text-muted-foreground font-mono">FLAPPY BIRD</span>
        <span
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.6rem", color: "#ffcc00" }}
        >
          {String(score).padStart(3, "0")}
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
          className="border border-border block max-w-full cursor-pointer"
          style={{ imageRendering: "pixelated" }}
          onClick={flap}
        />
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-3">
            <p className="text-4xl">🐦</p>
            <p
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.7rem", color: "#ffcc00" }}
            >
              FLAPPY BIRD
            </p>
            <p className="text-xs text-muted-foreground font-mono text-center px-6">
              Click or Space to flap
            </p>
            <Button onClick={startGame} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Play className="w-4 h-4" /> Start Game
            </Button>
          </div>
        )}
        {status === "dead" && (
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
      </div>

      <p className="text-xs text-muted-foreground font-mono text-center">
        Click canvas or press Space to flap
      </p>
    </div>
  );
}
