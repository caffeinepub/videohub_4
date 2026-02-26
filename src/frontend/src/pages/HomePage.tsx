import { Link } from "@tanstack/react-router";
import { useGetFeed } from "../hooks/useQueries";
import VideoCard from "../components/VideoCard";
import VideoCardSkeleton from "../components/VideoCardSkeleton";
import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { Play, Upload, TrendingUp } from "lucide-react";

export default function HomePage() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: videos, isLoading, isError } = useGetFeed(0, 24);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 vh-crimson-text" />
          <h1 className="text-xl font-bold tracking-tight">Latest Videos</h1>
        </div>

        {isAuthenticated && (
          <Button
            asChild
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Link to="/upload">
              <Upload className="w-4 h-4" />
              Upload Video
            </Link>
          </Button>
        )}
      </div>

      {/* Video Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, i) => `skel-${i}`).map((key) => (
            <VideoCardSkeleton key={key} />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <Play className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Failed to load videos</h2>
          <p className="text-muted-foreground text-sm">
            Something went wrong. Please try refreshing the page.
          </p>
        </div>
      ) : !videos || videos.length === 0 ? (
        <EmptyFeed isAuthenticated={isAuthenticated} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video, i) => (
            <div
              key={video.id}
              className={`animate-fade-in-up stagger-${(Math.min(i % 4 + 1, 4)) as 1 | 2 | 3 | 4}`}
            >
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyFeed({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center">
          <Play className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 vh-crimson-bg rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">0</span>
        </div>
      </div>
      <h2 className="text-xl font-bold mb-2">No videos yet</h2>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        {isAuthenticated
          ? "Be the first to share a video with the community."
          : "Sign in to be the first creator on VideoHub."}
      </p>
      {isAuthenticated ? (
        <Button
          asChild
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Link to="/upload">
            <Upload className="w-4 h-4" />
            Upload the First Video
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
