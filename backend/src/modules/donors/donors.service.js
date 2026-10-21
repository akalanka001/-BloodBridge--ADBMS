import { donorsRepository } from './donors.repository.js';
import { NotFoundError, BadRequestError } from '../../infrastructure/errors.js';

export class DonorsService {
  async getMyProfile(userId) {
    const donor = await donorsRepository.findDonorByUserId(userId);
    if (!donor) throw new NotFoundError('Donor profile not found');
    return donor;
  }

  async updatePreferences(userId, availableForContact, campNotificationsOptIn) {
    const updated = await donorsRepository.updateDonorPreferences(userId, availableForContact, campNotificationsOptIn);
    if (!updated) throw new NotFoundError('Donor profile not found');
    return updated;
  }

  async updateProfile(userId, data) {
    const updated = await donorsRepository.updateDonorProfile(userId, data);
    if (!updated) throw new NotFoundError('Donor profile not found');
    return updated;
  }

  async submitLinkClaim(userId, donorId, verificationNotes) {
    const myDonor = await donorsRepository.findDonorByUserId(userId);
    if (myDonor && myDonor.id === donorId) {
      throw new BadRequestError('You are already linked to this donor profile');
    }
    return donorsRepository.createLinkClaim(userId, donorId, verificationNotes);
  }

  async getMyVisits(userId) {
    const donor = await this.getMyProfile(userId);
    return donorsRepository.listVisitsByDonorId(donor.id);
  }

  async getMyDonations(userId) {
    const donor = await this.getMyProfile(userId);
    return donorsRepository.listDonationsByDonorId(donor.id);
  }
}

export const donorsService = new DonorsService();
