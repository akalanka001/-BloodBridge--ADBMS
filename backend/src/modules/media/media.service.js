import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { mediaRepository } from './media.repository.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../infrastructure/errors.js';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'camps');

// Ensure directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function detectImageMimeType(buffer) {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    return 'image/png';
  }

  // WebP: RIFF .... WEBP
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'image/webp';
  }

  return null;
}

export class MediaService {
  async processAndSaveImage({ base64Data, originalName, altText, uploadedBy }) {
    if (!base64Data) {
      throw new BadRequestError('Image data is required');
    }

    // Strip data URL prefix if present (e.g. data:image/png;base64,...)
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestError('Image size exceeds 5MB limit');
    }

    const detectedMime = detectImageMimeType(buffer);
    if (!detectedMime) {
      throw new BadRequestError('Invalid file format. Binary content must be a valid JPEG, PNG, or WebP image');
    }

    const ext = detectedMime === 'image/jpeg' ? 'jpg' : detectedMime === 'image/png' ? 'png' : 'webp';
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    await fs.promises.writeFile(filePath, buffer);

    const relativeStoragePath = `/uploads/camps/${uniqueName}`;

    return mediaRepository.createMediaAsset({
      fileName: uniqueName,
      originalName: originalName || uniqueName,
      mimeType: detectedMime,
      fileSizeBytes: buffer.length,
      storagePath: relativeStoragePath,
      altText,
      uploadedBy,
    });
  }

  async getMedia(id) {
    const asset = await mediaRepository.getMediaById(id);
    if (!asset) {
      throw new NotFoundError('Media asset not found');
    }
    return asset;
  }

  async deleteMedia(id, user) {
    const asset = await mediaRepository.getMediaById(id);
    if (!asset) {
      throw new NotFoundError('Media asset not found');
    }
    if (user.role !== 'ADMIN' && asset.uploaded_by !== user.id) {
      throw new ForbiddenError('Unauthorized to delete this media asset');
    }

    await mediaRepository.deleteMedia(id, user.id, user.role);

    // Delete local file if exists
    try {
      const fullPath = path.join(process.cwd(), asset.storage_path.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch {}

    return { message: 'Media asset deleted successfully' };
  }
}

export const mediaService = new MediaService();
