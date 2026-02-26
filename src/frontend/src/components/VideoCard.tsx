import { Link } from "@tanstack/react-router";
import type { Video } from "../backend.d";
import { Eye, Heart, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCount, formatRelativeTime } from "../utils/format";

interface VideoCardProps {
  video: Video;
  className?: string;
}

export default function VideoCard({ video, className }: VideoCardProps) {
  const thumbnailUrl = video.thumbnail.getDirectURL();
  const creatorShort = video.creator.toString().slice(0, 8) + "...";

  return (
    <Link
      to="/video/$id"
      params={{ id: video.id }}
      className={cn(
        "group block rounded-lg overflow-hidden bg-card border border-border card-hover",
        className
      )}
    >
      {/* Thumbnail */}
      <div className="thumbnail-overlay aspect-video w-full bg-muted overflow-hidden">
        <img
          src={thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="play-icon-reveal">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-sm leading-snug text-foreground line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
          {video.title}
        </h3>

        <p className="text-xs text-muted-foreground truncate mb-2">
          {creatorShort}
        </p>

        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono-vid">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatCount(Number(video.viewCount))}
          </span>
          <span className="flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {formatCount(Number(video.likeCount))}
          </span>
          <span className="ml-auto text-xs opacity-60">
            {formatRelativeTime(Number(video.createdAt))}
          </span>
        </div>
      </div>
    </Link>
  );
}
