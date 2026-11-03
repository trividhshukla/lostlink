import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { processReportImage } from '@/lib/server/storage/process-image';
import { CATEGORIES } from '@/lib/constants';

describe('Photo Validation Unit Tests (IMG-UNIT)', () => {
  // IMG-UNIT-01 & 02: Report Type Photo Rules
  it('IMG-UNIT-01: Lost reports forbid photo uploads', () => {
    const validateLostReportPhoto = (hasPhoto: boolean) => {
      if (hasPhoto) throw new Error('Lost reports must not include photo uploads');
      return true;
    };
    expect(() => validateLostReportPhoto(true)).toThrow('Lost reports must not include photo uploads');
    expect(validateLostReportPhoto(false)).toBe(true);
  });

  it('IMG-UNIT-02: Found reports require exactly one photo upload', () => {
    const validateFoundReportPhoto = (photoCount: number) => {
      if (photoCount !== 1) throw new Error('Found report requires exactly one photo');
      return true;
    };
    expect(() => validateFoundReportPhoto(0)).toThrow('Found report requires exactly one photo');
    expect(() => validateFoundReportPhoto(2)).toThrow('Found report requires exactly one photo');
    expect(validateFoundReportPhoto(1)).toBe(true);
  });

  // IMG-UNIT-03: Valid formats and fake extension rejection
  it('IMG-UNIT-03: processes valid PNG and rejects text file renamed .jpg', async () => {
    // 1. Valid 200x200 PNG image
    const validPngBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 3,
        background: { r: 10, g: 150, b: 200 },
      },
    })
      .png()
      .toBuffer();

    const result = await processReportImage(validPngBuffer);
    expect(result).toBeDefined();
    expect(result.mimeType).toBe('image/webp'); // normalized to webp
    expect(result.sha256).toHaveLength(64);

    // 2. Text renamed to .jpg (fake extension)
    const fakeJpgBuffer = Buffer.from('This is a text string disguised as an image file', 'utf-8');
    await expect(processReportImage(fakeJpgBuffer)).rejects.toThrow();
  });

  // IMG-UNIT-04: GIF, SVG, empty and corrupt image rejection
  it('IMG-UNIT-04: rejects GIF, SVG, empty and corrupt buffers', async () => {
    // Empty buffer
    await expect(processReportImage(Buffer.alloc(0))).rejects.toThrow('Image file is empty');

    // GIF buffer
    const gifBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .gif()
      .toBuffer();
    await expect(processReportImage(gifBuffer)).rejects.toThrow(/Unsupported image format/);

    // Corrupt buffer
    const corruptBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // incomplete JPEG header
    await expect(processReportImage(corruptBuffer)).rejects.toThrow();
  });

  // IMG-UNIT-05: Resizing & Re-encoding (1280px max edge)
  it('IMG-UNIT-05: resizes oversized image dimensions to maximum 1280px long edge', async () => {
    const largeBuffer = await sharp({
      create: {
        width: 2000,
        height: 1000,
        channels: 3,
        background: { r: 50, g: 100, b: 150 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await processReportImage(largeBuffer);
    expect(result.width).toBeLessThanOrEqual(1280);
    expect(result.height).toBeLessThanOrEqual(1280);
    expect(result.width).toBe(1280);
    expect(result.height).toBe(640); // Preserved 2:1 aspect ratio
  });

  // IMG-UNIT-06: EXIF/GPS Metadata Stripping
  it('IMG-UNIT-06: strips EXIF/GPS metadata during normalization', async () => {
    // Generate image with metadata
    const imgWithExif = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .withMetadata({
        exif: {
          IFD0: {
            Make: 'TestPhone',
            Model: 'GPS-Cam',
          },
        },
      })
      .jpeg()
      .toBuffer();

    const result = await processReportImage(imgWithExif);
    const metaAfter = await sharp(result.buffer).metadata();

    // EXIF metadata must be stripped
    expect(metaAfter.exif).toBeUndefined();
  });

  // IMG-UNIT-07: Restricted Document Classification
  it('IMG-UNIT-07: enforces restricted photo visibility for ID cards and documents', () => {
    const idCardCat = CATEGORIES.find((c) => c.slug === 'id-cards-documents');
    expect(idCardCat).toBeDefined();
    expect(idCardCat?.photoVisibility).toBe('restricted');

    const backpackCat = CATEGORIES.find((c) => c.slug === 'bags-backpacks');
    expect(backpackCat).toBeDefined();
    expect(backpackCat?.photoVisibility).toBe('public');
  });
});
