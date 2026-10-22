import { Router } from 'express';
import { geographyController } from './geography.controller.js';

const router = Router();

router.get('/provinces', (req, res, next) => geographyController.getProvinces(req, res, next));
router.get('/districts', (req, res, next) => geographyController.getDistricts(req, res, next));
router.get('/ds-divisions', (req, res, next) => geographyController.getDsDivisions(req, res, next));
router.get('/gn-divisions', (req, res, next) => geographyController.getGnDivisions(req, res, next));

export default router;
