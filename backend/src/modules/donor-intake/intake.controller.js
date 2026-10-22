import {
  lookupSchema,
  walkInRegistrationSchema,
  visitCheckInSchema,
  assessmentSchema,
  donationCollectionSchema,
} from './intake.validation.js';
import { intakeService } from './intake.service.js';

export class IntakeController {
  async lookupDonors(req, res, next) {
    try {
      const criteria = lookupSchema.parse(req.body);
      const data = await intakeService.lookupDonors(criteria);
      res.json({ data, count: data.length });
    } catch (err) {
      next(err);
    }
  }

  async registerWalkIn(req, res, next) {
    try {
      const data = walkInRegistrationSchema.parse(req.body);
      const donor = await intakeService.registerWalkIn(data, req.user);
      res.status(201).json({ message: 'Walk-in donor enrolled successfully', data: donor });
    } catch (err) {
      next(err);
    }
  }

  async checkInVisit(req, res, next) {
    try {
      const data = visitCheckInSchema.parse(req.body);
      const visit = await intakeService.checkInVisit(data, req.user);
      res.status(201).json({ message: 'Donor check-in recorded', data: visit });
    } catch (err) {
      next(err);
    }
  }

  async getVisit(req, res, next) {
    try {
      const data = await intakeService.getVisit(req.params.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async recordAssessment(req, res, next) {
    try {
      const data = assessmentSchema.parse(req.body);
      const assessment = await intakeService.recordAssessment(req.params.id, req.user, data);
      res.status(201).json({ message: 'Donor clinical assessment recorded', data: assessment });
    } catch (err) {
      next(err);
    }
  }

  async recordCollection(req, res, next) {
    try {
      const data = donationCollectionSchema.parse(req.body);
      const donation = await intakeService.recordCollection(data, req.user);
      res.status(201).json({ message: 'Donation collection event recorded', data: donation });
    } catch (err) {
      next(err);
    }
  }
}

export const intakeController = new IntakeController();
