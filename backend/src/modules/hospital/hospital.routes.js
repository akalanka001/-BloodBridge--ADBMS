import { Router } from 'express';
import { requestsController } from '../requests/requests.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { donorCandidatesSchema, hospitalContextSchema, requestFiltersSchema } from '../requests/requests.validation.js';
import { hospitalCandidatesService } from './candidates.service.js';
import { hospitalCandidatesRepository } from './candidates.repository.js';

const router = Router();

router.use(authenticate, requireRole('HOSPITAL_STAFF', 'ADMIN'));

router.get('/context', async (req, res, next) => {
  try {
    const { hospitalId } = hospitalContextSchema.parse(req.query);
    res.json({ data: await hospitalCandidatesService.context(req.user.id, hospitalId) });
  } catch (error) { next(error); }
});
router.get('/donor-candidates', async (req, res, next) => {
  try {
    const filters = donorCandidatesSchema.parse(req.query);
    res.json({ data: await hospitalCandidatesService.search(req.user.id, filters) });
  } catch (error) { next(error); }
});
router.get('/reports', async (req, res, next) => {
  try {
    const filters = hospitalContextSchema.parse(req.query);
    const context = await hospitalCandidatesService.context(req.user.id, filters.hospitalId);
    res.json({ data: await hospitalCandidatesRepository.reports(context.hospitalId) });
  } catch (error) { next(error); }
});
router.get('/deliveries', async (req, res, next) => {
  try {
    const filters = requestFiltersSchema.parse(req.query);
    const context = await hospitalCandidatesService.context(req.user.id, filters.hospitalId);
    res.json(await hospitalCandidatesRepository.deliveries(context.hospitalId, filters));
  } catch (error) { next(error); }
});

router.get('/dashboard', (req, res, next) => requestsController.getDashboard(req, res, next));
router.get('/available-stock', (req, res, next) => requestsController.getAvailableStock(req, res, next));

export default router;
