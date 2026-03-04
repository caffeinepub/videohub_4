import React, { useState } from "react";
import { Trophy, RefreshCw, Gamepad2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGetLeaderboard } from "../hooks/useQueries";
import type { LeaderboardEntry } from "../backend.d";

// ─── Game registry (mirrors GamesPage) ───────────────────────────────────────

const GAMES = [
  { id: "snake",        emoji: "🐍", title: "Snake" },
  { id: "memory",       emoji: "🃏", title: "Memory Match" },
  { id: "reaction",     emoji: "⚡", title: "Reaction Speed" },
  { id: "tetris",       emoji: "🎮", title: "Tetris" },
  { id: "pong",         emoji: "🏓", title: "Pong" },
  { id: "whackamole",   emoji: "🔨", title: "Whack-a-Mole" },
  { id: "spaceinvaders",emoji: "👾", title: "Space Invaders" },
  { id: "breakout",     emoji: "🧱", title: "Breakout" },
  { id: "flappy",       emoji: "🐦", title: "Flappy Bird" },
  { id: "2048",         emoji: "🔢", title: "2048" },
] as const;

type GameId = typeof GAMES[number]["id"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatScore(score: bigint): string {
  return Number(score).toLocaleString();
}

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp / 1_000_000n);
  const d = new Date(ms);
  if (isNaN(d.getTime()) || d.getFullYear() < 2020) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function truncateName(name: string, maxLen = 16): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + "…";
}

const RANK_ICONS = ["🥇", "🥈", "🥉"];
const RANK_COLORS = [
  "oklch(0.82 0.18 80)",  // gold  (amber)
  "oklch(0.85 0.03 220)", // silver
  "oklch(0.70 0.08 60)",  // bronze
];

// ─── Single-game leaderboard table ───────────────────────────────────────────

interface GameLeaderboardProps {
  gameId: GameId;
}

function GameLeaderboard({ gameId }: GameLeaderboardProps) {
  const { data: entries, isLoading, refetch, isFetching } = useGetLeaderboard(gameId);

  return (
    <div className="w-full">
      {/* Refresh row */}
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-2 py-1 text-[0.35rem] transition-colors"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: `oklch(var(--vh-neon-green) / ${isFetching ? "0.3" : "0.5"})`,
          }}
        >
          <RefreshCw
            className={cn("w-2.5 h-2.5", isFetching && "animate-spin")}
          />
          REFRESH
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => `sk-${i}`).map((key) => (
            <Skeleton
              key={key}
              className="h-8 w-full rounded-none"
              style={{ background: "oklch(0.10 0.015 140)" }}
            />
          ))}
        </div>
      ) : !entries || entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <span className="text-3xl opacity-40">👾</span>
          <p
            className="text-[0.32rem] text-center"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              color: "oklch(var(--vh-neon-green) / 0.4)",
            }}
          >
            NO SCORES YET
          </p>
          <p
            className="text-[0.32rem] text-center"
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              color: "oklch(var(--vh-neon-green) / 0.3)",
            }}
          >
            BE THE FIRST TO PLAY!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {/* Column headers */}
          <div
            className="grid px-3 py-1.5 mb-1"
            style={{
              gridTemplateColumns: "2.2rem 1fr 1fr auto",
              gap: "0.5rem",
              borderBottom: "1px solid oklch(var(--vh-neon-green) / 0.15)",
            }}
          >
            {["#", "PLAYER", "SCORE", "DATE"].map((label) => (
              <span
                key={label}
                className={label === "SCORE" || label === "DATE" ? "text-right" : ""}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "0.28rem",
                  color: "oklch(var(--vh-neon-green) / 0.35)",
                  letterSpacing: "0.05em",
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {entries.map((entry, idx) => {
            const isTop3 = idx < 3;
            const color = isTop3 ? RANK_COLORS[idx] : "oklch(var(--vh-neon-green) / 0.65)";
            return (
              <div
                key={`${entry.player.toString()}-${idx}`}
                className="grid px-3 py-2 transition-all duration-100"
                style={{
                  gridTemplateColumns: "2.2rem 1fr 1fr auto",
                  gap: "0.5rem",
                  background: isTop3 ? "oklch(0.09 0.018 140)" : "transparent",
                  borderLeft: isTop3 ? `3px solid ${color}` : "3px solid transparent",
                }}
              >
                {/* Rank */}
                <span
                  className="font-bold text-center"
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: isTop3 ? "0.65rem" : "0.32rem",
                    color,
                    textShadow: isTop3 ? `0 0 8px ${color}` : "none",
                    lineHeight: "1.5",
                  }}
                >
                  {isTop3 ? RANK_ICONS[idx] : `${idx + 1}`}
                </span>

                {/* Name */}
                <span
                  className="truncate self-center"
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: "0.7rem",
                    color,
                    textShadow: isTop3 ? `0 0 4px ${color}60` : "none",
                  }}
                  title={entry.displayName || entry.player.toString()}
                >
                  {truncateName(
                    entry.displayName ||
                      entry.player.toString().slice(0, 10) + "…"
                  )}
                </span>

                {/* Score */}
                <span
                  className="tabular-nums text-right self-center"
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: "0.45rem",
                    color,
                    textShadow: isTop3 ? `0 0 6px ${color}` : "none",
                  }}
                >
                  {formatScore(entry.score)}
                </span>

                {/* Date */}
                <span
                  className="text-right self-center"
                  style={{
                    fontFamily: "'Share Tech Mono', monospace",
                    fontSize: "0.55rem",
                    color: "oklch(var(--vh-neon-green) / 0.3)",
                  }}
                >
                  {formatDate(entry.timestamp)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Champions summary row (top player per game) ──────────────────────────────

interface ChampionBadgeProps {
  entry: LeaderboardEntry | undefined;
  game: typeof GAMES[number];
}

function ChampionBadge({ entry, game }: ChampionBadgeProps) {
  return (
    <div
      className="flex flex-col gap-2 p-3 transition-all duration-150"
      style={{
        background: "oklch(0.09 0.016 140)",
        border: "1px solid oklch(var(--vh-neon-green) / 0.2)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="text-base leading-none">{game.emoji}</span>
        <span
          className="text-[0.3rem] neon-text-amber leading-none"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          {game.title.toUpperCase()}
        </span>
      </div>
      {entry ? (
        <>
          <div className="flex items-center gap-1">
            <span className="text-sm leading-none">🥇</span>
            <span
              className="truncate text-[0.6rem]"
              style={{
                fontFamily: "'Share Tech Mono', monospace",
                color: "oklch(0.82 0.18 80)",
              }}
            >
              {truncateName(entry.displayName || entry.player.toString().slice(0, 10) + "…", 14)}
            </span>
          </div>
          <span
            className="tabular-nums"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "0.45rem",
              color: "oklch(0.82 0.18 80)",
              textShadow: "0 0 6px oklch(0.82 0.18 80)",
            }}
          >
            {formatScore(entry.score)}
          </span>
        </>
      ) : (
        <span
          className="text-[0.3rem]"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: "oklch(var(--vh-neon-green) / 0.3)",
          }}
        >
          NO SCORES
        </span>
      )}
    </div>
  );
}

// ─── Per-game champion loader — one component per game so hooks are top-level ─

function ChampionLoader({ game }: { game: typeof GAMES[number] }) {
  const { data } = useGetLeaderboard(game.id);
  return <ChampionBadge game={game} entry={data?.[0]} />;
}

function AllChampions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
      {GAMES.map((game) => (
        <ChampionLoader key={game.id} game={game} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [activeGameId, setActiveGameId] = useState<GameId>("snake");
  const activeGame = GAMES.find((g) => g.id === activeGameId)!;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
        <Trophy className="w-4 h-4 neon-text-amber" />
        <h1
          className="text-xs neon-text-amber"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          HALL OF FAME
        </h1>
        <span className="text-base text-muted-foreground ml-1">
          top scores across all 10 games
        </span>
      </div>

      {/* Champions grid */}
      <div className="mb-2">
        <p
          className="text-[0.35rem] neon-text-green mb-3"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          ▸ CURRENT CHAMPIONS
        </p>
        <AllChampions />
      </div>

      {/* Divider */}
      <div
        className="mb-8"
        style={{
          borderTop: "1px solid oklch(var(--vh-neon-green) / 0.2)",
        }}
      />

      {/* Per-game tab switcher */}
      <div className="mb-6">
        <p
          className="text-[0.35rem] neon-text-green mb-4"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          ▸ TOP 10 SCORES BY GAME
        </p>

        {/* Game picker tabs — horizontal scroll */}
        <div
          className="flex gap-2 overflow-x-auto pb-2 mb-6"
          style={{ scrollbarWidth: "none" }}
        >
          {GAMES.map((game) => {
            const isActive = game.id === activeGameId;
            return (
              <button
                key={game.id}
                type="button"
                onClick={() => setActiveGameId(game.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 shrink-0 transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                )}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "0.35rem",
                  letterSpacing: "0.05em",
                  background: isActive
                    ? "oklch(0.10 0.02 140)"
                    : "transparent",
                  border: isActive
                    ? "2px solid oklch(var(--vh-neon-amber))"
                    : "2px solid oklch(var(--vh-neon-green) / 0.25)",
                  color: isActive
                    ? "oklch(var(--vh-neon-amber))"
                    : "oklch(var(--vh-neon-green) / 0.55)",
                  boxShadow: isActive
                    ? "0 0 8px oklch(var(--vh-neon-amber) / 0.4)"
                    : "none",
                }}
              >
                <span className="text-sm leading-none">{game.emoji}</span>
                {game.title.toUpperCase()}
              </button>
            );
          })}
        </div>

        {/* Active game leaderboard */}
        <div
          key={activeGameId}
          className="animate-fade-in-up"
          style={{
            background: "oklch(0.06 0.015 140)",
            border: "2px solid oklch(var(--vh-neon-green) / 0.35)",
            boxShadow: "0 0 24px oklch(var(--vh-neon-green) / 0.06)",
          }}
        >
          {/* Panel heading */}
          <div
            className="flex items-center gap-3 px-5 py-3"
            style={{
              borderBottom: "1px solid oklch(var(--vh-neon-green) / 0.2)",
              background: "oklch(0.08 0.018 140)",
            }}
          >
            <span className="text-lg leading-none">{activeGame.emoji}</span>
            <h2
              className="text-[0.45rem] neon-text-amber tracking-widest"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              {activeGame.title.toUpperCase()} — TOP 10
            </h2>
          </div>

          <div className="p-5">
            <GameLeaderboard gameId={activeGameId} />
          </div>
        </div>
      </div>

      {/* Sign-in nudge */}
      <div
        className="mt-8 flex items-center justify-center gap-3 py-4 px-6"
        style={{
          border: "1px dashed oklch(var(--vh-neon-green) / 0.2)",
        }}
      >
        <Gamepad2 className="w-4 h-4 neon-text-green opacity-50 shrink-0" />
        <p
          className="text-[0.32rem] text-center"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: "oklch(var(--vh-neon-green) / 0.4)",
            lineHeight: 1.8,
          }}
        >
          SIGN IN AND PLAY A GAME TO APPEAR ON THE LEADERBOARD
        </p>
      </div>
    </div>
  );
}
