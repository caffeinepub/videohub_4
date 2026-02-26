import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOLES = 9;
const GAME_DURATION = 30;
const MIN_APPEAR_MS = 600;
const MAX_APPEAR_MS = 1400;
const MOLE_VISIBLE_MS = 900;
const HOLE_IDS = Array.from({ length: HOLES }, (_, i) => `hole-${i}`);

// ─── Component ────────────────────────────────────────────────────────────────

export default function WhackAMoleGame() {
  const [status, setStatus] = useState<"idle" | "running" | "over">("idle");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [activeMoles, setActiveMoles] = useState<boolean[]>(
    Array.from({ length: HOLES }, () => false)
  );
  const [whackedMoles, setWhackedMoles] = useState<boolean[]>(
    Array.from({ length: HOLES }, () => false)
  );

  const scoreRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moleTimersRef = useRef<Array<ReturnType<typeof setTimeout> | null>>(
    Array.from({ length: HOLES }, () => null)
  );

  // ─── Clear all mole timers ─────────────────────────────────────────────────

  const clearMoleTimers = useCallback(() => {
    for (let i = 0; i < moleTimersRef.current.length; i++) {
      const t = moleTimersRef.current[i];
      if (t !== null) {
        clearTimeout(t);
        moleTimersRef.current[i] = null;
      }
    }
  }, []);

  // ─── Stop game ─────────────────────────────────────────────────────────────

  const stopGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    clearMoleTimers();
    setActiveMoles(Array.from({ length: HOLES }, () => false));
    setWhackedMoles(Array.from({ length: HOLES }, () => false));
    setStatus("over");
  }, [clearMoleTimers]);

  // ─── Schedule a mole ───────────────────────────────────────────────────────

  const scheduleMole = useCallback((holeIndex: number) => {
    const delay = Math.random() * (MAX_APPEAR_MS - MIN_APPEAR_MS) + MIN_APPEAR_MS;

    const t = setTimeout(() => {
      setActiveMoles((prev) => {
        const next = [...prev];
        next[holeIndex] = true;
        return next;
      });

      // Auto-hide after visible duration
      const hideTimer = setTimeout(() => {
        setActiveMoles((prev) => {
          const next = [...prev];
          next[holeIndex] = false;
          return next;
        });
        moleTimersRef.current[holeIndex] = null;
        scheduleMole(holeIndex);
      }, MOLE_VISIBLE_MS);

      moleTimersRef.current[holeIndex] = hideTimer;
    }, delay);

    moleTimersRef.current[holeIndex] = t;
  }, []);

  // ─── Start ────────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    clearMoleTimers();

    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setActiveMoles(Array.from({ length: HOLES }, () => false));
    setWhackedMoles(Array.from({ length: HOLES }, () => false));
    setStatus("running");

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Stagger mole start
    for (let i = 0; i < HOLES; i++) {
      setTimeout(() => scheduleMole(i), i * 150);
    }
  }, [scheduleMole, stopGame, clearMoleTimers]);

  // ─── Whack ────────────────────────────────────────────────────────────────

  const whack = useCallback((index: number) => {
    setActiveMoles((prev) => {
      if (!prev[index]) return prev;

      setWhackedMoles((w) => {
        const next = [...w];
        next[index] = true;
        setTimeout(() => {
          setWhackedMoles((w2) => {
            const n2 = [...w2];
            n2[index] = false;
            return n2;
          });
        }, 300);
        return next;
      });

      scoreRef.current += 10;
      setScore(scoreRef.current);

      const next = [...prev];
      next[index] = false;
      return next;
    });
  }, []);

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      clearMoleTimers();
    };
  }, [clearMoleTimers]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Status bar */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <div className="text-center">
          <p
            className="text-[0.4rem] neon-text-green mb-1"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            SCORE
          </p>
          <p className="text-2xl neon-text-amber tabular-nums">{score}</p>
        </div>
        <div className="text-center">
          {status === "running" && (
            <>
              <p
                className="text-[0.4rem] neon-text-cyan mb-1"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                TIME
              </p>
              <p
                className={cn(
                  "text-2xl tabular-nums",
                  timeLeft <= 10 ? "neon-text-amber animate-blink" : "neon-text-cyan"
                )}
              >
                {timeLeft}s
              </p>
            </>
          )}
        </div>
        {status !== "idle" && (
          <Button
            size="sm"
            variant="outline"
            onClick={start}
            className="rounded-none border-border font-['Press_Start_2P'] text-[0.45rem] hover:border-primary hover:text-primary"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            RESET
          </Button>
        )}
      </div>

      {/* Game grid */}
      <div className="relative">
        <div className="grid grid-cols-3 gap-4">
          {HOLE_IDS.map((holeId, i) => (
            <button
              key={holeId}
              type="button"
              onClick={() => whack(i)}
              disabled={status !== "running"}
              className={cn(
                "relative w-24 h-24 rounded-none overflow-hidden",
                "transition-transform select-none",
                status === "running" ? "cursor-pointer active:scale-95" : "cursor-default"
              )}
              style={{
                background: "oklch(0.1 0.02 140)",
                border: "2px solid oklch(var(--vh-neon-green) / 0.4)",
                boxShadow: "inset 0 0 12px oklch(0 0 0 / 0.5)"
              }}
            >
              {/* Hole */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-8 rounded-full"
                style={{
                  background: "oklch(0.05 0.01 140)",
                  border: "2px solid oklch(var(--vh-neon-green) / 0.3)",
                }}
              />

              {/* Mole */}
              {activeMoles[i] && (
                <div
                  className={cn(
                    "absolute bottom-2 left-1/2 -translate-x-1/2",
                    "flex flex-col items-center",
                    whackedMoles[i] ? "opacity-0" : "animate-mole-popup"
                  )}
                  style={{ zIndex: 10 }}
                >
                  <div
                    className="text-3xl"
                    style={{
                      filter: "drop-shadow(0 0 6px oklch(var(--vh-neon-amber)))",
                    }}
                  >
                    🐹
                  </div>
                </div>
              )}

              {/* Hit flash */}
              {whackedMoles[i] && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{ zIndex: 20 }}
                >
                  <span
                    className="text-xs neon-text-amber"
                    style={{ fontFamily: "'Press Start 2P', monospace" }}
                  >
                    +10
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Overlay states */}
        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 gap-3">
            <p className="text-4xl">🔨</p>
            <p
              className="text-xs neon-text-amber text-center"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              WHACK-A-MOLE
            </p>
            <p className="text-base text-muted-foreground text-center px-4">
              Click moles as they pop up!<br />{GAME_DURATION} seconds
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
            <p className="text-3xl">⏱️</p>
            <p
              className="text-xs neon-text-amber"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              TIME'S UP!
            </p>
            <p className="text-xl neon-text-green">
              Final Score: {score}
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
    </div>
  );
}
