/*
 * What an uploaded image is allowed to be, shared by the blog and the
 * contact box so both accept the same photos.
 *
 * The extension is checked alongside the type because iPhones sometimes
 * send HEIC with an empty or generic content type.
 */

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
  "heif",
]);

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

export function getFileExtensionFromName(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function isSupportedImage(file: File): boolean {
  return (
    ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase()) ||
    ALLOWED_IMAGE_EXTENSIONS.has(getFileExtensionFromName(file))
  );
}

export function getStorageContentType(file: File): string {
  const type = file.type.toLowerCase();

  if (ALLOWED_IMAGE_TYPES.has(type)) {
    return type;
  }

  return (
    CONTENT_TYPE_BY_EXTENSION[getFileExtensionFromName(file)] ??
    "application/octet-stream"
  );
}

export function getStorageExtension(file: File): string {
  const type = file.type.toLowerCase();

  const byType = Object.entries(CONTENT_TYPE_BY_EXTENSION).find(
    ([, value]) => value === type,
  );

  return byType?.[0] ?? getFileExtensionFromName(file) ?? "jpg";
}
