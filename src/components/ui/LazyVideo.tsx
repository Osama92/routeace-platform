import { useEffect, useRef, useState } from "react";

interface LazyVideoProps {
  src: string;
  className?: string;
  poster?: string;
  style?: React.CSSProperties;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
}

/**
 * Background video that defers loading until the element enters the viewport.
 * preload="none" until IntersectionObserver fires, then switches to autoplay.
 * Falls back gracefully when src is empty (CDN URL not yet configured).
 */
const LazyVideo = ({
  src,
  className,
  poster,
  style,
  loop = true,
  muted = true,
  playsInline = true,
}: LazyVideoProps) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!src) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  useEffect(() => {
    if (shouldLoad && ref.current && src) {
      ref.current.load();
      ref.current.play().catch(() => {});
    }
  }, [shouldLoad, src]);

  if (!src) return null;

  return (
    <video
      ref={ref}
      className={className}
      style={style}
      poster={poster}
      preload={shouldLoad ? "auto" : "none"}
      loop={loop}
      muted={muted}
      playsInline={playsInline}
      autoPlay={shouldLoad}
    >
      <source src={shouldLoad ? src : ""} type="video/mp4" />
    </video>
  );
};

export default LazyVideo;
