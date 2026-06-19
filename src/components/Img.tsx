import { ImgHTMLAttributes, useState } from "react";
import { useSignedPhoto } from "@/hooks/useSignedPhoto";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  fallback?: string;
  /** If true, requests the small thumbnail variant (for grid/card views) instead of the full-size image. */
  thumbnail?: boolean;
}

/** Renders a photo, signing storage paths on the fly. Plain http(s) URLs pass through. */
export const Img = ({ src, fallback = "/placeholder.svg", alt = "", thumbnail = false, onError, ...rest }: Props) => {
  const resolved = useSignedPhoto(src ?? "", thumbnail);

  // If a thumbnail ever fails to load (e.g. a rare edge case where one
  // wasn't generated), fall back to the full-size image before giving up.
  const [useFullSizeFallback, setUseFullSizeFallback] = useState(false);
  const fullSizeResolved = useSignedPhoto(thumbnail && useFullSizeFallback ? (src ?? "") : "", false);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (thumbnail && !useFullSizeFallback) {
      setUseFullSizeFallback(true);
      return;
    }
    onError?.(e);
  };

  const displaySrc = thumbnail && useFullSizeFallback ? fullSizeResolved : resolved;

  return <img src={displaySrc || fallback} alt={alt} onError={handleError} {...rest} />;
};