import { Router } from 'express';
import { campsController } from './camps.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

// 1. Organizers & Donor personal registrations (place before :id to prevent param collision)
router.get('/organizers', (req, res, next) => campsController.listOrganizers(req, res, next));
router.get('/registrations/me', authenticate, requireRole('DONOR'), (req, res, next) =>
  campsController.getMyRegistrations(req, res, next)
);

// 2. Public / Managed Camp Listings
router.get('/', (req, res, next) => campsController.listCamps(req, res, next));
router.get('/managed', authenticate, requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) =>
  campsController.listManagedCamps(req, res, next)
);

// 3. Camp Details
router.get('/:id', (req, res, next) => campsController.getCamp(req, res, next));

// 4. Staff Camp Creation & Lifecycle Management
router.post('/', authenticate, requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) =>
  campsController.createCamp(req, res, next)
);
router.patch('/:id', authenticate, requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) =>
  campsController.updateCamp(req, res, next)
);
router.post('/:id/submit', authenticate, requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) =>
  campsController.submitCamp(req, res, next)
);
router.post('/:id/approve', authenticate, requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) =>
  campsController.approveCamp(req, res, next)
);
router.post('/:id/cancel', authenticate, requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) =>
  campsController.cancelCamp(req, res, next)
);

// 5. Donor Registrations & Cancellation
router.post('/:id/registrations', authenticate, requireRole('DONOR'), (req, res, next) =>
  campsController.registerDonor(req, res, next)
);
router.delete('/:id/registrations', authenticate, requireRole('DONOR'), (req, res, next) =>
  campsController.cancelRegistration(req, res, next)
);

// 6. Staff Registrations & Attendance / Check-in
router.get('/:id/registrations', authenticate, requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) =>
  campsController.listRegistrations(req, res, next)
);
router.post('/:id/check-ins', authenticate, requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) =>
  campsController.checkInDonor(req, res, next)
);

// 7. Camp Media
router.get('/:id/media', (req, res, next) => campsController.listMedia(req, res, next));
router.post('/:id/media', authenticate, requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) =>
  campsController.attachMedia(req, res, next)
);
router.delete('/:id/media/:mediaId', authenticate, requireRole('BANK_STAFF', 'ADMIN'), (req, res, next) =>
  campsController.removeMedia(req, res, next)
);

export default router;
