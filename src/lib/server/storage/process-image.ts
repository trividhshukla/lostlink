import sharp from 'sharp';
import crypto from 'crypto';

export interface ProcessedImageResult {
  buffer: Buffer;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
  mimeType: string;
  extension: string;
}

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB limit
const MAX_LONG_EDGE = 1280;

/**
 * Validates, strips EXIF/GPS, resizes, and normalizes a Found report photo.
 * Zero AI analysis is performed. This is for human visual identification only.
 */
export async function processReportImage(inputBuffer: Buffer): Promise<ProcessedImageResult> {
  if (!inputBuffer || inputBuffer.length === 0) {
    throw new Error('Image file is empty');
  }

  // Probe format and metadata
  const metadata = await sharp(inputBuffer).metadata();

  if (!metadata.format || !['jpeg', 'jpg', 'png', 'webp'].includes(metadata.format.toLowerCase())) {
    throw new Error('Unsupported image format. Allowed formats: JPEG, PNG, or WebP.');
  }

  // Strip EXIF, resize long edge to max 1280px, convert to normalized WebP
  const pipeline = sharp(inputBuffer, { failOn: 'error' })
    .rotate() // Automatically orient based on EXIF before stripping
    .resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80, effort: 4 }); // Strip EXIF by default when re-encoding to webp

  const processedBuffer = await pipeline.toBuffer();

  if (processedBuffer.length > MAX_IMAGE_BYTES) {
    throw new Error('Processed image exceeds maximum allowed size of 1.5 MB.');
  }

  const processedMeta = await sharp(processedBuffer).metadata();
  const width = processedMeta.width || 1280;
  const height = processedMeta.height || 720;

  // Compute SHA-256
  const hash = crypto.createHash('sha256').update(processedBuffer).digest('hex');

  return {
    buffer: processedBuffer,
    sha256: hash,
    bytes: processedBuffer.length,
    width,
    height,
    mimeType: 'image/webp',
    extension: 'webp',
  };
}
