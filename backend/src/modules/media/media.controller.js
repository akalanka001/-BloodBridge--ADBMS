import path from 'node:path';
import fs from 'node:fs';
import { mediaService } from './media.service.js';

export class MediaController {
  async getMedia(req, res, next) {
    try {
      const asset = await mediaService.getMedia(req.params.id);
      const filePath = path.join(process.cwd(), asset.storage_path.replace(/^\//, ''));
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on storage' });
      }
      res.setHeader('Content-Type', asset.mime_type);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      next(err);
    }
  }

  async getMediaMetadata(req, res, next) {
    try {
      const asset = await mediaService.getMedia(req.params.id);
      res.json({ data: asset });
    } catch (err) {
      next(err);
    }
  }

  async uploadMedia(req, res, next) {
    try {
      const { base64Data, originalName, altText } = req.body;
      const asset = await mediaService.processAndSaveImage({
        base64Data,
        originalName,
        altText,
        uploadedBy: req.user.id,
      });
      res.status(201).json({ data: asset });
    } catch (err) {
      next(err);
    }
  }

  async deleteMedia(req, res, next) {
    try {
      const result = await mediaService.deleteMedia(req.params.id, req.user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const mediaController = new MediaController();
