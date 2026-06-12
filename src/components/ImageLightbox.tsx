import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  images: string[];
  activeIndex: number;
  onClose: () => void;
  onChangeIndex: (index: number) => void;
  alt?: string;
}

export const ImageLightbox = ({ images, activeIndex, onClose, onChangeIndex, alt = "" }: ImageLightboxProps) => {
  const goPrev = useCallback(() => {
    onChangeIndex(activeIndex === 0 ? images.length - 1 : activeIndex - 1);
  }, [activeIndex, images.length, onChangeIndex]);

  const goNext = useCallback(() => {
    onChangeIndex(activeIndex === images.length - 1 ? 0 : activeIndex + 1);
  }, [activeIndex, images.length, onChangeIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, goPrev, goNext]);

  if (!images.length) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white/80 hover:text-white rounded-full p-2 bg-black/30 hover:bg-black/50 transition-colors"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-2 md:left-6 z-10 text-white/80 hover:text-white rounded-full p-2 bg-black/30 hover:bg-black/50 transition-colors"
          aria-label="Previous image"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}

      <img
        src={images[activeIndex]}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-2 md:right-6 z-10 text-white/80 hover:text-white rounded-full p-2 bg-black/30 hover:bg-black/50 transition-colors"
          aria-label="Next image"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}

      {images.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => onChangeIndex(i)}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i === activeIndex ? "bg-white" : "bg-white/40"
              )}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
