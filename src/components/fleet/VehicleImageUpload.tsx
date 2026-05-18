import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Trash2, Upload, Loader2, Truck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface VehicleImageUploadProps {
  vehicleId?: string;
  currentImageUrl?: string | null;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
}

const VehicleImageUpload = ({
  vehicleId,
  currentImageUrl,
  onUploadComplete,
  onRemove,
}: VehicleImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { organizationId } = useAuth();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload to Supabase
    setUploading(true);
    try {
      if (!organizationId) {
        throw new Error("Missing organization. Please reload and try again.");
      }
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const folder = vehicleId || "new";
      const filePath = `${organizationId}/${folder}/truck-${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("vehicle-pictures")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Bucket is now private — store the path; display sites use StorageImage to sign on demand.
      // For an immediate local preview we sign a short-lived URL.
      const { data: signed } = await supabase.storage
        .from("vehicle-pictures")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      setPreviewUrl(signed?.signedUrl ?? null);
      onUploadComplete(filePath);
      
      toast({ title: "Photo uploaded successfully" });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setPreviewUrl(currentImageUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onRemove?.();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInputRef.current.files = dt.files;
      fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      <div
        className="relative w-full h-48 rounded-lg overflow-hidden bg-secondary/50 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {uploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}
        
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Vehicle preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Truck className="w-16 h-16 opacity-30" />
            <div className="text-center">
              <p className="font-medium">Drop image here or click to upload</p>
              <p className="text-sm">JPG, PNG (max 5MB)</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Camera className="w-4 h-4 mr-2" />
          )}
          {previewUrl ? "Change Photo" : "Upload Photo"}
        </Button>
        
        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={uploading}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};

export default VehicleImageUpload;
