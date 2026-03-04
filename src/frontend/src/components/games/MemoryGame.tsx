import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trophy } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface Card {
  id: number;
  emoji: string;
  pairId: number;
  isFlipped: boolean;
  isMatched: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const EMOJIS = ["🦊", "🐸", "🦁", "🐙", "🦋", "🐳", "🦄", "🌵"];

function buildDeck(): Card[] {
  const pairs = [...EMOJIS, ...EMOJIS];
  // Fisher-Yates shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((emoji, idx) => ({
    id: idx,
    emoji,
    pairId: EMOJIS.indexOf(emoji),
    isFlipped: false,
    isMatched: false,
  }));
}

// ─── Component ─────────────────────────────────────────────────────────────

interface MemoryGameProps {
  onGameOver?: (score: number) => void;
}

export default function MemoryGame({ onGameOver }: MemoryGameProps) {
  const [cards, setCards] = useState<Card[]>(() => buildDeck());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [won, setWon] = useState(false);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onGameOverCalledRef = useRef(false);

  // ─── Timer ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (started && !won) {
      timerRef.current = setInterval(() => {
        setElapsed((e) => e + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, won]);

  // ─── Win check ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (started && cards.every((c) => c.isMatched)) {
      setWon(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (!onGameOverCalledRef.current) {
        onGameOverCalledRef.current = true;
        // Score: higher is better — penalize moves, reward speed
        const perfScore = Math.max(0, 1000 - moves * 10);
        onGameOver?.(perfScore);
      }
    }
  }, [cards, started, moves, onGameOver]);

  // ─── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCards(buildDeck());
    setFlipped([]);
    setMoves(0);
    setElapsed(0);
    setStarted(false);
    setWon(false);
    setLocked(false);
    onGameOverCalledRef.current = false;
  }, []);

  // ─── Click handler ────────────────────────────────────────────────────────

  const handleCardClick = useCallback(
    (cardId: number) => {
      if (locked) return;
      const card = cards.find((c) => c.id === cardId);
      if (!card || card.isFlipped || card.isMatched) return;

      if (!started) setStarted(true);

      const newFlipped = [...flipped, cardId];
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
      );
      setFlipped(newFlipped);

      if (newFlipped.length === 2) {
        setMoves((m) => m + 1);
        setLocked(true);
        const [firstId, secondId] = newFlipped;
        const first = cards.find((c) => c.id === firstId)!;
        const second = cards.find((c) => c.id === secondId)!;
        const isMatch = first.pairId === second.pairId;

        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => {
              if (c.id === firstId || c.id === secondId) {
                return isMatch
                  ? { ...c, isMatched: true, isFlipped: true }
                  : { ...c, isFlipped: false };
              }
              return c;
            })
          );
          setFlipped([]);
          setLocked(false);
        }, 900);
      }
    },
    [cards, flipped, locked, started]
  );

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const formatTime = (s: number) => {
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  const matchedCount = cards.filter((c) => c.isMatched).length / 2;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-[420px] mx-auto">
      {/* Stats bar */}
      <div className="flex items-center justify-between w-full px-1">
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
            Moves
          </p>
          <p className="text-xl font-bold font-mono vh-crimson-text tabular-nums">
            {String(moves).padStart(3, "0")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
            Pairs
          </p>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {matchedCount}/{EMOJIS.length}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
            Time
          </p>
          <p className="text-xl font-bold font-mono text-foreground tabular-nums">
            {formatTime(elapsed)}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={reset}
          className="h-7 px-2 text-xs gap-1 border-border hover:border-primary hover:text-primary"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </Button>
      </div>

      {/* Card Grid */}
      <div className="relative w-full">
        <div className="grid grid-cols-4 gap-2 w-full">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(card.id)}
              disabled={card.isFlipped || card.isMatched || locked}
              className="group relative aspect-square rounded-md border border-border overflow-hidden cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={card.isFlipped || card.isMatched ? card.emoji : "Card"}
            >
              {/* Back face */}
              <div
                className={`absolute inset-0 flex items-center justify-center bg-accent transition-all duration-300 ${
                  card.isFlipped || card.isMatched
                    ? "opacity-0 scale-90"
                    : "opacity-100 scale-100 group-hover:bg-accent/70"
                }`}
              >
                <span className="text-lg text-muted-foreground/40 font-mono font-bold select-none">
                  ?
                </span>
              </div>
              {/* Front face */}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                  card.isFlipped || card.isMatched
                    ? "opacity-100 scale-100"
                    : "opacity-0 scale-90"
                } ${
                  card.isMatched
                    ? "bg-primary/10 border-primary"
                    : "bg-card"
                }`}
              >
                <span className="text-2xl select-none leading-none">
                  {card.emoji}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Win overlay */}
        {won && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 rounded-md gap-3">
            <Trophy className="w-10 h-10 vh-crimson-text" />
            <p className="text-2xl font-bold font-mono text-foreground">
              YOU WIN!
            </p>
            <p className="text-muted-foreground font-mono text-sm text-center">
              {moves} moves · {formatTime(elapsed)}
            </p>
            <Button
              onClick={reset}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 mt-1"
            >
              <RotateCcw className="w-4 h-4" /> Play Again
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground font-mono text-center">
        Click cards to flip — match all {EMOJIS.length} pairs to win
      </p>
    </div>
  );
}
