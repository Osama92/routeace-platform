import { useEffect, useState } from "react";
import { resolveStorageUrl } from "@/lib/storage/signedUrl";

interface StorageImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Private bucket name, e.g. "profile-pictures" or "vehicle-pictures". */
  bucket: string;
  /** Stored value — may be a raw path or a legacy public URL. */
  src?: string | null;
  /** Fallback image URL if the stored object can't be resolved. */
  fallbackSrc?: string;
}

/**
 * Renders an <img> backed by a Supabase Storage object in a private bucket.
 * Resolves to a signed URL on mount. Falls back to fallbackSrc on failure.
 */
const StorageImage = ({ bucket, src, fallbackSrc, alt, ...rest }: StorageImageProps) => {
  const [resolved, setResolved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!src) {
      setResolved(null);
      return;
    }
    (async () => {
      const url = await resolveStorageUrl(bucket, src);
      if (!cancelled) setResolved(url ?? fallbackSrc ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [bucket, src, fallbackSrc]);

  if (!resolved) {
    if (fallbackSrc) return <img src={fallbackSrc} alt={alt ?? ""} {...rest} />;
    return null;
  }
  return <img src={resolved} alt={alt ?? ""} {...rest} />;
};

export default StorageImage;
