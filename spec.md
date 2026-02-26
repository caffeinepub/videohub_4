# VideoHub

## Current State
- Dark industrial/graphite theme with crimson accents (Space Grotesk + JetBrains Mono fonts)
- Pages: Home (video feed), Video, Upload (file or URL), Profile, Games
- Games: Snake, Memory Match, Reaction Speed
- Nav: Home, Games, Upload (auth), Profile (auth)
- No search functionality

## Requested Changes (Diff)

### Add
- **Retro theme**: Replace the current industrial dark theme with a retro/arcade aesthetic. Use a pixel/CRT-inspired look: neon green/amber/cyan accents on dark background, scanline effects, pixelated fonts (Press Start 2P or similar retro font from Google Fonts), glowing borders, retro button styles
- **URL Search bar**: Add a search bar in the nav (desktop) and on the home page that lets users search the web via a URL (opens a URL or performs a web search in a new tab). Include a button labeled "Search" or with a search icon. On submit, open the URL or Google search in a new tab.
- **More games**: Add at least 3 more games to GamesPage:
  - Tetris (classic block-stacking game)
  - Pong (paddle vs ball)
  - Whack-a-Mole (click the mole)

### Modify
- `index.css`: Replace OKLCH color tokens and fonts with retro palette. Keep OKLCH system but use retro colors: dark background (near black), neon green primary, amber secondary, cyan accent. Replace body font with a retro font (VT323 or Press Start 2P for headings, share tech mono for body). Add CRT scanline overlay effect, pixel border utilities, glow effects.
- `Layout.tsx`: Add URL search bar in the nav bar (desktop). Style the nav with retro pixel borders and glow.
- `HomePage.tsx`: Add a prominent URL search bar at the top of the page.
- `GamesPage.tsx`: Register the 3 new games in the GAMES array.

### Remove
- Nothing removed

## Implementation Plan
1. Update `index.css` with retro theme tokens, retro fonts, scanline/CRT CSS effects, pixel border utility classes, and neon glow effects
2. Update `tailwind.config.js` if needed for custom font family
3. Update `Layout.tsx` to add URL search bar in nav and apply retro nav styling
4. Update `HomePage.tsx` to add URL search bar section at top
5. Create `src/frontend/src/components/games/TetrisGame.tsx`
6. Create `src/frontend/src/components/games/PongGame.tsx`
7. Create `src/frontend/src/components/games/WhackAMoleGame.tsx`
8. Update `GamesPage.tsx` to include the 3 new games

## UX Notes
- Retro theme: Think arcade cabinet, CRT monitor aesthetic. Neon glow on active elements. Pixel font for titles/headings, monospace for body text.
- URL search: User types a URL or query. If it looks like a URL (starts with http/https or has a dot), open it directly. Otherwise, open a Google search in a new tab.
- Games grid should expand to show all 6 games in a 2-col or 3-col grid.
