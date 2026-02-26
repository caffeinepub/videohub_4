import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  useGetVideo,
  useIncrementViewCount,
  useHasUserLikedVideo,
  useToggleLike,
  useGetCommentsForVideo,
  useAddComment,
  useGetUserProfile,
} from "../hooks/useQueries";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Heart,
  Eye,
  MessageCircle,
  ArrowLeft,
  User,
  Clock,
} from "lucide-react";
import { formatCount, formatRelativeTime } from "../utils/format";
import type { Comment } from "../backend.d";
import type { Principal } from "@icp-sdk/core/principal";

function CommentItem({ comment }: { comment: Comment }) {
  const authorShort = comment.author.toString().slice(0, 8) + "...";
  const { data: profile } = useGetUserProfile(comment.author as Principal);

  return (
    <div className="flex gap-3 animate-fade-in">
      <Avatar className="w-8 h-8 shrink-0 mt-0.5">
        <AvatarFallback className="bg-accent text-accent-foreground text-xs">
          {(profile?.displayName || authorShort).slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-semibold truncate">
            {profile?.displayName || authorShort}
          </span>
          <span className="text-xs text-muted-foreground font-mono-vid shrink-0">
            <Clock className="w-3 h-3 inline mr-0.5" />
            {formatRelativeTime(Number(comment.timestamp))}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed break-words">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

export default function VideoPage() {
  const { id } = useParams({ from: "/video/$id" });
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [commentText, setCommentText] = useState("");
  const viewCountIncrementedRef = useRef(false);

  const { data: video, isLoading: videoLoading } = useGetVideo(id ?? "");
  const { data: hasLiked } = useHasUserLikedVideo(id ?? "");
  const { data: comments, isLoading: commentsLoading } =
    useGetCommentsForVideo(id ?? "");
  const { data: creatorProfile } = useGetUserProfile(
    video?.creator as Principal | null
  );

  const { mutateAsync: incrementView } = useIncrementViewCount();
  const { mutate: toggleLike, isPending: likePending } = useToggleLike();
  const { mutateAsync: addComment, isPending: commentPending } =
    useAddComment();

  // Increment view count once on load
  useEffect(() => {
    if (id && !viewCountIncrementedRef.current) {
      viewCountIncrementedRef.current = true;
      incrementView(id).catch(() => {
        // non-fatal
      });
    }
  }, [id, incrementView]);

  const handleLike = () => {
    if (!isAuthenticated) {
      toast.error("Sign in to like videos");
      return;
    }
    if (!id) return;
    toggleLike(id, {
      onError: () => toast.error("Failed to update like"),
    });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Sign in to comment");
      return;
    }
    if (!id || !commentText.trim()) return;
    try {
      await addComment({ videoId: id, content: commentText.trim() });
      setCommentText("");
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    }
  };

  if (videoLoading) {
    return <VideoPageSkeleton />;
  }

  if (!video) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Video not found</h2>
        <p className="text-muted-foreground mb-6">
          This video may have been removed or doesn&apos;t exist.
        </p>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>
      </div>
    );
  }

  const blobVideoUrl = video.video.getDirectURL();
  const creatorDisplay =
    creatorProfile?.displayName ||
    video.creator.toString().slice(0, 8) + "...";

  /** Convert a YouTube watch/short URL to an embed URL, or return null if not YouTube */
  function getYouTubeEmbedUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      // youtube.com/watch?v=ID
      if (
        (parsed.hostname === "www.youtube.com" || parsed.hostname === "youtube.com") &&
        parsed.pathname === "/watch"
      ) {
        const v = parsed.searchParams.get("v");
        if (v) return `https://www.youtube.com/embed/${v}`;
      }
      // youtu.be/ID
      if (parsed.hostname === "youtu.be") {
        const id = parsed.pathname.slice(1);
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      // youtube.com/shorts/ID
      if (
        (parsed.hostname === "www.youtube.com" || parsed.hostname === "youtube.com") &&
        parsed.pathname.startsWith("/shorts/")
      ) {
        const id = parsed.pathname.replace("/shorts/", "");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
    } catch {
      // invalid URL — fall through
    }
    return null;
  }

  function isDirectVideoUrl(url: string): boolean {
    return /\.(mp4|webm|ogg|mov|avi|mkv)(\?.*)?$/i.test(url);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate({ to: "/" })}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-4 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Player */}
          <div className="rounded-xl overflow-hidden bg-black border border-border animate-fade-in">
            {video.videoUrl ? (
              (() => {
                const youtubeEmbed = getYouTubeEmbedUrl(video.videoUrl);
                if (youtubeEmbed) {
                  return (
                    <iframe
                      src={youtubeEmbed}
                      className="w-full aspect-video"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={video.title}
                    />
                  );
                }
                if (isDirectVideoUrl(video.videoUrl)) {
                  return (
                    <video
                      ref={videoRef}
                      src={video.videoUrl}
                      controls
                      className="w-full aspect-video"
                      preload="metadata"
                    >
                      <track kind="captions" />
                    </video>
                  );
                }
                return (
                  <iframe
                    src={video.videoUrl}
                    className="w-full aspect-video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={video.title}
                  />
                );
              })()
            ) : (
              <video
                ref={videoRef}
                src={blobVideoUrl}
                controls
                className="w-full aspect-video"
                preload="metadata"
              >
                <track kind="captions" />
              </video>
            )}
          </div>

          {/* Title & Meta */}
          <div className="animate-fade-in-up stagger-1">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight mb-3">
              {video.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Creator */}
              <div className="flex items-center gap-2.5">
                <Avatar className="w-9 h-9 ring-2 ring-border">
                  <AvatarFallback className="bg-accent text-accent-foreground text-sm">
                    {creatorDisplay.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{creatorDisplay}</p>
                  <p className="text-xs text-muted-foreground">Creator</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-mono-vid">
                  <Eye className="w-4 h-4" />
                  <span>{formatCount(Number(video.viewCount))}</span>
                </div>

                <button
                  type="button"
                  onClick={handleLike}
                  disabled={likePending}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    hasLiked
                      ? "bg-primary text-primary-foreground shadow-crimson"
                      : "bg-accent text-accent-foreground hover:bg-primary/20"
                  } disabled:opacity-60`}
                >
                  <Heart
                    className={`w-4 h-4 ${hasLiked ? "fill-current" : ""}`}
                  />
                  <span className="font-mono-vid">
                    {formatCount(Number(video.likeCount))}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Description */}
          {video.description && (
            <div className="animate-fade-in-up stagger-2">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Description
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {video.description}
              </p>
            </div>
          )}

          <Separator />

          {/* Comments */}
          <section className="animate-fade-in-up stagger-3">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4 vh-crimson-text" />
              <h2 className="font-semibold">
                Comments{" "}
                <span className="text-muted-foreground font-mono-vid text-sm">
                  ({comments?.length ?? 0})
                </span>
              </h2>
            </div>

            {/* Comment Form */}
            {isAuthenticated ? (
              <form onSubmit={handleComment} className="flex gap-3 mb-6">
                <Avatar className="w-8 h-8 shrink-0 mt-1">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={2}
                    maxLength={500}
                    className="bg-input border-border focus-visible:ring-primary resize-none text-sm"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={commentPending || !commentText.trim()}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {commentPending ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border mb-6">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground flex-1">
                  Sign in to join the conversation
                </p>
              </div>
            )}

            {/* Comments List */}
            {commentsLoading ? (
              <div className="space-y-4">
                {Array.from(
                  { length: 3 },
                  (_, i) => `comment-skel-${i}`
                ).map((key) => (
                  <div key={key} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !comments || comments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No comments yet. Be the first to comment!
              </div>
            ) : (
              <div className="space-y-5">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id.toString()}
                    comment={comment}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar — Video Info Card */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            <div className="rounded-xl bg-card border border-border p-4 animate-fade-in-up stagger-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Video Details
              </h3>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Views</dt>
                  <dd className="font-semibold font-mono-vid">
                    {formatCount(Number(video.viewCount))}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Likes</dt>
                  <dd className="font-semibold font-mono-vid vh-crimson-text">
                    {formatCount(Number(video.likeCount))}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Uploaded</dt>
                  <dd className="font-semibold text-xs">
                    {formatRelativeTime(Number(video.createdAt))}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Creator</dt>
                  <dd className="font-semibold text-xs truncate max-w-[120px] text-right">
                    {creatorDisplay}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function VideoPageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Skeleton className="h-4 w-16 mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="w-full aspect-video rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="lg:col-span-1">
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
