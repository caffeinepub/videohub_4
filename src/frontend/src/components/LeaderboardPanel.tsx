import React from "react";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetLeaderboard } from "../hooks/useQueries";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeaderboardPanelProps {
  gameId: string;
  gameName: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatScore(score: bigint): string {
  return Number(score).toLocaleString();
}

function formatDate(timestamp: bigint): string {
  // Timestamps from IC are in nanoseconds
  const ms = Number(timestamp / 1_000_000n);
  const d = new Date(ms);
  const isValid = !isNaN(d.getTime()) && d.getFullYear() > 2020;
  if (!isValid) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function truncateName(name: string, maxLen = 14): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 1) + "…";
}

const RANK_ICONS = ["🥇", "🥈", "🥉"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function LeaderboardPanel({ gameId, gameName }: LeaderboardPanelProps) {
  const { data: entries, isLoading } = useGetLeaderboard(gameId);

  return (
    <div
      className="w-full mt-4"
      style={{
        background: "oklch(0.06 0.015 140)",
        border: "2px solid oklch(var(--vh-neon-green) / 0.4)",
        boxShadow: "0 0 20px oklch(var(--vh-neon-green) / 0.08), inset 0 0 40px oklch(0 0 0 / 0.3)",
      }}
    >
      {/* Panel header */}
      <div
        className="flex items-center gap-3 px-4 py-2"
        style={{
          borderBottom: "1px solid oklch(var(--vh-neon-green) / 0.2)",
          background: "oklch(0.08 0.02 140)",
        }}
      >
        <Trophy
          className="w-3 h-3"
          style={{ color: "oklch(var(--vh-neon-amber))" }}
        />
        <h3
          className="text-[0.45rem] tracking-widest"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            color: "oklch(var(--vh-neon-amber))",
            textShadow: "0 0 8px oklch(var(--vh-neon-amber) / 0.6)",
          }}
        >
          HIGH SCORES — {gameName.toUpperCase()}
        </h3>
      </div>

      {/* Scores table */}
      <div className="p-4">
        {isLoading ? (
          // Skeleton rows
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }, (_, i) => `skeleton-${i}`).map((key) => (
              <Skeleton
                key={key}
                className="h-7 w-full"
                style={{ background: "oklch(0.1 0.015 140)" }}
              />
            ))}
          </div>
        ) : !entries || entries.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <span className="text-2xl opacity-50">👾</span>
            <p
              className="text-[0.35rem] text-center"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                color: "oklch(var(--vh-neon-green) / 0.5)",
              }}
            >
              NO SCORES YET — BE THE FIRST!
            </p>
          </div>
        ) : (
          // Score rows
          <div className="flex flex-col gap-1">
            {/* Header row */}
            <div
              className="grid items-center px-2 pb-1 mb-1"
              style={{
                gridTemplateColumns: "2rem 1fr auto auto",
                gap: "0.5rem",
                borderBottom: "1px solid oklch(var(--vh-neon-green) / 0.15)",
              }}
            >
              <span
                className="text-[0.3rem]"
                style={{ fontFamily: "'Press Start 2P', monospace", color: "oklch(var(--vh-neon-green) / 0.4)" }}
              >
                #
              </span>
              <span
                className="text-[0.3rem]"
                style={{ fontFamily: "'Press Start 2P', monospace", color: "oklch(var(--vh-neon-green) / 0.4)" }}
              >
                PLAYER
              </span>
              <span
                className="text-[0.3rem] text-right"
                style={{ fontFamily: "'Press Start 2P', monospace", color: "oklch(var(--vh-neon-green) / 0.4)" }}
              >
                SCORE
              </span>
              <span
                className="text-[0.3rem] text-right"
                style={{ fontFamily: "'Press Start 2P', monospace", color: "oklch(var(--vh-neon-green) / 0.4)" }}
              >
                DATE
              </span>
            </div>

            {entries.map((entry, idx) => {
              const isTop3 = idx < 3;
              const rankIcon = RANK_ICONS[idx];
              const rowColor = idx === 0
                ? "oklch(var(--vh-neon-amber))"
                : idx === 1
                ? "oklch(0.85 0.03 220)"
                : idx === 2
                ? "oklch(0.7 0.08 60)"
                : "oklch(var(--vh-neon-green) / 0.7)";

              return (
                <div
                  key={`${entry.player.toString()}-${idx}`}
                  className="grid items-center px-2 py-1.5 transition-all duration-150"
                  style={{
                    gridTemplateColumns: "2rem 1fr auto auto",
                    gap: "0.5rem",
                    background: isTop3
                      ? "oklch(0.09 0.02 140)"
                      : "transparent",
                    border: isTop3
                      ? `1px solid ${rowColor}26`
                      : "1px solid transparent",
                  }}
                >
                  {/* Rank */}
                  <span
                    className="text-center"
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: isTop3 ? "0.7rem" : "0.35rem",
                      color: rowColor,
                      textShadow: isTop3 ? `0 0 6px ${rowColor}` : "none",
                    }}
                  >
                    {isTop3 ? rankIcon : `${idx + 1}`}
                  </span>

                  {/* Player name */}
                  <span
                    className="truncate"
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: "0.65rem",
                      color: rowColor,
                      textShadow: isTop3 ? `0 0 4px ${rowColor}66` : "none",
                    }}
                    title={entry.displayName || entry.player.toString()}
                  >
                    {truncateName(entry.displayName || entry.player.toString().slice(0, 8) + "…")}
                  </span>

                  {/* Score */}
                  <span
                    className="tabular-nums"
                    style={{
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: "0.5rem",
                      color: rowColor,
                      textShadow: isTop3 ? `0 0 6px ${rowColor}` : "none",
                    }}
                  >
                    {formatScore(entry.score)}
                  </span>

                  {/* Date */}
                  <span
                    className="text-right"
                    style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: "0.55rem",
                      color: "oklch(var(--vh-neon-green) / 0.35)",
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
    </div>
  );
}
