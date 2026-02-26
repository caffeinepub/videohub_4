import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSaveCallerUserProfile } from "../hooks/useQueries";
import { toast } from "sonner";
import { User } from "lucide-react";

export default function ProfileSetupModal() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  const { mutateAsync: saveProfile, isPending } = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error("Please enter a display name");
      return;
    }
    try {
      await saveProfile({ displayName: displayName.trim(), bio: bio.trim() });
      toast.success("Profile created! Welcome to VideoHub.");
    } catch {
      toast.error("Failed to create profile. Please try again.");
    }
  };

  return (
    <Dialog open>
      <DialogContent className="sm:max-w-md bg-card border-border" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 vh-crimson-text" />
            </div>
            <div>
              <DialogTitle className="text-lg">Welcome to VideoHub</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Set up your creator profile to get started
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-sm font-medium">
              Display Name <span className="vh-crimson-text">*</span>
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How should we call you?"
              maxLength={50}
              className="bg-input border-border focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio" className="text-sm font-medium">
              Bio{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              rows={3}
              maxLength={200}
              className="bg-input border-border focus-visible:ring-primary resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending || !displayName.trim()}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isPending ? "Creating Profile..." : "Create Profile"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
