import { Router } from 'express';
import { transfersController } from './transfers.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.use(authenticate, requireRole('BANK_STAFF', 'ADMIN'));

router.post('/', (req, res, next) => transfersController.createTransfer(req, res, next));
router.get('/', (req, res, next) => transfersController.getTransfers(req, res, next));
router.get('/:id', (req, res, next) => transfersController.getTransferById(req, res, next));
router.post('/:id/dispatch', (req, res, next) => transfersController.dispatchTransfer(req, res, next));
router.post('/:id/receive', (req, res, next) => transfersController.receiveTransfer(req, res, next));

export default router;
