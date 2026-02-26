import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useQueryClient } from "@tanstack/react-query";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Upload, User, LogOut, Menu, X, Heart, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import UrlSearchBar from "./UrlSearchBar";

// ─── Mobile search inline component ─────────────────────────────────────────

function MobileSearchBar() {
  const [query, setQuery] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    let url: string;
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      url = trimmed;
    } else if (!trimmed.includes(" ") && trimmed.includes(".") && trimmed.length > 3) {
      url = "https://" + trimmed;
    } else {
      url = `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    setQuery("");
  };
  return (
    <form onSubmit={handleSubmit} className="flex gap-0 px-3 pt-2">
      <div className="flex-1 pixel-border bg-background/50">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search or enter URL..."
          className="w-full h-9 px-3 bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60 font-['Share_Tech_Mono'] text-sm"
        />
      </div>
      <button
        type="submit"
        className="h-9 px-3 pixel-border-amber bg-background/50 ml-[-2px] neon-text-amber hover:bg-primary/15 transition-colors flex items-center gap-1.5"
      >
        <Search className="w-4 h-4" />
      </button>
    </form>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = !!identity;
  const isLoggingIn = loginStatus === "logging-in";

  const { data: userProfile } = useGetCallerUserProfile();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
      navigate({ to: "/" });
    } else {
      try {
        await login();
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          error.message === "User is already authenticated"
        ) {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const displayName =
    userProfile?.displayName ||
    (identity
      ? identity.getPrincipal().toString().slice(0, 8) + "..."
      : null);

  const avatarInitials = displayName
    ? displayName.slice(0, 2).toUpperCase()
    : "?";

  const navLinks = [
    { to: "/" as const, label: "HOME" },
    { to: "/games" as const, label: "GAMES" },
    ...(isAuthenticated
      ? ([
          { to: "/upload" as const, label: "UPLOAD" },
          { to: "/profile" as const, label: "PROFILE" },
        ] as const)
      : []),
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Sticky Nav */}
      <header
        className="sticky top-0 z-50 nav-blur bg-background/90 border-b"
        style={{ borderColor: "oklch(var(--vh-neon-green) / 0.3)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group shrink-0"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="w-8 h-8 pixel-border-amber bg-background flex items-center justify-center shrink-0 transition-all">
                <Play className="w-4 h-4 neon-text-amber fill-current" />
              </div>
              <span
                className="text-sm font-bold neon-text-green hidden sm:block"
                style={{ fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}
              >
                Video<span className="neon-text-amber">Hub</span>
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1 shrink-0">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "px-3 py-1.5 text-xs transition-all",
                    "font-['Press_Start_2P']",
                    isActive(link.to)
                      ? "neon-text-amber border-b-2"
                      : "text-muted-foreground hover:neon-text-green"
                  )}
                  style={
                    isActive(link.to)
                      ? { borderColor: "oklch(var(--vh-neon-amber))" }
                      : {}
                  }
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* URL Search Bar */}
            <UrlSearchBar variant="compact" className="flex-1 max-w-sm" />

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              {isAuthenticated && (
                <Button
                  asChild
                  size="sm"
                  className="hidden md:flex bg-primary hover:bg-primary/80 text-primary-foreground gap-1.5 font-['Press_Start_2P'] text-[0.5rem]"
                >
                  <Link to="/upload">
                    <Upload className="w-3.5 h-3.5" />
                    UPLOAD
                  </Link>
                </Button>
              )}

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-none"
                    >
                      <Avatar className="w-8 h-8 cursor-pointer pixel-border transition-all rounded-none">
                        <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold font-['Press_Start_2P'] rounded-none">
                          {avatarInitials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 pixel-border bg-card rounded-none">
                    {displayName && (
                      <>
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-medium truncate neon-text-amber">
                            {displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Signed in
                          </p>
                        </div>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/upload" className="cursor-pointer">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Video
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleAuth}
                      className="text-destructive focus:text-destructive cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={handleAuth}
                  disabled={isLoggingIn}
                  size="sm"
                  className="bg-primary hover:bg-primary/80 text-primary-foreground font-['Press_Start_2P'] text-[0.5rem] rounded-none"
                >
                  {isLoggingIn ? "..." : "SIGN IN"}
                </Button>
              )}

              {/* Mobile menu toggle */}
              <button
                type="button"
                className="md:hidden text-muted-foreground hover:neon-text-green transition-colors p-1"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav
              className="md:hidden pb-3 border-t pt-3 flex flex-col gap-1 animate-fade-in"
              style={{ borderColor: "oklch(var(--vh-neon-green) / 0.3)" }}
            >
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-3 py-2 text-xs font-['Press_Start_2P'] transition-all",
                    isActive(link.to)
                      ? "neon-text-amber"
                      : "text-muted-foreground hover:neon-text-green"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              {/* Mobile search */}
              <MobileSearchBar />
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer
        className="border-t py-6 mt-12"
        style={{ borderColor: "oklch(var(--vh-neon-green) / 0.3)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Play className="w-4 h-4 neon-text-amber fill-current" />
            <span
              className="text-xs neon-text-green"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Video<span className="neon-text-amber">Hub</span>
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026. Built with{" "}
            <Heart className="w-3 h-3 inline neon-text-amber fill-current" />{" "}
            using{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="neon-text-amber hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
