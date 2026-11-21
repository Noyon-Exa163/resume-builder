/**
 * Client-side profile-photo processing for the avatar picker: validates the
 * picked file, center-crops it square, downscales to 256px, and returns a
 * JPEG data URL small enough to store in Postgres and ship in API payloads.
 * Server side only re-checks the shape/size (isAvatarPhotoDataUrl).
 */

export const AVATAR_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

const AVATAR_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_PHOTO_MAX_INPUT_BYTES = 10 * 1024 * 1024;
const AVATAR_PHOTO_OUTPUT_SIZE = 256;
const AVATAR_PHOTO_JPEG_QUALITY = 0.85;

export function isAvatarPhotoFile(file: File): boolean {
  return AVATAR_PHOTO_TYPES.includes(file.type);
}

export async function fileToAvatarPhotoDataUrl(file: File): Promise<string> {
  if (!isAvatarPhotoFile(file)) {
    throw new Error("Choose a JPG, PNG, or WebP image.");
  }
  if (file.size > AVATAR_PHOTO_MAX_INPUT_BYTES) {
    throw new Error("That image is too large — choose one under 10 MB.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That file doesn't look like a readable image.");
  }

  try {
    // Center-crop the longer edge (cover) and draw at the output size.
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_PHOTO_OUTPUT_SIZE;
    canvas.height = AVATAR_PHOTO_OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process the image.");
    ctx.drawImage(
      bitmap,
      sx,
      sy,
      side,
      side,
      0,
      0,
      AVATAR_PHOTO_OUTPUT_SIZE,
      AVATAR_PHOTO_OUTPUT_SIZE,
    );
    return canvas.toDataURL("image/jpeg", AVATAR_PHOTO_JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}
