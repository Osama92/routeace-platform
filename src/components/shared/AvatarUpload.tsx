import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  PROFILE_PICTURE_BUCKET,
  buildProfilePicturePath,
  getProfilePictureUploadErrorMessage,
  isOwnProfilePicturePath,
  validateProfilePictureFile,
} from "@/lib/profilePictureUpload";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  userInitials: string;
  onUploadComplete: (url: string) => void;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-20 h-20",
  lg: "w-32 h-32",
};

const AvatarUpload = ({
  userId,
  currentAvatarUrl,
  userInitials,
  onUploadComplete,
  size = "md",
}: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const logUploadEvent = async (
    action: "upload_attempt" | "upload_denied" | "upload_error",
    outcome: "success" | "denied" | "validation_failed" | "error",
    file?: File,
    errorMessage?: string,
  ) => {
    try {
      await supabase.rpc("log_profile_picture_upload_event", {
        _action: action,
        _outcome: outcome,
        _error_code: errorMessage?.slice(0, 64) || null,
        _error_message: errorMessage || null,
        _file_size_bytes: file?.size ?? null,
        _mime_type: file?.type || null,
      });
    } catch {
      // Never block the user-facing upload flow if audit logging itself is unavailable.
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateProfilePictureFile(file);
    if (validation.valid === false) {
      await logUploadEvent("upload_denied", validation.auditOutcome, file, validation.auditMessage);
      toast({
        title: validation.title,
        description: validation.description,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || userData.user.id !== userId) {
        await logUploadEvent("upload_denied", "denied", file, "auth_user_mismatch");
        throw new Error("unauthorized_profile_picture_upload");
      }

      const fileName = buildProfilePicturePath(userId, file);
      if (!isOwnProfilePicturePath(userId, fileName)) {
        await logUploadEvent("upload_denied", "denied", file, "invalid_profile_picture_path");
        throw new Error("unauthorized_profile_picture_upload");
      }

      await logUploadEvent("upload_attempt", "success", file, "attempt_started");

      const { error: uploadError } = await supabase.storage
        .from(PROFILE_PICTURE_BUCKET)
        .upload(fileName, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Bucket is private: store the object PATH (not a URL). Display uses StorageImage to sign on demand.
      const storedValue = fileName;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: storedValue })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      onUploadComplete(storedValue);
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error: any) {
      const friendlyError = getProfilePictureUploadErrorMessage(error?.message);
      await logUploadEvent(
        error?.message?.includes("row-level security") || error?.message?.includes("unauthorized") ? "upload_denied" : "upload_error",
        error?.message?.includes("row-level security") || error?.message?.includes("unauthorized") ? "denied" : "error",
        file,
        error?.message,
      );
      toast({
        title: friendlyError.title,
        description: friendlyError.description,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="relative group">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={currentAvatarUrl || undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
          {userInitials}
        </AvatarFallback>
      </Avatar>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      
      <Button
        size="icon"
        variant="secondary"
        className="absolute bottom-0 right-0 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Camera className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
};

export default AvatarUpload;
