import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Zap, RotateCcw } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Phase =
  | "idle"
  | "waiting"   // waiting for green
  | "ready"     // green — click now!
  | "tooEarly"  // clicked too early
  | "result";   // showing result

const WAIT_MIN = 1500;
const WAIT_MAX = 4500;
const MAX_ROUNDS = 5;

function getRating(ms: number): string {
  if (ms < 180) return "Superhuman ⚡";
  if (ms < 250) return "Excellent 🎯";
  if (ms < 330) return "Great 👍";
  if (ms < 450) return "Good 👌";
  return "Keep practicing 🔄";
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function ReactionGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [rounds, setRounds] = useState<number[]>([]);
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Cleanup ────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // ─── Start round ────────────────────────────────────────────────────────

  const startRound = useCallback(() => {
    setPhase("waiting");
    setReactionMs(null);
    const delay = WAIT_MIN + Math.random() * (WAIT_MAX - WAIT_MIN);
    timeoutRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      setPhase("ready");
    }, delay);
  }, []);

  // ─── Handle click ───────────────────────────────────────────────────────

  const handleClick = useCallback(() => {
    if (phase === "idle") {
      startRound();
      return;
    }
    if (phase === "waiting") {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setPhase("tooEarly");
      return;
    }
    if (phase === "ready") {
      const ms = Math.round(performance.now() - startTimeRef.current);
      setReactionMs(ms);
      setRounds((prev) => {
        const updated = [...prev, ms];
        return updated;
      });
      setBest((prev) => (prev === null || ms < prev ? ms : prev));
      setPhase("result");
    }
  }, [phase, startRound]);

  // ─── Reset ──────────────────────────────────────────────────────────────

  const resetAll = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setPhase("idle");
    setReactionMs(null);
    setBest(null);
    setRounds([]);
  }, []);

  const isSessionDone = rounds.length >= MAX_ROUNDS;
  const avg =
    rounds.length > 0
      ? Math.round(rounds.reduce((a, b) => a + b, 0) / rounds.length)
      : null;

  // ─── Button appearance ──────────────────────────────────────────────────

  const btnConfig: {
    bg: string;
    label: string;
    sublabel?: string;
  } = (() => {
    if (isSessionDone)
      return { bg: "bg-accent", label: "Session Complete", sublabel: "" };
    switch (phase) {
      case "idle":
        return { bg: "bg-accent hover:bg-accent/80", label: "Click to Start", sublabel: "Tap when it turns green" };
      case "waiting":
        return { bg: "bg-accent", label: "Wait…", sublabel: "Don't click yet!" };
      case "ready":
        return { bg: "bg-green-500 hover:bg-green-400", label: "CLICK NOW!", sublabel: "Go!" };
      case "tooEarly":
        return { bg: "bg-destructive hover:bg-destructive/80", label: "Too Early!", sublabel: "Click to try again" };
      case "result":
        return { bg: "bg-accent hover:bg-accent/80", label: `${reactionMs} ms`, sublabel: reactionMs ? getRating(reactionMs) : "" };
    }
  })();

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-[420px] mx-auto">
      {/* Stats row */}
      <div className="flex items-center justify-between w-full px-1">
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
            Round
          </p>
          <p className="text-xl font-bold font-mono vh-crimson-text tabular-nums">
            {rounds.length}/{MAX_ROUNDS}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
            Best
          </p>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {best !== null ? `${best}ms` : "—"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
            Avg
          </p>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {avg !== null ? `${avg}ms` : "—"}
          </p>
        </div>
        {rounds.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={resetAll}
            className="h-7 px-2 text-xs gap-1 border-border hover:border-primary hover:text-primary"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </Button>
        )}
      </div>

      {/* Main reaction area */}
      {isSessionDone ? (
        <div className="flex flex-col items-center gap-4 w-full py-8">
          <Trophy className="w-12 h-12 vh-crimson-text" />
          <p className="text-2xl font-bold font-mono text-foreground">
            Session Done!
          </p>
          <div className="flex flex-col gap-2 w-full max-w-[280px]">
            <div className="flex justify-between items-center border border-border rounded-md px-3 py-2">
              <span className="text-sm text-muted-foreground font-mono">Average</span>
              <span className="font-bold font-mono vh-crimson-text">{avg}ms</span>
            </div>
            <div className="flex justify-between items-center border border-border rounded-md px-3 py-2">
              <span className="text-sm text-muted-foreground font-mono">Best</span>
              <span className="font-bold font-mono text-foreground">{best}ms</span>
            </div>
            <div className="flex justify-between items-center border border-border rounded-md px-3 py-2">
              <span className="text-sm text-muted-foreground font-mono">Rating</span>
              <span className="font-medium text-sm">{avg ? getRating(avg) : "—"}</span>
            </div>
          </div>
          <Button
            onClick={resetAll}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 mt-2"
          >
            <RotateCcw className="w-4 h-4" /> Play Again
          </Button>
        </div>
      ) : (
        <>
          {/* Big click target */}
          <button
            type="button"
            onClick={handleClick}
            disabled={phase === "waiting" && false}
            className={`
              relative w-full h-48 rounded-xl border-2 transition-all duration-150 
              select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
              flex flex-col items-center justify-center gap-2
              ${phase === "ready"
                ? "border-green-500 bg-green-500/10 scale-[0.99]"
                : phase === "tooEarly"
                ? "border-destructive bg-destructive/10"
                : "border-border bg-card hover:bg-accent/30"
              }
            `}
          >
            {phase === "ready" && (
              <Zap className="w-8 h-8 text-green-400 animate-pulse" />
            )}
            <p className={`text-2xl font-bold font-mono ${
              phase === "ready"
                ? "text-green-400"
                : phase === "tooEarly"
                ? "text-destructive"
                : "text-foreground"
            }`}>
              {btnConfig.label}
            </p>
            {btnConfig.sublabel && (
              <p className="text-sm text-muted-foreground font-mono">
                {btnConfig.sublabel}
              </p>
            )}
          </button>

          {/* Next round button after result or tooEarly */}
          {(phase === "result" || phase === "tooEarly") && (
            <Button
              onClick={startRound}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 w-full"
            >
              <Zap className="w-4 h-4" />
              {rounds.length < MAX_ROUNDS
                ? `Next Round (${rounds.length}/${MAX_ROUNDS})`
                : "Finish"}
            </Button>
          )}
        </>
      )}

      {/* Round dots */}
      {rounds.length > 0 && !isSessionDone && (
        <div className="flex gap-2">
          {Array.from({ length: MAX_ROUNDS }, (_, i) => `dot-${i}`).map((key, i) => (
            <div
              key={key}
              className={`w-2 h-2 rounded-full transition-all ${
                i < rounds.length
                  ? "bg-primary"
                  : "bg-border"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
