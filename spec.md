# VideoHub

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Video upload and playback platform
- User authentication (login/register)
- Video feed/home page showing all uploaded videos
- Video detail page with player, title, description, like count, and comments
- Upload video page (title, description, video file)
- Comment system: post and view comments on videos
- Like/upvote system for videos
- Basic user profile (view your uploaded videos)

### Modify
- N/A

### Remove
- N/A

## Implementation Plan
1. Select: authorization, blob-storage components
2. Generate backend: users, videos (metadata), comments, likes
3. Frontend:
   - Home feed page (video grid with thumbnails, title, author, view count)
   - Video player page (embedded player, title, description, likes, comments section)
   - Upload page (form with video file, thumbnail, title, description)
   - Profile page (list of uploaded videos)
   - Auth modals (login/register)
   - Navigation bar

## UX Notes
- Dark-themed UI suited for a video platform (similar feel to YouTube/Vimeo)
- Video cards in a responsive grid layout
- Comments section below video player
- Like button with animated feedback
- Clean upload form with drag-and-drop area
