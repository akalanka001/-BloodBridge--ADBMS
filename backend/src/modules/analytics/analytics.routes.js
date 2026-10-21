import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.get('/summary', authenticate, (req, res, next) => analyticsController.getSummary(req, res, next));

export default router;
