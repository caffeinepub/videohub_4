# VideoHub

## Current State
- Video sharing platform with retro/arcade aesthetic (CRT scanlines, neon glow, pixel fonts)
- 10 arcade games: Snake, Memory Match, Reaction Speed, Tetris, Pong, Whack-a-Mole, Space Invaders, Breakout, Flappy Bird, 2048
- Video feed with upload (URL or file), comments, likes, profiles
- DuckDuckGo URL search bar in nav and home page
- Authorization and blob-storage components active
- No leaderboard system exists yet

## Requested Changes (Diff)

### Add
- Backend: `submitScore(game: string, score: bigint): Promise<void>` — saves a score entry (principal + score + timestamp) for a game
- Backend: `getLeaderboard(game: string, limit: bigint): Promise<Array<LeaderboardEntry>>` — returns top N scores for a game, with display name
- Backend: `LeaderboardEntry` type: `{ player: Principal, displayName: string, score: bigint, timestamp: bigint }`
- Frontend: `LeaderboardPanel` component — shows top 10 scores for a given game, with rank, name, score, and date
- Frontend: Each game component gets a `onGameOver(score: number)` callback prop; when a game ends the score is submitted (if user is authenticated)
- Frontend: A "Leaderboard" tab/button on the GamesPage that shows a global leaderboard view per game
- Frontend: Each game card on GamesPage shows "VIEW SCORES" link

### Modify
- GamesPage: Add leaderboard panel alongside/below active game, show scores button per game card
- All 10 game components: Accept optional `onGameOver` callback, call it when a natural game-over event occurs (not on quit)
- Backend main.mo: Add score storage and leaderboard query logic

### Remove
- Nothing removed

## Implementation Plan
1. Generate backend with submitScore, getLeaderboard, LeaderboardEntry
2. Build LeaderboardPanel component
3. Update each game component to accept and call onGameOver callback
4. Update GamesPage to wire onGameOver → submitScore, show leaderboard panel per game

## UX Notes
- Leaderboard appears below the active game in retro pixel style
- Only authenticated users can submit scores; guests can still view leaderboard
- Display names come from UserProfile; fall back to truncated principal if no profile
- Score submission is fire-and-forget (no blocking UX)
- Top 10 scores shown per game
