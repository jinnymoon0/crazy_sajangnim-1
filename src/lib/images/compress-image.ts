const MAX_DIMENSION = 1600;

// Keep each image small enough that up to five of them stay under Vercel's
// ~4.5 MB serverless request-body limit (5 x 800 KB = 4 MB).
const TARGET_BYTES = 800 * 1024;

const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.5];

const DISPLAYABLE_IMAGE = /^image\/(jpeg|png|webp|gif)$/i;
const DISPLAYABLE_EXTENSION = /\.(jpe?g|png|webp|gif)$/i;

/**
 * Downscale and re-encode an image to a web-sized JPEG entirely in the browser.
 *
 * Uploads go through a Next.js route handler on Vercel, whose request body is
 * capped at ~4.5 MB. Raw phone photos routinely exceed that, so we shrink them
 * before they ever leave the browser. As a side effect this converts iPhone
 * HEIC photos to JPEG, which also makes them display in browsers that can't
 * render HEIC (Chrome, Firefox, Android).
 *
 * Falls back to the original File when the browser can't decode the image
 * (commonly HEIC on desktop Chrome/Firefox) or when the source is an animated
 * GIF we don't want to flatten to a single frame.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  // Preserve animated GIFs — re-encoding would drop every frame but the first.
  if (file.type === "image/gif") {
    return file;
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
  } catch {
    // The browser can't decode this format (e.g. HEIC on desktop Chrome).
    return file;
  }

  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);

    // Already a small, web-ready JPEG within our size budget: leave it alone
    // rather than re-compressing and losing quality.
    if (
      file.type === "image/jpeg" &&
      longestEdge <= MAX_DIMENSION &&
      file.size <= TARGET_BYTES
    ) {
      return file;
    }

    const scale = Math.min(1, MAX_DIMENSION / longestEdge);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.drawImage(bitmap, 0, 0, width, height);

    let output: Blob | null = null;

    for (const quality of QUALITY_STEPS) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", quality);
      });

      if (!blob) {
        continue;
      }

      output = blob;

      if (blob.size <= TARGET_BYTES) {
        break;
      }
    }

    if (!output) {
      return file;
    }

    // If the original already displays in every browser and is no larger than
    // our re-encode, keep it. HEIC/HEIF originals are never "displayable", so
    // they always fall through to the JPEG below.
    const originalIsDisplayable =
      DISPLAYABLE_IMAGE.test(file.type) || DISPLAYABLE_EXTENSION.test(file.name);

    if (originalIsDisplayable && file.size <= output.size) {
      return file;
    }

    return toJpegFile(output, file);
  } finally {
    bitmap.close?.();
  }
}

function toJpegFile(blob: Blob, source: File): File {
  const baseName = source.name.replace(/\.[^./\\]+$/, "") || "image";

  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: source.lastModified,
  });
}
