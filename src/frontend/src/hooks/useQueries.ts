import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import type { Video, Comment, UserProfile, LeaderboardEntry } from "../backend.d";
import type { backendInterface } from "../backend";
import type { Principal } from "@icp-sdk/core/principal";

// ─── User Profile ──────────────────────────────────────────────────────────

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useGetUserProfile(user: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", user?.toString()],
    queryFn: async () => {
      if (!actor || !user) return null;
      return actor.getUserProfile(user);
    },
    enabled: !!actor && !actorFetching && !!user,
  });
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

export function useUpdateUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      displayName,
      bio,
    }: {
      displayName: string;
      bio: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateUserProfile(displayName, bio);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// ─── Feed ────────────────────────────────────────────────────────────────────

export function useGetFeed(page: number = 0, pageSize: number = 20) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Video[]>({
    queryKey: ["feed", page, pageSize],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFeed(BigInt(page), BigInt(pageSize));
    },
    enabled: !!actor && !actorFetching,
  });
}

// ─── Video ───────────────────────────────────────────────────────────────────

export function useGetVideo(id: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Video | null>({
    queryKey: ["video", id],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getVideo(id);
    },
    enabled: !!actor && !actorFetching && !!id,
  });
}

export function useGetVideosByCreator(creator: Principal | null) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Video[]>({
    queryKey: ["videosByCreator", creator?.toString()],
    queryFn: async () => {
      if (!actor || !creator) return [];
      return actor.getVideosByCreator(creator);
    },
    enabled: !!actor && !actorFetching && !!creator,
  });
}

export function useIncrementViewCount() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: string) => {
      if (!actor) return;
      return actor.incrementViewCount(videoId);
    },
    onSuccess: (_data, videoId) => {
      queryClient.invalidateQueries({ queryKey: ["video", videoId] });
    },
  });
}

export interface CreateVideoParams {
  title: string;
  description: string;
  video: Parameters<backendInterface["createVideo"]>[2];
  thumbnail: Parameters<backendInterface["createVideo"]>[3];
}

export function useCreateVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, description, video, thumbnail }: CreateVideoParams) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createVideo(title, description, video, thumbnail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

export interface CreateVideoByUrlParams {
  title: string;
  description: string;
  videoUrl: string;
  thumbnail: Parameters<backendInterface["createVideoByUrl"]>[3];
}

export function useCreateVideoByUrl() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, description, videoUrl, thumbnail }: CreateVideoByUrlParams) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createVideoByUrl(title, description, videoUrl, thumbnail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

// ─── Likes ───────────────────────────────────────────────────────────────────

export function useHasUserLikedVideo(videoId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["hasLiked", videoId],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasUserLikedVideo(videoId);
    },
    enabled: !!actor && !actorFetching && !!videoId,
  });
}

export function useToggleLike() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.toggleLike(videoId);
    },
    onSuccess: (_data, videoId) => {
      queryClient.invalidateQueries({ queryKey: ["hasLiked", videoId] });
      queryClient.invalidateQueries({ queryKey: ["video", videoId] });
    },
  });
}

// ─── Comments ────────────────────────────────────────────────────────────────

export function useGetCommentsForVideo(videoId: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<Comment[]>({
    queryKey: ["comments", videoId],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getCommentsForVideo(videoId);
    },
    enabled: !!actor && !actorFetching && !!videoId,
  });
}

export function useAddComment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      videoId,
      content,
    }: {
      videoId: string;
      content: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addComment(videoId, content);
    },
    onSuccess: (_data, { videoId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", videoId] });
    },
  });
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export function useGetLeaderboard(game: string) {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard", game],
    queryFn: async () => {
      if (!actor || !game) return [];
      return actor.getLeaderboard(game, 10n);
    },
    enabled: !!actor && !actorFetching && !!game,
  });
}

export function useSubmitScore() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ game, score }: { game: string; score: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.submitScore(game, score);
    },
    onSuccess: (_data, { game }) => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard", game] });
    },
  });
}
