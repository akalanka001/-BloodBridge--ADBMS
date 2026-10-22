import { Router } from 'express';
import { identityController } from './identity.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.post('/register-donor', (req, res, next) => identityController.registerDonor(req, res, next));
router.post('/login', (req, res, next) => identityController.login(req, res, next));
router.get('/me', authenticate, (req, res) => identityController.getMe(req, res));

export default router;
