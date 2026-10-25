import { donorsRepository } from './donors.repository.js';
import { NotFoundError, BadRequestError } from '../../infrastructure/errors.js';

export class DonorsService {
  async getMyProfile(userId) {
    const donor = await donorsRepository.findDonorByUserId(userId);
    if (!donor) throw new NotFoundError('Donor profile not found');
    return donor;
  }

  async getDashboardSummary(userId) {
    const donor = await donorsRepository.findDonorByUserId(userId);
    if (!donor) throw new NotFoundError('Donor profile not found');
    const summary = await donorsRepository.getDashboardSummary(userId);
    const journey = await donorsRepository.getDonationJourney(donor.id);
    return {
      ...summary,
      donation_journey: journey || [],
    };
  }

  async getNextReviewDate(userId) {
    const donor = await this.getMyProfile(userId);
    const reviewInfo = await donorsRepository.getNextReviewDate(donor.id);
    return reviewInfo;
  }

  async updatePreferences(userId, prefsOrAvailable, campNotificationsOptIn) {
    const prefs = typeof prefsOrAvailable === 'object' && prefsOrAvailable !== null
      ? prefsOrAvailable
      : { availableForContact: prefsOrAvailable, campNotificationsOptIn };
    const updated = await donorsRepository.updateDonorPreferences(userId, prefs);
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

  async listLinkClaims(userId) {
    return donorsRepository.listLinkClaims(userId);
  }

  async getMyVisits(userId) {
    const donor = await this.getMyProfile(userId);
    return donorsRepository.listVisitsByDonorId(donor.id);
  }

  async getMyDonations(userId, filters = {}) {
    const donor = await this.getMyProfile(userId);
    return donorsRepository.listVerifiedDonations(donor.id, filters);
  }

  async listInvitations(userId) {
    const donor = await this.getMyProfile(userId);
    return donorsRepository.listInvitations(donor.id);
  }

  async respondToInvitation(userId, invitationId, response) {
    const donor = await this.getMyProfile(userId);
    const updated = await donorsRepository.respondToInvitation(donor.id, invitationId, response);
    if (!updated) throw new NotFoundError('Invitation not found or unauthorized');
    return updated;
  }

  async listAppointments(userId, filters = {}) {
    const donor = await this.getMyProfile(userId);
    return donorsRepository.listAppointments(donor.id, filters);
  }

  async createAppointment(userId, data) {
    const donor = await this.getMyProfile(userId);
    return donorsRepository.createAppointment(donor.id, data);
  }

  async cancelAppointment(userId, appointmentId) {
    const donor = await this.getMyProfile(userId);
    const updated = await donorsRepository.cancelAppointment(donor.id, appointmentId);
    if (!updated) throw new NotFoundError('Appointment not found, cannot be cancelled, or unauthorized');
    return updated;
  }
}

export const donorsService = new DonorsService();
