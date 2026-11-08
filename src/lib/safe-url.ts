// Object URLs for local previews. Only ever hand back a blob: URL so a
// preview <img src> can never be anything else (e.g. a javascript: URL).
export function createPreviewUrl(file: Blob): string {
  const url = URL.createObjectURL(file);
  return url.startsWith("blob:") ? url : "";
}
