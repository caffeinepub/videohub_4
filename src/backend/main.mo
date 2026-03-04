import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import List "mo:core/List";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";
import Int "mo:core/Int";
import Order "mo:core/Order";

actor {
  include MixinStorage();
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types
  public type Video = {
    createdAt : Int;
    creator : Principal;
    description : Text;
    id : Text;
    likeCount : Nat;
    thumbnail : Storage.ExternalBlob;
    title : Text;
    video : Storage.ExternalBlob;
    videoUrl : ?Text;
    viewCount : Nat;
  };

  public type Comment = {
    author : Principal;
    content : Text;
    id : Nat;
    timestamp : Int;
    videoId : Text;
  };

  public type LeaderboardEntry = {
    player : Principal;
    displayName : Text;
    score : Int;
    timestamp : Int;
  };

  public type UserProfile = {
    bio : Text;
    displayName : Text;
  };

  // State
  let videos = Map.empty<Text, Video>();
  let comments = Map.empty<Text, List.List<Comment>>();
  let videoLikes = Map.empty<Text, List.List<Principal>>();
  let userProfiles = Map.empty<Principal, UserProfile>();
  let leaderboardEntries = Map.empty<Text, List.List<LeaderboardEntry>>();

  // Video Management
  public shared ({ caller }) func createVideo(title : Text, description : Text, video : Storage.ExternalBlob, thumbnail : Storage.ExternalBlob) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create videos");
    };

    let videoId = title;
    let newVideo : Video = {
      createdAt = Time.now();
      creator = caller;
      description;
      id = videoId;
      likeCount = 0;
      thumbnail;
      title;
      video;
      videoUrl = null;
      viewCount = 0;
    };

    videos.add(videoId, newVideo);
    videoId;
  };

  public shared ({ caller }) func createVideoByUrl(title : Text, description : Text, videoUrl : Text, thumbnail : Storage.ExternalBlob) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create videos");
    };

    let videoId = title;

    let newVideo : Video = {
      createdAt = Time.now();
      creator = caller;
      description;
      id = videoId;
      likeCount = 0;
      thumbnail;
      title;
      video = thumbnail;
      videoUrl = ?videoUrl;
      viewCount = 0;
    };

    videos.add(videoId, newVideo);
    videoId;
  };

  public query ({ caller }) func getVideo(id : Text) : async ?Video {
    videos.get(id);
  };

  // Comment Management
  public shared ({ caller }) func addComment(videoId : Text, content : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add comments");
    };

    let commentId = content.size();

    let newComment : Comment = {
      author = caller;
      content;
      id = commentId;
      timestamp = Time.now();
      videoId;
    };

    let existingComments = switch (comments.get(videoId)) {
      case (null) { List.empty<Comment>() };
      case (?c) { c };
    };

    existingComments.add(newComment);
    comments.add(videoId, existingComments);
    commentId;
  };

  public query ({ caller }) func getCommentsForVideo(videoId : Text) : async [Comment] {
    switch (comments.get(videoId)) {
      case (null) { [] };
      case (?existingList) { existingList.toArray() };
    };
  };

  // Like Management
  public shared ({ caller }) func toggleLike(videoId : Text) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can like videos");
    };

    let currentLikes = switch (videoLikes.get(videoId)) {
      case (null) { List.empty<Principal>() };
      case (?likes) { likes };
    };

    let existingLike = currentLikes.any(
      func(user) { user == caller }
    );

    let newLikes = if (existingLike) {
      currentLikes.filter(
        func(user) { user != caller }
      );
    } else {
      currentLikes.add(caller);
      currentLikes.clone();
    };

    videoLikes.add(videoId, newLikes);

    // Update like count in video
    switch (videos.get(videoId)) {
      case (?video) {
        let updatedVideo = {
          video with likeCount = newLikes.size();
        };
        videos.add(videoId, updatedVideo);
      };
      case (null) {};
    };

    not existingLike;
  };

  public query ({ caller }) func hasUserLikedVideo(videoId : Text) : async Bool {
    switch (videoLikes.get(videoId)) {
      case (null) { false };
      case (?likes) { likes.any(func(user) { user == caller }) };
    };
  };

  // User Profiles
  public shared ({ caller }) func updateUserProfile(displayName : Text, bio : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update profiles");
    };

    let profile : UserProfile = {
      bio;
      displayName;
    };

    userProfiles.add(caller, profile);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access their profile");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Video Feed
  public query ({ caller }) func getFeed(page : Nat, pageSize : Nat) : async [Video] {
    let videoArray = videos.values().toArray();
    let sortedVideos = videoArray.sort(
      func(a, b) {
        if (a.createdAt > b.createdAt) { #less } else if (a.createdAt < b.createdAt) { #greater } else {
          Text.compare(a.id, b.id);
        };
      }
    );

    let startIndex = page * pageSize;
    if (startIndex >= sortedVideos.size()) { return [] };

    let endIndex = Nat.min(startIndex + pageSize, sortedVideos.size());
    sortedVideos.sliceToArray(startIndex, endIndex);
  };

  public query ({ caller }) func getVideosByCreator(creator : Principal) : async [Video] {
    let videoArray = videos.values().toArray();
    videoArray.filter(func(v) { v.creator == creator });
  };

  // Views
  public shared ({ caller }) func incrementViewCount(videoId : Text) : async () {
    switch (videos.get(videoId)) {
      case (?video) {
        let updatedVideo = {
          video with viewCount = video.viewCount + 1;
        };
        videos.add(videoId, updatedVideo);
      };
      case (null) { Runtime.trap("Video not found") };
    };
  };

  // Leaderboard
  public shared ({ caller }) func submitScore(game : Text, score : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can submit scores");
    };

    let entry : LeaderboardEntry = {
      player = caller;
      displayName = switch (userProfiles.get(caller)) {
        case (null) { "" };
        case (?profile) { profile.displayName };
      };
      score;
      timestamp = Time.now();
    };

    let newEntries = List.empty<LeaderboardEntry>();
    newEntries.add(entry);

    leaderboardEntries.add(game, newEntries);
  };

  public query ({ caller }) func getLeaderboard(game : Text, limit : Nat) : async [LeaderboardEntry] {
    switch (leaderboardEntries.get(game)) {
      case (null) { [] };
      case (?entries) {
        let sortedEntries = entries.toArray().sort(
          func(a, b) {
            Int.compare(b.score, a.score);
          }
        );

        let topEntries = sortedEntries.sliceToArray(0, Nat.min(limit, sortedEntries.size()));
        topEntries;
      };
    };
  };
};
