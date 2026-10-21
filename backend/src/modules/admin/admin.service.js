import { adminRepository } from './admin.repository.js';

export class AdminService {
  async getClaims(status) {
    return adminRepository.listClaims(status);
  }

  async approveClaim(claimId, reviewerId) {
    return adminRepository.approveClaim(claimId, reviewerId);
  }

  async rejectClaim(claimId, reviewerId, reason) {
    return adminRepository.rejectClaim(claimId, reviewerId, reason);
  }
}

export const adminService = new AdminService();
