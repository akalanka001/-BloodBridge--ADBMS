import { updatePreferencesSchema, updateProfileSchema, createClaimSchema } from './donors.validation.js';
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

  async updatePreferences(req, res, next) {
    try {
      const { availableForContact, campNotificationsOptIn } = updatePreferencesSchema.parse(req.body);
      const data = await donorsService.updatePreferences(req.user.id, availableForContact, campNotificationsOptIn);
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
}

export const donorsController = new DonorsController();
