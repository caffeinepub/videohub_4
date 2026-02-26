import React, { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface UrlSearchBarProps {
  variant?: "compact" | "prominent";
  className?: string;
}

function resolveSearch(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return "";

  // Check if it looks like a URL
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("ftp://")
  ) {
    return trimmed;
  }

  // Check if it looks like a domain (has a dot, no spaces)
  if (!trimmed.includes(" ") && trimmed.includes(".") && trimmed.length > 3) {
    return "https://" + trimmed;
  }

  // Otherwise, do a DuckDuckGo search
  return `https://duckduckgo.com/?q=${encodeURIComponent(trimmed)}`;
}

export default function UrlSearchBar({
  variant = "compact",
  className,
}: UrlSearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = resolveSearch(query);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      setQuery("");
    }
  };

  if (variant === "prominent") {
    return (
      <div className={cn("w-full max-w-2xl mx-auto", className)}>
        <div className="mb-3 text-center">
          <h2 className="text-xs neon-text-amber" style={{ fontFamily: "'Press Start 2P', monospace" }}>
            SEARCH THE WEB
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-0">
          <div className="flex-1 pixel-border bg-background/50">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="search or enter URL..."
              className={cn(
                "w-full h-11 px-4 bg-transparent outline-none",
                "text-foreground placeholder:text-muted-foreground",
                "font-['Share_Tech_Mono'] text-base"
              )}
            />
          </div>
          <button
            type="submit"
            className={cn(
              "h-11 px-5 pixel-border-amber bg-background/50 ml-[-2px]",
              "neon-text-amber font-['Press_Start_2P'] text-[0.5rem]",
              "hover:bg-primary/15 transition-colors",
              "flex items-center gap-2"
            )}
          >
            <Search className="w-4 h-4" />
            <span>GO</span>
          </button>
        </form>
        <p className="text-center text-xs text-muted-foreground mt-2 font-['Share_Tech_Mono']">
          Enter a URL to visit or keywords to search DuckDuckGo
        </p>
      </div>
    );
  }

  // Compact variant (for nav bar)
  return (
    <form
      onSubmit={handleSubmit}
      className={cn("hidden lg:flex items-center gap-0", className)}
    >
      <div className="pixel-border bg-background/50">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search or enter URL..."
          className={cn(
            "h-8 w-48 xl:w-64 px-3 bg-transparent outline-none",
            "text-foreground placeholder:text-muted-foreground/60",
            "font-['Share_Tech_Mono'] text-sm"
          )}
        />
      </div>
      <button
        type="submit"
        className={cn(
          "h-8 px-3 pixel-border-amber bg-background/50 ml-[-2px]",
          "neon-text-amber font-['Press_Start_2P'] text-[0.45rem]",
          "hover:bg-primary/15 transition-colors",
          "flex items-center gap-1.5"
        )}
      >
        <Search className="w-3 h-3" />
        GO
      </button>
    </form>
  );
}
