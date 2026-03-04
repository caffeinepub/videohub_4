import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const W = 480;
const H = 480;
const PLAYER_W = 36;
const PLAYER_H = 18;
const BULLET_W = 3;
const BULLET_H = 12;
const ENEMY_W = 28;
const ENEMY_H = 20;
const ENEMY_COLS = 11;
const ENEMY_ROWS = 4;
const ENEMY_H_GAP = 44;
const ENEMY_V_GAP = 38;
const PLAYER_SPEED = 4;
const BULLET_SPEED = 7;
const ENEMY_BULLET_SPEED = 3;
const ENEMY_SHOOT_CHANCE = 0.0008;
const MAX_LIVES = 3;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  alive: boolean;
  type: number; // 0..3 for row type
}

interface Bullet {
  x: number;
  y: number;
  friendly: boolean;
}

function makeEnemies(): Rect[] {
  const enemies: Rect[] = [];
  const startX = (W - ENEMY_COLS * ENEMY_H_GAP) / 2 + 14;
  const startY = 60;
  for (let r = 0; r < ENEMY_ROWS; r++) {
    for (let c = 0; c < ENEMY_COLS; c++) {
      enemies.push({
        x: startX + c * ENEMY_H_GAP,
        y: startY + r * ENEMY_V_GAP,
        w: ENEMY_W,
        h: ENEMY_H,
        alive: true,
        type: r % 4,
      });
    }
  }
  return enemies;
}

function overlaps(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SpaceInvadersGameProps {
  onGameOver?: (score: number) => void;
}

export default function SpaceInvadersGame({ onGameOver }: SpaceInvadersGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [status, setStatus] = useState<"idle" | "running" | "won" | "lost">("idle");

  const gameRef = useRef({
    playerX: W / 2 - PLAYER_W / 2,
    enemies: makeEnemies(),
    bullets: [] as Bullet[],
    enemyDir: 1 as 1 | -1,
    enemySpeed: 0.8,
    score: 0,
    lives: MAX_LIVES,
    running: false,
    frame: 0,
    // input
    leftDown: false,
    rightDown: false,
    shootDown: false,
    lastShot: 0,
  });

  // ─── Draw ──────────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const g = gameRef.current;

    // Background
    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    const starSeeds = [
      [43, 22], [120, 80], [200, 40], [320, 100], [440, 30],
      [60, 150], [170, 200], [280, 170], [390, 220], [470, 90],
      [100, 300], [230, 340], [360, 290], [420, 350], [30, 400],
      [150, 420], [250, 460], [380, 440], [450, 410], [490, 460],
    ];
    for (const [sx, sy] of starSeeds) {
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Ground line
    ctx.strokeStyle = "#00ff41";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, H - 24);
    ctx.lineTo(W, H - 24);
    ctx.stroke();
    ctx.setLineDash([]);

    // Player ship
    const px = g.playerX;
    const py = H - 24 - PLAYER_H - 4;
    ctx.fillStyle = "#00ff41";
    // Body
    ctx.beginPath();
    ctx.moveTo(px + PLAYER_W / 2, py);
    ctx.lineTo(px + PLAYER_W - 4, py + PLAYER_H);
    ctx.lineTo(px + 4, py + PLAYER_H);
    ctx.closePath();
    ctx.fill();
    // Cannon
    ctx.fillStyle = "#00cc33";
    ctx.fillRect(px + PLAYER_W / 2 - 2, py - 6, 4, 8);
    // Engine glow
    ctx.fillStyle = "#00ff41";
    ctx.shadowColor = "#00ff41";
    ctx.shadowBlur = 8;
    ctx.fillRect(px + PLAYER_W / 2 - 8, py + PLAYER_H - 2, 16, 4);
    ctx.shadowBlur = 0;

    // Enemies
    for (const e of g.enemies) {
      if (!e.alive) continue;
      const ex = e.x - e.w / 2;
      const ey = e.y - e.h / 2;

      const neonColors = ["#ff00ff", "#00ffff", "#ffff00", "#ff6600"];
      const col = neonColors[e.type];

      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 6;

      if (e.type === 0) {
        // crab shape
        ctx.fillRect(ex + 6, ey + 2, 16, 12);
        ctx.fillRect(ex + 2, ey + 6, 4, 6);
        ctx.fillRect(ex + 22, ey + 6, 4, 6);
        ctx.fillRect(ex + 4, ey + 14, 6, 4);
        ctx.fillRect(ex + 18, ey + 14, 6, 4);
        // eyes
        ctx.fillStyle = "#050810";
        ctx.fillRect(ex + 8, ey + 5, 4, 4);
        ctx.fillRect(ex + 16, ey + 5, 4, 4);
      } else if (e.type === 1) {
        // squid shape
        ctx.fillRect(ex + 8, ey, 12, 14);
        ctx.fillRect(ex + 4, ey + 4, 4, 8);
        ctx.fillRect(ex + 20, ey + 4, 4, 8);
        ctx.fillRect(ex + 4, ey + 14, 4, 4);
        ctx.fillRect(ex + 12, ey + 14, 4, 4);
        ctx.fillRect(ex + 20, ey + 14, 4, 4);
        ctx.fillStyle = "#050810";
        ctx.fillRect(ex + 10, ey + 4, 3, 4);
        ctx.fillRect(ex + 15, ey + 4, 3, 4);
      } else if (e.type === 2) {
        // mushroom
        ctx.fillRect(ex + 4, ey + 2, 20, 10);
        ctx.fillRect(ex + 2, ey + 10, 24, 8);
        ctx.fillRect(ex + 6, ey + 10, 4, 4);
        ctx.fillRect(ex + 18, ey + 10, 4, 4);
        ctx.fillStyle = "#050810";
        ctx.fillRect(ex + 8, ey + 5, 4, 4);
        ctx.fillRect(ex + 16, ey + 5, 4, 4);
      } else {
        // saucer
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(e.x - 6, e.y - 11, 12, 8);
        ctx.fillStyle = "#050810";
        ctx.beginPath();
        ctx.arc(e.x - 4, e.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(e.x + 4, e.y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    // Bullets
    for (const b of g.bullets) {
      ctx.shadowColor = b.friendly ? "#00ff41" : "#ff3333";
      ctx.shadowBlur = 6;
      ctx.fillStyle = b.friendly ? "#00ff41" : "#ff3333";
      ctx.fillRect(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H);
    }
    ctx.shadowBlur = 0;

    // HUD
    ctx.fillStyle = "#00ff41";
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText(`SCR ${String(g.score).padStart(5, "0")}`, 8, 18);

    ctx.fillStyle = "#ff3333";
    const livesText = "♥".repeat(g.lives);
    const lw = ctx.measureText(livesText).width;
    ctx.fillText(livesText, W - lw - 8, 18);
  }, []);

  // ─── Update ────────────────────────────────────────────────────────────────

  const update = useCallback(() => {
    const g = gameRef.current;
    if (!g.running) return;
    g.frame++;

    // Move player
    if (g.leftDown) g.playerX = Math.max(0, g.playerX - PLAYER_SPEED);
    if (g.rightDown) g.playerX = Math.min(W - PLAYER_W, g.playerX + PLAYER_SPEED);

    // Shoot
    if (g.shootDown && g.frame - g.lastShot > 20) {
      g.bullets.push({ x: g.playerX + PLAYER_W / 2, y: H - 24 - PLAYER_H - 10, friendly: true });
      g.lastShot = g.frame;
    }

    // Move bullets
    g.bullets = g.bullets.filter((b) => b.y > -20 && b.y < H + 20);
    for (const b of g.bullets) {
      b.y += b.friendly ? -BULLET_SPEED : BULLET_SPEED;
    }

    // Enemy movement
    const alive = g.enemies.filter((e) => e.alive);
    if (alive.length === 0) {
      g.running = false;
      setStatus("won");
      return;
    }

    let hitWall = false;
    for (const e of alive) {
      e.x += g.enemyDir * g.enemySpeed;
      if (e.x + e.w / 2 >= W - 4 || e.x - e.w / 2 <= 4) {
        hitWall = true;
      }
    }
    if (hitWall) {
      g.enemyDir = (g.enemyDir === 1 ? -1 : 1) as 1 | -1;
      for (const e of alive) {
        e.y += 8;
        e.x -= g.enemyDir * 2;
      }
      // Speed up as enemies die
      g.enemySpeed = 0.8 + (ENEMY_COLS * ENEMY_ROWS - alive.length) * 0.04;
    }

    // Check enemy reaches bottom
    for (const e of alive) {
      if (e.y + e.h / 2 >= H - 24 - PLAYER_H) {
        g.running = false;
        onGameOver?.(g.score);
        setStatus("lost");
        return;
      }
    }

    // Enemy random shooting
    const shooters = alive.filter((e) => {
      const col = Math.round((e.x - 14) / ENEMY_H_GAP);
      const colEnemies = alive.filter((o) => Math.round((o.x - 14) / ENEMY_H_GAP) === col);
      return colEnemies[colEnemies.length - 1] === e;
    });
    for (const s of shooters) {
      if (Math.random() < ENEMY_SHOOT_CHANCE * alive.length) {
        g.bullets.push({ x: s.x, y: s.y + s.h / 2 + 2, friendly: false });
      }
    }

    // Collision: player bullets vs enemies
    for (const b of g.bullets) {
      if (!b.friendly) continue;
      for (const e of g.enemies) {
        if (!e.alive) continue;
        if (overlaps(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H,
          e.x - e.w / 2, e.y - e.h / 2, e.w, e.h)) {
          e.alive = false;
          b.y = -999;
          g.score += [30, 20, 20, 10][e.type] ?? 10;
          setScore(g.score);
        }
      }
    }

    // Collision: enemy bullets vs player
    const py = H - 24 - PLAYER_H - 4;
    for (const b of g.bullets) {
      if (b.friendly) continue;
      if (overlaps(b.x - BULLET_W / 2, b.y - BULLET_H / 2, BULLET_W, BULLET_H,
        g.playerX, py, PLAYER_W, PLAYER_H)) {
        b.y = 999;
        g.lives -= 1;
        setLives(g.lives);
        if (g.lives <= 0) {
          g.running = false;
          onGameOver?.(g.score);
          setStatus("lost");
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

  const startGame = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const g = gameRef.current;
    g.playerX = W / 2 - PLAYER_W / 2;
    g.enemies = makeEnemies();
    g.bullets = [];
    g.enemyDir = 1;
    g.enemySpeed = 0.8;
    g.score = 0;
    g.lives = MAX_LIVES;
    g.running = true;
    g.frame = 0;
    g.lastShot = 0;
    g.leftDown = false;
    g.rightDown = false;
    g.shootDown = false;
    setScore(0);
    setLives(MAX_LIVES);
    setStatus("running");
    animRef.current = requestAnimationFrame(loop);
  }, [loop]);

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
      if (e.key === " " || e.key === "ArrowUp") {
        g.shootDown = down;
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
      {/* HUD outside canvas */}
      <div className="flex items-center justify-between w-full max-w-[480px] px-1">
        <span className="text-xs text-muted-foreground font-mono">SPACE INVADERS</span>
        <span
          className="text-lg font-bold tabular-nums"
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
          style={{ imageRendering: "pixelated" }}
        />
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 gap-3">
            <p className="text-4xl">👾</p>
            <p
              className="text-center"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.7rem", color: "#00ff41" }}
            >
              SPACE INVADERS
            </p>
            <p className="text-xs text-muted-foreground font-mono text-center px-6">
              Arrow keys / A-D to move · Space to shoot
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
          onPointerDown={() => { gameRef.current.shootDown = true; }}
          onPointerUp={() => { gameRef.current.shootDown = false; }}
        >
          🔫
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
