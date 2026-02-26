import { useState, useEffect } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useUpdateUserProfile,
  useGetVideosByCreator,
} from "../hooks/useQueries";
import VideoCard from "../components/VideoCard";
import VideoCardSkeleton from "../components/VideoCardSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Edit3, Save, X, Film, Loader2 } from "lucide-react";
import type { Principal } from "@icp-sdk/core/principal";

export default function ProfilePage() {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal();

  const { data: profile, isLoading: profileLoading } =
    useGetCallerUserProfile();

  const { data: videos, isLoading: videosLoading } = useGetVideosByCreator(
    (principal as Principal) ?? null
  );

  const { mutateAsync: updateProfile, isPending: updatePending } =
    useUpdateUserProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }
    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
      toast.success("Profile updated!");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const handleCancel = () => {
    if (profile) {
      setDisplayName(profile.displayName || "");
      setBio(profile.bio || "");
    }
    setIsEditing(false);
  };

  const principalShort = principal
    ? principal.toString().slice(0, 8) + "..."
    : "Unknown";
  const displayNameShort = profile?.displayName || principalShort;
  const avatarInitials = displayNameShort.slice(0, 2).toUpperCase();

  if (profileLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Profile Card */}
      <div className="rounded-xl bg-card border border-border p-6 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          {/* Avatar */}
          <Avatar className="w-16 h-16 shrink-0 ring-2 ring-border">
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>

          {/* Profile Info or Edit Form */}
          <div className="flex-1 min-w-0">
            {!isEditing ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold truncate">
                    {profile?.displayName || principalShort}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
                    aria-label="Edit profile"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {profile?.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {profile.bio}
                  </p>
                )}
                <p className="text-xs text-muted-foreground font-mono-vid mt-1 opacity-60">
                  <User className="w-3 h-3 inline mr-1" />
                  {principalShort}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-3">
                <div className="space-y-1">
                  <Label
                    htmlFor="editDisplayName"
                    className="text-xs font-medium"
                  >
                    Display Name
                  </Label>
                  <Input
                    id="editDisplayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    maxLength={50}
                    className="h-8 text-sm bg-input border-border"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editBio" className="text-xs font-medium">
                    Bio
                  </Label>
                  <Textarea
                    id="editBio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people about yourself..."
                    rows={2}
                    maxLength={200}
                    className="text-sm bg-input border-border resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={updatePending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                  >
                    {updatePending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={updatePending}
                    className="gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 sm:gap-4 shrink-0">
            <div className="text-center">
              <p className="text-xl font-bold font-mono-vid">
                {videosLoading ? "—" : (videos?.length ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Videos</p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* My Videos */}
      <section className="animate-fade-in-up stagger-2">
        <div className="flex items-center gap-2 mb-6">
          <Film className="w-4 h-4 vh-crimson-text" />
          <h2 className="text-lg font-bold">My Videos</h2>
        </div>

        {videosLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }, (_, i) => `vid-skel-${i}`).map(
              (key) => (
                <VideoCardSkeleton key={key} />
              )
            )}
          </div>
        ) : !videos || videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Film className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <h3 className="font-semibold mb-1">No videos yet</h3>
            <p className="text-sm text-muted-foreground">
              Your uploaded videos will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
