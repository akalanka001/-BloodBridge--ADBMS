import { adminRepository } from './admin.repository.js';
import { usersService } from './users.service.js';
import { membershipsService } from './memberships.service.js';
import { institutionsService } from './institutions.service.js';
import { auditService } from './audit.service.js';

export class AdminService {
  async getDashboard() {
    return adminRepository.getDashboardMetrics();
  }

  // Users
  async listUsers(filters) {
    return usersService.listUsers(filters);
  }

  async getUserById(userId) {
    return usersService.getUserById(userId);
  }

  async updateUserStatus(userId, data, adminUser) {
    return usersService.updateUserStatus(userId, data, adminUser);
  }

  // Staff Memberships
  async listStaffMemberships(filters) {
    return membershipsService.listMemberships(filters);
  }

  async assignStaffMembership(data, adminUser) {
    return membershipsService.assignMembership(data, adminUser);
  }

  async updateStaffMembership(membershipId, data, adminUser) {
    return membershipsService.updateMembershipStatus(membershipId, data, adminUser);
  }

  // Institutions
  async listInstitutions(filters) {
    return institutionsService.listInstitutions(filters);
  }

  async createInstitution(data, adminUser) {
    return institutionsService.createInstitution(data, adminUser);
  }

  async updateInstitution(type, id, data, adminUser) {
    return institutionsService.updateInstitution(type, id, data, adminUser);
  }

  async verifyInstitution(type, id, data, adminUser) {
    return institutionsService.verifyInstitution(type, id, data, adminUser);
  }

  // Audit Logs
  async listAuditLogs(filters) {
    return auditService.listAuditLogs(filters);
  }

  // Claims
  async getClaims(status, filters = {}) {
    return adminRepository.listClaims(status, filters);
  }

  async approveClaim(claimId, reviewerId) {
    return adminRepository.approveClaim(claimId, reviewerId);
  }

  async rejectClaim(claimId, reviewerId, reason) {
    return adminRepository.rejectClaim(claimId, reviewerId, reason);
  }
}

export const adminService = new AdminService();
