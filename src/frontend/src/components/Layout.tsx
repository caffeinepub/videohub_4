import React from "react";
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
import { Play, Upload, User, LogOut, Menu, X, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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
    { to: "/" as const, label: "Home" },
    ...(isAuthenticated
      ? ([
          { to: "/upload" as const, label: "Upload" },
          { to: "/profile" as const, label: "Profile" },
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
      <header className="sticky top-0 z-50 nav-blur border-b border-border bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2.5 group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="w-8 h-8 vh-crimson-bg rounded-sm flex items-center justify-center shrink-0 transition-all group-hover:shadow-crimson">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                Video<span className="vh-crimson-text">Hub</span>
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    isActive(link.to)
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <Button
                  asChild
                  size="sm"
                  className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                >
                  <Link to="/upload">
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </Link>
                </Button>
              )}

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                    >
                      <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-border hover:ring-primary/60 transition-all">
                        <AvatarFallback className="bg-accent text-accent-foreground text-xs font-semibold">
                          {avatarInitials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {displayName && (
                      <>
                        <div className="px-2 py-1.5">
                          <p className="text-xs font-medium truncate">
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isLoggingIn ? "Signing in..." : "Sign In"}
                </Button>
              )}

              {/* Mobile menu toggle */}
              <button
                type="button"
                className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
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
            <nav className="md:hidden pb-3 border-t border-border pt-3 flex flex-col gap-1 animate-fade-in">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive(link.to)
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Play className="w-4 h-4 vh-crimson-text fill-current" />
            <span className="font-semibold tracking-tight text-foreground">
              Video<span className="vh-crimson-text">Hub</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026. Built with{" "}
            <Heart className="w-3 h-3 inline vh-crimson-text fill-current" />{" "}
            using{" "}
            <a
              href="https://caffeine.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="vh-crimson-text hover:underline"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
