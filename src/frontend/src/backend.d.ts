import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Video {
    id: string;
    title: string;
    creator: Principal;
    likeCount: bigint;
    thumbnail: ExternalBlob;
    video: ExternalBlob;
    createdAt: bigint;
    description: string;
    viewCount: bigint;
}
export interface Comment {
    id: bigint;
    content: string;
    author: Principal;
    timestamp: bigint;
    videoId: string;
}
export interface UserProfile {
    bio: string;
    displayName: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addComment(videoId: string, content: string): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createVideo(title: string, description: string, video: ExternalBlob, thumbnail: ExternalBlob): Promise<string>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCommentsForVideo(videoId: string): Promise<Array<Comment>>;
    getFeed(page: bigint, pageSize: bigint): Promise<Array<Video>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVideo(id: string): Promise<Video | null>;
    getVideosByCreator(creator: Principal): Promise<Array<Video>>;
    hasUserLikedVideo(videoId: string): Promise<boolean>;
    incrementViewCount(videoId: string): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    toggleLike(videoId: string): Promise<boolean>;
    updateUserProfile(displayName: string, bio: string): Promise<void>;
}
