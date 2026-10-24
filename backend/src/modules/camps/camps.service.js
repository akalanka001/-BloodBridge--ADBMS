import { campsRepository } from './camps.repository.js';
import { mediaService } from '../media/media.service.js';
import { bankRepository } from '../bank/bank.repository.js';
import { NotFoundError, ForbiddenError, ConflictError, BadRequestError } from '../../infrastructure/errors.js';
import { broadcastCampCapacity } from '../../socket.js';

export class CampsService {
  async listPublicCamps(filters = {}) {
    return campsRepository.listPublicCamps(filters);
  }

  async listManagedCamps(filters = {}, user) {
    let targetBankId = filters.bloodBankId;
    if (!targetBankId && user.role === 'BANK_STAFF') {
      targetBankId = await bankRepository.getUserBankId(user.id);
    }
    return campsRepository.listManagedCamps({
      ...filters,
      bankId: targetBankId,
      userRole: user.role,
      userId: user.id,
    });
  }

  async getCampById(id) {
    const camp = await campsRepository.getCampById(id);
    if (!camp) throw new NotFoundError('Camp record not found');
    return camp;
  }

  async createCamp(data, user) {
    if (new Date(data.startsAt) <= new Date()) {
      throw new BadRequestError('Camp start time must be in the future');
    }
    if (new Date(data.endsAt) <= new Date(data.startsAt)) {
      throw new BadRequestError('Camp end time must be after start time');
    }

    if (user.role !== 'ADMIN') {
      const isStaff = await campsRepository.isStaffAtBank(user.id, data.bloodBankId);
      if (!isStaff) throw new ForbiddenError('Not assigned to the selected coordinating blood bank');
    }

    return campsRepository.createCamp(data, user.id);
  }

  async updateCamp(id, data, user) {
    const camp = await campsRepository.getCampById(id);
    if (!camp) throw new NotFoundError('Camp not found');

    if (user.role !== 'ADMIN') {
      const isStaff = await campsRepository.isStaffAtBank(user.id, camp.blood_bank_id);
      if (!isStaff) throw new ForbiddenError('Not authorized to edit this camp');
    }

    if (camp.status !== 'DRAFT') {
      throw new BadRequestError(`Cannot edit camp in status ${camp.status}. Only DRAFT camps may be edited`);
    }

    return campsRepository.updateCamp(id, data, user.id);
  }

  async submitCamp(id, user) {
    const camp = await campsRepository.getCampById(id);
    if (!camp) throw new NotFoundError('Camp not found');

    if (user.role !== 'ADMIN') {
      const isStaff = await campsRepository.isStaffAtBank(user.id, camp.blood_bank_id);
      if (!isStaff) throw new ForbiddenError('Not authorized for this camp');
    }

    const updated = await campsRepository.submitCamp(id, user.id);
    if (!updated) throw new ConflictError('Camp cannot be submitted (must be future DRAFT camp)');
    return updated;
  }

  async approveCamp(id, user) {
    const camp = await campsRepository.getCampById(id);
    if (!camp) throw new NotFoundError('Camp not found');

    if (user.role !== 'ADMIN') {
      const isStaff = await campsRepository.isStaffAtBank(user.id, camp.blood_bank_id);
      if (!isStaff) throw new ForbiddenError('Not authorized for the coordinating blood bank');
    }

    return campsRepository.approveCamp(id, user.id);
  }

  async cancelCamp(id, user, reason) {
    const camp = await campsRepository.getCampById(id);
    if (!camp) throw new NotFoundError('Camp not found');

    if (user.role !== 'ADMIN') {
      const isStaff = await campsRepository.isStaffAtBank(user.id, camp.blood_bank_id);
      if (!isStaff) throw new ForbiddenError('Not authorized for this camp');
    }

    return campsRepository.cancelCamp(id, user.id, reason);
  }

  async registerDonor(campId, userId) {
    const reg = await campsRepository.registerDonorForCamp(campId, userId);
    if (!reg) throw new NotFoundError('Donor profile missing');

    try {
      const registeredCount = await campsRepository.getCampRegistrationCount(campId);
      broadcastCampCapacity({
        campId,
        registeredCount,
        status: 'APPROVED',
      });
    } catch {}

    return reg;
  }

  async cancelDonorRegistration(campId, userId) {
    const reg = await campsRepository.cancelDonorRegistration(campId, userId);
    if (!reg) throw new NotFoundError('Active registration not found');

    try {
      const registeredCount = await campsRepository.getCampRegistrationCount(campId);
      broadcastCampCapacity({
        campId,
        registeredCount,
        status: 'APPROVED',
      });
    } catch {}

    return reg;
  }

  async getDonorRegistrations(user) {
    return campsRepository.getDonorRegistrations(user.id);
  }

  async listCampRegistrations(campId, user) {
    const camp = await campsRepository.getCampById(campId);
    if (!camp) throw new NotFoundError('Camp not found');

    if (user.role !== 'ADMIN') {
      const isStaff = await campsRepository.isStaffAtBank(user.id, camp.blood_bank_id);
      if (!isStaff) throw new ForbiddenError('Not authorized to view registrations for this camp');
    }

    return campsRepository.listCampRegistrations(campId);
  }

  async checkInDonor(campId, donorId, user, status, notes) {
    const camp = await campsRepository.getCampById(campId);
    if (!camp) throw new NotFoundError('Camp not found');

    if (user.role !== 'ADMIN') {
      const isStaff = await campsRepository.isStaffAtBank(user.id, camp.blood_bank_id);
      if (!isStaff) throw new ForbiddenError('Not authorized to record attendance for this camp');
    }

    return campsRepository.checkInDonor(campId, donorId, user.id, status, notes);
  }

  async attachCampMedia(campId, data, user) {
    const camp = await campsRepository.getCampById(campId);
    if (!camp) throw new NotFoundError('Camp not found');

    if (user.role !== 'ADMIN') {
      const isStaff = await campsRepository.isStaffAtBank(user.id, camp.blood_bank_id);
      if (!isStaff) throw new ForbiddenError('Not authorized to manage media for this camp');
    }

    let mediaId = data.mediaId;
    if (!mediaId && data.base64Data) {
      const asset = await mediaService.processAndSaveImage({
        base64Data: data.base64Data,
        originalName: data.originalName,
        altText: data.altText,
        uploadedBy: user.id,
      });
      mediaId = asset.id;
    }

    if (!mediaId) throw new BadRequestError('Either mediaId or base64Data is required');

    return campsRepository.attachCampMedia(campId, mediaId, data.isPrimary ?? true);
  }

  async removeCampMedia(campId, mediaId, user) {
    const camp = await campsRepository.getCampById(campId);
    if (!camp) throw new NotFoundError('Camp not found');

    if (user.role !== 'ADMIN') {
      const isStaff = await campsRepository.isStaffAtBank(user.id, camp.blood_bank_id);
      if (!isStaff) throw new ForbiddenError('Not authorized to manage media for this camp');
    }

    return campsRepository.removeCampMedia(campId, mediaId);
  }

  async listCampMedia(campId) {
    return campsRepository.listCampMedia(campId);
  }

  async listOrganizers() {
    return campsRepository.listOrganizers();
  }
}

export const campsService = new CampsService();
