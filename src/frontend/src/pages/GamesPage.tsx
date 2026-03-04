import React, { useState, useCallback } from "react";
import { Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SnakeGame from "../components/games/SnakeGame";
import MemoryGame from "../components/games/MemoryGame";
import ReactionGame from "../components/games/ReactionGame";
import TetrisGame from "../components/games/TetrisGame";
import PongGame from "../components/games/PongGame";
import WhackAMoleGame from "../components/games/WhackAMoleGame";
import SpaceInvadersGame from "../components/games/SpaceInvadersGame";
import BreakoutGame from "../components/games/BreakoutGame";
import FlappyBirdGame from "../components/games/FlappyBirdGame";
import Game2048 from "../components/games/Game2048";
import LeaderboardPanel from "../components/LeaderboardPanel";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useSubmitScore } from "../hooks/useQueries";

// ─── Game registry ────────────────────────────────────────────────────────────

interface GameEntry {
  id: string;
  emoji: string;
  title: string;
  description: string;
  component: React.ComponentType<{ onGameOver?: (score: number) => void }>;
}

const GAMES: GameEntry[] = [
  {
    id: "snake",
    emoji: "🐍",
    title: "Snake",
    description: "Classic arcade — eat food and grow without hitting the walls.",
    component: SnakeGame,
  },
  {
    id: "memory",
    emoji: "🃏",
    title: "Memory Match",
    description: "Flip cards and find all 8 matching emoji pairs.",
    component: MemoryGame,
  },
  {
    id: "reaction",
    emoji: "⚡",
    title: "Reaction Speed",
    description: "Click the moment it turns green — test your reflexes.",
    component: ReactionGame,
  },
  {
    id: "tetris",
    emoji: "🎮",
    title: "Tetris",
    description: "Stack falling blocks and clear lines.",
    component: TetrisGame,
  },
  {
    id: "pong",
    emoji: "🏓",
    title: "Pong",
    description: "Classic paddle vs ball — play against AI.",
    component: PongGame,
  },
  {
    id: "whackamole",
    emoji: "🔨",
    title: "Whack-a-Mole",
    description: "Whack moles as they pop up — 30 seconds!",
    component: WhackAMoleGame,
  },
  {
    id: "spaceinvaders",
    emoji: "👾",
    title: "Space Invaders",
    description: "Shoot alien invaders before they reach Earth!",
    component: SpaceInvadersGame,
  },
  {
    id: "breakout",
    emoji: "🧱",
    title: "Breakout",
    description: "Break all the bricks with your paddle and ball.",
    component: BreakoutGame,
  },
  {
    id: "flappy",
    emoji: "🐦",
    title: "Flappy Bird",
    description: "Tap to flap through the pipes without crashing.",
    component: FlappyBirdGame,
  },
  {
    id: "2048",
    emoji: "🔢",
    title: "2048",
    description: "Slide tiles and reach 2048 to win!",
    component: Game2048,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GamesPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { identity } = useInternetIdentity();
  const submitScore = useSubmitScore();

  const activeGame = GAMES.find((g) => g.id === activeId);
  const ActiveComponent = activeGame?.component ?? null;

  const handleGameOver = useCallback(
    (score: number) => {
      if (!activeId) return;
      if (identity) {
        submitScore.mutate(
          { game: activeId, score: BigInt(Math.round(score)) },
          {
            onSuccess: () => {
              toast.success("Score saved!", {
                description: `${score.toLocaleString()} pts recorded on the leaderboard`,
                duration: 3000,
              });
            },
          }
        );
      }
    },
    [activeId, identity, submitScore]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
        <Gamepad2 className="w-4 h-4 neon-text-amber" />
        <h1
          className="text-xs neon-text-amber"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          ARCADE
        </h1>
        <span className="text-base text-muted-foreground ml-1">
          insert coin to play
        </span>
      </div>

      {/* Game Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {GAMES.map((game, i) => {
          const isActive = game.id === activeId;
          const staggerClass = `stagger-${(Math.min(i + 1, 4)) as 1 | 2 | 3 | 4}`;
          return (
            <button
              key={game.id}
              type="button"
              onClick={() => setActiveId(isActive ? null : game.id)}
              className={cn(
                `animate-fade-in-up ${staggerClass}`,
                "group relative text-left bg-card p-5 cursor-pointer transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "pixel-border-amber shadow-neon-amber"
                  : "pixel-border hover:shadow-neon-green"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <span
                  className="absolute top-3 right-3 w-2 h-2 neon-text-amber animate-pulse"
                  style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.5rem" }}
                >
                  ▶
                </span>
              )}

              {/* Trophy indicator for all games */}
              {!isActive && (
                <span
                  className="absolute top-3 right-3 text-xs opacity-30 group-hover:opacity-60 transition-opacity"
                  title="Leaderboard available"
                >
                  🏆
                </span>
              )}

              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-12 h-12 flex items-center justify-center text-2xl shrink-0 transition-all",
                    isActive
                      ? "pixel-border-amber"
                      : "pixel-border group-hover:shadow-neon-green"
                  )}
                >
                  {game.emoji}
                </div>
                <div className="min-w-0">
                  <h2
                    className={cn(
                      "text-[0.55rem] mb-2",
                      isActive ? "neon-text-amber" : "neon-text-green"
                    )}
                    style={{ fontFamily: "'Press Start 2P', monospace" }}
                  >
                    {game.title.toUpperCase()}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {game.description}
                  </p>
                </div>
              </div>

              <div
                className={cn(
                  "mt-3 text-xs",
                  isActive ? "neon-text-amber" : "text-muted-foreground/50"
                )}
                style={{ fontFamily: "'Share Tech Mono', monospace" }}
              >
                {isActive ? "▼ PLAYING" : "▶ PLAY"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Game Panel */}
      {activeGame && ActiveComponent && (
        <div
          key={activeGame.id}
          className="animate-fade-in-up pixel-border bg-card overflow-hidden"
        >
          {/* Panel header */}
          <div
            className="flex items-center gap-3 px-5 py-3 border-b"
            style={{ borderColor: "oklch(var(--vh-neon-green) / 0.3)" }}
          >
            <span className="text-lg">{activeGame.emoji}</span>
            <h2
              className="text-[0.55rem] neon-text-amber"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              {activeGame.title.toUpperCase()}
            </h2>
            <span className="text-sm text-muted-foreground ml-auto">
              {activeGame.description}
            </span>
          </div>

          {/* Game content */}
          <div className="p-6 flex justify-center overflow-x-auto">
            <ActiveComponent onGameOver={handleGameOver} />
          </div>

          {/* Leaderboard */}
          <div className="px-6 pb-6">
            {!identity && (
              <p
                className="text-[0.35rem] text-center mb-2"
                style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  color: "oklch(var(--vh-neon-green) / 0.4)",
                }}
              >
                Sign in to save your scores to the leaderboard
              </p>
            )}
            <LeaderboardPanel gameId={activeGame.id} gameName={activeGame.title} />
          </div>
        </div>
      )}

      {!activeGame && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground pixel-border">
          <Gamepad2 className="w-10 h-10 mb-3 neon-text-green opacity-30" />
          <p
            className="text-[0.45rem] neon-text-green"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            SELECT A GAME ABOVE
          </p>
        </div>
      )}
    </div>
  );
}
