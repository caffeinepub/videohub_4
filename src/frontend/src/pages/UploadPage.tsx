import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ExternalBlob } from "../backend";
import { useCreateVideo } from "../hooks/useQueries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload,
  Video,
  Image,
  CheckCircle2,
  AlertCircle,
  Film,
} from "lucide-react";
import { cn } from "@/lib/utils";

type UploadStatus = "idle" | "uploading" | "done" | "error";

interface UploadState {
  status: UploadStatus;
  progress: number;
  fileName: string;
}

const initialUploadState: UploadState = {
  status: "idle",
  progress: 0,
  fileName: "",
};

function FileDropZone({
  accept,
  label,
  icon: Icon,
  uploadState,
  onFileSelect,
}: {
  accept: string;
  label: string;
  icon: React.ElementType;
  uploadState: UploadState;
  onFileSelect: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const hasFile = uploadState.status !== "idle";

  return (
    <button
      type="button"
      className={cn(
        "relative w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
        isDragging
          ? "border-primary bg-primary/5"
          : hasFile
            ? "border-primary/50 bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-accent/30"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
      />

      <div className="flex flex-col items-center gap-2">
        {hasFile ? (
          <>
            {uploadState.status === "done" ? (
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            ) : uploadState.status === "error" ? (
              <AlertCircle className="w-10 h-10 text-destructive" />
            ) : (
              <Icon className="w-10 h-10 vh-crimson-text" />
            )}
            <p className="text-sm font-medium truncate max-w-full">
              {uploadState.fileName}
            </p>
            {uploadState.status === "uploading" && (
              <div className="w-full mt-2 space-y-1">
                <Progress value={uploadState.progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground font-mono-vid">
                  {uploadState.progress}%
                </p>
              </div>
            )}
            {uploadState.status === "done" && (
              <p className="text-xs text-green-500 font-medium">
                Uploaded successfully
              </p>
            )}
            {uploadState.status === "error" && (
              <p className="text-xs text-destructive">
                Upload failed — click to retry
              </p>
            )}
          </>
        ) : (
          <>
            <Icon className="w-10 h-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drag & drop or click to select
              </p>
            </div>
          </>
        )}
      </div>
    </button>
  );
}

export default function UploadPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [videoUpload, setVideoUpload] =
    useState<UploadState>(initialUploadState);
  const [thumbnailUpload, setThumbnailUpload] =
    useState<UploadState>(initialUploadState);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: createVideo } = useCreateVideo();

  const handleVideoSelect = (file: File) => {
    setVideoFile(file);
    setVideoUpload({ status: "idle", progress: 0, fileName: file.name });
  };

  const handleThumbnailSelect = (file: File) => {
    setThumbnailFile(file);
    setThumbnailUpload({ status: "idle", progress: 0, fileName: file.name });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }
    if (!thumbnailFile) {
      toast.error("Please select a thumbnail image");
      return;
    }

    setIsSubmitting(true);

    try {
      // Read both files in parallel
      const [videoBytes, thumbnailBytes] = await Promise.all([
        videoFile.arrayBuffer().then((buf) => new Uint8Array(buf)),
        thumbnailFile.arrayBuffer().then((buf) => new Uint8Array(buf)),
      ]);

      setVideoUpload((prev) => ({ ...prev, status: "uploading", progress: 0 }));
      setThumbnailUpload((prev) => ({
        ...prev,
        status: "uploading",
        progress: 0,
      }));

      const videoBlob = ExternalBlob.fromBytes(videoBytes).withUploadProgress(
        (pct) => setVideoUpload((prev) => ({ ...prev, progress: pct }))
      );

      const thumbnailBlob = ExternalBlob.fromBytes(
        thumbnailBytes
      ).withUploadProgress((pct) =>
        setThumbnailUpload((prev) => ({ ...prev, progress: pct }))
      );

      const videoId = await createVideo({
        title: title.trim(),
        description: description.trim(),
        video: videoBlob,
        thumbnail: thumbnailBlob,
      });

      setVideoUpload((prev) => ({ ...prev, status: "done", progress: 100 }));
      setThumbnailUpload((prev) => ({
        ...prev,
        status: "done",
        progress: 100,
      }));

      toast.success("Video uploaded successfully!");

      setTimeout(() => {
        navigate({ to: "/video/$id", params: { id: videoId } });
      }, 800);
    } catch (err) {
      console.error("Upload error:", err);
      setVideoUpload((prev) => ({ ...prev, status: "error" }));
      setThumbnailUpload((prev) => ({ ...prev, status: "error" }));
      toast.error("Upload failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    !isSubmitting &&
    title.trim() !== "" &&
    videoFile !== null &&
    thumbnailFile !== null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
        <div className="w-10 h-10 vh-crimson-bg rounded-lg flex items-center justify-center">
          <Film className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload Video</h1>
          <p className="text-sm text-muted-foreground">
            Share your content with the VideoHub community
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-1.5 animate-fade-in-up stagger-1">
          <Label htmlFor="title" className="text-sm font-medium">
            Title <span className="vh-crimson-text">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your video a compelling title..."
            maxLength={100}
            className="bg-input border-border focus-visible:ring-primary"
          />
          <p className="text-xs text-muted-foreground text-right font-mono-vid">
            {title.length}/100
          </p>
        </div>

        {/* Description */}
        <div className="space-y-1.5 animate-fade-in-up stagger-2">
          <Label htmlFor="description" className="text-sm font-medium">
            Description{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this video about?"
            rows={4}
            maxLength={2000}
            className="bg-input border-border focus-visible:ring-primary resize-none"
          />
          <p className="text-xs text-muted-foreground text-right font-mono-vid">
            {description.length}/2000
          </p>
        </div>

        {/* File Uploads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-up stagger-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Video File <span className="vh-crimson-text">*</span>
            </Label>
            <FileDropZone
              accept="video/*"
              label="Select Video"
              icon={Video}
              uploadState={videoUpload}
              onFileSelect={handleVideoSelect}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Thumbnail <span className="vh-crimson-text">*</span>
            </Label>
            <FileDropZone
              accept="image/*"
              label="Select Thumbnail"
              icon={Image}
              uploadState={thumbnailUpload}
              onFileSelect={handleThumbnailSelect}
            />
          </div>
        </div>

        {/* Upload Progress Summary */}
        {isSubmitting && (
          <div className="rounded-lg bg-card border border-border p-4 space-y-3 animate-fade-in">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4 vh-crimson-text animate-bounce" />
              Uploading your content...
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4 text-muted-foreground shrink-0" />
                <Progress
                  value={videoUpload.progress}
                  className="flex-1 h-1.5"
                />
                <span className="text-xs font-mono-vid text-muted-foreground w-10 text-right">
                  {videoUpload.progress}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Image className="w-4 h-4 text-muted-foreground shrink-0" />
                <Progress
                  value={thumbnailUpload.progress}
                  className="flex-1 h-1.5"
                />
                <span className="text-xs font-mono-vid text-muted-foreground w-10 text-right">
                  {thumbnailUpload.progress}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="animate-fade-in-up stagger-4">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-semibold"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4 animate-bounce" />
                Uploading...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Publish Video
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
