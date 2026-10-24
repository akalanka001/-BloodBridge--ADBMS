import { Router } from 'express';
import { mediaController } from './media.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

// Public media serving
router.get('/:id', (req, res, next) => mediaController.getMedia(req, res, next));
router.get('/:id/metadata', (req, res, next) => mediaController.getMediaMetadata(req, res, next));

// Authenticated upload / delete
router.post('/', authenticate, (req, res, next) => mediaController.uploadMedia(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => mediaController.deleteMedia(req, res, next));

export default router;
