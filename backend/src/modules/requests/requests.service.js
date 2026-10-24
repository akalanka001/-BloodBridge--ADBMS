import { requestsRepository } from './requests.repository.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../infrastructure/errors.js';
import { broadcastEmergencyRequest } from '../../socket.js';

export class RequestsService {
  async getHospitalRequests(userId, filters = {}) {
    return requestsRepository.listRequestsByStaff(userId, filters);
  }

  async getRequestDetails(requestId, userId) {
    const request = await requestsRepository.getRequestById(requestId, userId);
    if (!request) {
      throw new NotFoundError('Blood request not found or access denied');
    }
    return request;
  }

  async getRequestProgress(requestId, userId) {
    const request = await requestsRepository.getRequestById(requestId, userId);
    if (!request) {
      throw new NotFoundError('Blood request not found or access denied');
    }
    return requestsRepository.getRequestProgress(requestId);
  }

  async getMatchingSummary(requestId, userId) {
    const request = await requestsRepository.getRequestById(requestId, userId);
    if (!request) {
      throw new NotFoundError('Blood request not found or access denied');
    }
    return requestsRepository.getRequestProgress(requestId);
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

  async cancelRequest(requestId, userId, reason) {
    const request = await requestsRepository.getRequestById(requestId, userId);
    if (!request) {
      throw new NotFoundError('Blood request not found or access denied');
    }

    if (request.status === 'FULFILLED') {
      throw new BadRequestError('Cannot cancel an already fulfilled blood request');
    }

    return requestsRepository.cancelRequest(requestId, userId, reason);
  }

  async getHospitalDashboard(requestedHospitalId, userId) {
    let hospitalId = requestedHospitalId;
    if (!hospitalId) {
      hospitalId = await requestsRepository.getUserHospitalId(userId);
    }
    if (!hospitalId) {
      throw new ForbiddenError('No assigned hospital found for this staff account');
    }

    const dashboard = await requestsRepository.getHospitalDashboard(Number(hospitalId), userId);
    const kpis = dashboard.kpis || {};
    return {
      ...dashboard,
      hospitalId: Number(hospitalId),
      totals: {
        activeRequests: Number(kpis.active_requests || 0),
        criticalPriority: Number(kpis.critical_priority || 0),
        fulfilledThisMonth: Number(kpis.fulfilled_this_month || 0),
      },
    };
  }

  async getAvailableStock(requestedHospitalId, userId) {
    let hospitalId = requestedHospitalId;
    if (!hospitalId) {
      hospitalId = await requestsRepository.getUserHospitalId(userId);
    }
    if (!hospitalId) {
      throw new ForbiddenError('No assigned hospital found for this staff account');
    }

    return requestsRepository.getAvailableStockForHospital(Number(hospitalId), userId);
  }

  async confirmFulfillmentReceipt(fulfillmentId, userId, data) {
    return requestsRepository.confirmFulfillmentReceipt(fulfillmentId, userId, data);
  }
}

export const requestsService = new RequestsService();
