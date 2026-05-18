export const PROFILE_PICTURE_BUCKET = "profile-pictures";
export const PROFILE_PICTURE_MAX_BYTES = 5 * 1024 * 1024;

export const PROFILE_PICTURE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const PROFILE_PICTURE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif"] as const;

export type ProfilePictureValidationResult =
  | { valid: true; extension: string }
  | { valid: false; title: string; description: string; auditOutcome: "validation_failed"; auditMessage: string };

export const isOwnProfilePicturePath = (userId: string, path: string) => {
  const [folder] = path.split("/");
  return Boolean(userId) && folder === userId;
};

export const buildProfilePicturePath = (userId: string, file: File) => {
  const extension = getSafeProfilePictureExtension(file);
  return `${userId}/avatar-${Date.now()}.${extension}`;
};

export const getSafeProfilePictureExtension = (file: File) => {
  const fromName = file.name.split(".").pop()?.toLowerCase() || "";
  if (PROFILE_PICTURE_EXTENSIONS.includes(fromName as typeof PROFILE_PICTURE_EXTENSIONS[number])) {
    return fromName;
  }
  return file.type === "image/jpeg" ? "jpg" : file.type.replace("image/", "") || "png";
};

export const validateProfilePictureFile = (file: File): ProfilePictureValidationResult => {
  const extension = getSafeProfilePictureExtension(file);

  if (!PROFILE_PICTURE_MIME_TYPES.includes(file.type as typeof PROFILE_PICTURE_MIME_TYPES[number])) {
    return {
      valid: false,
      title: "Choose an image file",
      description: "Profile pictures must be JPG, PNG, WebP, or GIF images.",
      auditOutcome: "validation_failed",
      auditMessage: "invalid_file_type",
    };
  }

  if (!PROFILE_PICTURE_EXTENSIONS.includes(extension as typeof PROFILE_PICTURE_EXTENSIONS[number])) {
    return {
      valid: false,
      title: "Unsupported image format",
      description: "Use a JPG, PNG, WebP, or GIF image for your profile picture.",
      auditOutcome: "validation_failed",
      auditMessage: "invalid_file_type",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      title: "Image is empty",
      description: "Choose a valid image file and try again.",
      auditOutcome: "validation_failed",
      auditMessage: "empty_file",
    };
  }

  if (file.size > PROFILE_PICTURE_MAX_BYTES) {
    return {
      valid: false,
      title: "Image is too large",
      description: "Profile pictures must be 5MB or smaller. Compress the image and try again.",
      auditOutcome: "validation_failed",
      auditMessage: "file_too_large",
    };
  }

  return { valid: true, extension };
};

export const getProfilePictureUploadErrorMessage = (message?: string) => {
  const lower = (message || "").toLowerCase();

  if (lower.includes("row-level security") || lower.includes("unauthorized") || lower.includes("403")) {
    return {
      title: "Upload not allowed",
      description: "Please sign in again, then upload your own profile picture from your profile menu.",
    };
  }

  if (lower.includes("mime") || lower.includes("content type") || lower.includes("image")) {
    return {
      title: "Choose an image file",
      description: "Profile pictures must be JPG, PNG, WebP, or GIF images.",
    };
  }

  if (lower.includes("size") || lower.includes("too large") || lower.includes("payload")) {
    return {
      title: "Image is too large",
      description: "Profile pictures must be 5MB or smaller. Compress the image and try again.",
    };
  }

  return {
    title: "Upload failed",
    description: "We could not update your profile picture. Check your connection and try again.",
  };
};