import { ImgHTMLAttributes } from "react";
import { useSignedPhoto } from "@/hooks/useSignedPhoto";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  fallback?: string;
}

/** Renders a photo, signing storage paths on the fly. Plain http(s) URLs pass through. */
export const Img = ({ src, fallback = "/placeholder.svg", alt = "", ...rest }: Props) => {
  const resolved = useSignedPhoto(src ?? "");
  return <img src={resolved || fallback} alt={alt} {...rest} />;
};
