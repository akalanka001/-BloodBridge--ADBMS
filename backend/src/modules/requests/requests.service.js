import { requestsRepository } from './requests.repository.js';
import { BadRequestError, ForbiddenError } from '../../infrastructure/errors.js';
import { broadcastEmergencyRequest } from '../../socket.js';

export class RequestsService {
  async getHospitalRequests(userId) {
    return requestsRepository.listRequestsByStaff(userId);
  }

  async createRequest(data, userId) {
    if (new Date(data.neededBy) <= new Date()) {
      throw new BadRequestError('neededBy must be in the future');
    }

    const isStaff = await requestsRepository.isStaffAtHospital(userId, data.hospitalId);
    if (!isStaff) {
      throw new ForbiddenError('Not assigned to requested hospital');
    }

    const created = await requestsRepository.createBloodRequest(data, userId);

    if (data.urgency === 'CRITICAL' || data.urgency === 'URGENT') {
      try {
        broadcastEmergencyRequest({
          id: created.id,
          hospitalName: `Hospital #${data.hospitalId}`,
          urgency: data.urgency,
          bloodTypeCode: data.items[0]?.bloodTypeCode,
          componentCode: data.items[0]?.componentCode,
          unitsRequested: data.items.reduce((sum, i) => sum + i.unitsRequested, 0),
          neededBy: data.neededBy,
        });
      } catch {}
    }

    return created;
  }
}

export const requestsService = new RequestsService();
