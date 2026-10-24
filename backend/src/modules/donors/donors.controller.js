import {
  updatePreferencesSchema,
  updateProfileSchema,
  createClaimSchema,
  respondInvitationSchema,
  bookAppointmentSchema,
} from './donors.validation.js';
import { donorsService } from './donors.service.js';

export class DonorsController {
  async getMyProfile(req, res, next) {
    try {
      const data = await donorsService.getMyProfile(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getDashboardSummary(req, res, next) {
    try {
      const data = await donorsService.getDashboardSummary(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getNextReviewDate(req, res, next) {
    try {
      const data = await donorsService.getNextReviewDate(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async updatePreferences(req, res, next) {
    try {
      const parsed = updatePreferencesSchema.parse(req.body);
      const data = await donorsService.updatePreferences(req.user.id, parsed);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const parsed = updateProfileSchema.parse(req.body);
      const data = await donorsService.updateProfile(req.user.id, parsed);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async submitLinkClaim(req, res, next) {
    try {
      const { donorId, verificationNotes } = createClaimSchema.parse(req.body);
      const data = await donorsService.submitLinkClaim(req.user.id, donorId, verificationNotes);
      res.status(201).json({ message: 'Claim submitted for administrative review', data });
    } catch (err) {
      next(err);
    }
  }

  async listLinkClaims(req, res, next) {
    try {
      const data = await donorsService.listLinkClaims(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getMyVisits(req, res, next) {
    try {
      const data = await donorsService.getMyVisits(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getMyDonations(req, res, next) {
    try {
      const data = await donorsService.getMyDonations(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async listInvitations(req, res, next) {
    try {
      const data = await donorsService.listInvitations(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async respondToInvitation(req, res, next) {
    try {
      const { response } = respondInvitationSchema.parse(req.body);
      const data = await donorsService.respondToInvitation(req.user.id, req.params.id, response);
      res.json({ message: 'Response recorded', data });
    } catch (err) {
      next(err);
    }
  }

  async listAppointments(req, res, next) {
    try {
      const data = await donorsService.listAppointments(req.user.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async createAppointment(req, res, next) {
    try {
      const parsed = bookAppointmentSchema.parse(req.body);
      const data = await donorsService.createAppointment(req.user.id, parsed);
      res.status(201).json({ message: 'Appointment booked successfully', data });
    } catch (err) {
      next(err);
    }
  }

  async cancelAppointment(req, res, next) {
    try {
      const data = await donorsService.cancelAppointment(req.user.id, req.params.id);
      res.json({ message: 'Appointment cancelled', data });
    } catch (err) {
      next(err);
    }
  }
}

export const donorsController = new DonorsController();
