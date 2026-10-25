import {
  userFilterSchema,
  updateUserStatusSchema,
  staffMembershipFilterSchema,
  assignMembershipSchema,
  updateMembershipSchema,
  institutionFilterSchema,
  createInstitutionSchema,
  updateInstitutionSchema,
  verifyInstitutionSchema,
  auditFilterSchema,
  rejectClaimSchema,
  claimQuerySchema,
} from './admin.validation.js';
import { adminService } from './admin.service.js';
import { BadRequestError } from '../../infrastructure/errors.js';

export class AdminController {
  async getDashboard(req, res, next) {
    try {
      const data = await adminService.getDashboard();
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  // --- Users ---
  async listUsers(req, res, next) {
    try {
      const filters = userFilterSchema.parse(req.query);
      const data = await adminService.listUsers(filters);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getUserById(req, res, next) {
    try {
      const data = await adminService.getUserById(req.params.id);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async updateUserStatus(req, res, next) {
    try {
      const parsed = updateUserStatusSchema.parse(req.body);
      const data = await adminService.updateUserStatus(req.params.id, parsed, req.user);
      res.json({ message: `User account ${parsed.isActive ? 'activated' : 'deactivated'} successfully`, data });
    } catch (err) {
      next(err);
    }
  }

  // --- Staff Memberships ---
  async listStaffMemberships(req, res, next) {
    try {
      const filters = staffMembershipFilterSchema.parse(req.query);
      const data = await adminService.listStaffMemberships(filters);
      res.json(Array.isArray(data) ? { data } : { data: data.rows, pagination: data.pagination });
    } catch (err) {
      next(err);
    }
  }

  async assignStaffMembership(req, res, next) {
    try {
      const body = assignMembershipSchema.parse(req.body);
      const data = await adminService.assignStaffMembership(body, req.user);
      res.status(201).json({ message: 'Staff membership assigned successfully', data });
    } catch (err) {
      next(err);
    }
  }

  async updateStaffMembership(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new BadRequestError('Invalid membership ID');
      const body = updateMembershipSchema.parse(req.body);
      const data = await adminService.updateStaffMembership(id, body, req.user);
      res.json({ message: `Staff membership ${body.isActive ? 'reactivated' : 'revoked'} successfully`, data });
    } catch (err) {
      next(err);
    }
  }

  // --- Institutions ---
  async listInstitutions(req, res, next) {
    try {
      const filters = institutionFilterSchema.parse(req.query);
      const data = await adminService.listInstitutions(filters);
      res.json(Array.isArray(data) ? { data } : { data: data.rows, pagination: data.pagination });
    } catch (err) {
      next(err);
    }
  }

  async createInstitution(req, res, next) {
    try {
      const body = createInstitutionSchema.parse(req.body);
      const data = await adminService.createInstitution(body, req.user);
      res.status(201).json({ message: `${body.type} institution created successfully`, data });
    } catch (err) {
      next(err);
    }
  }

  async updateInstitution(req, res, next) {
    try {
      const type = req.params.type?.toUpperCase();
      if (!['HOSPITAL', 'BLOOD_BANK'].includes(type)) {
        throw new BadRequestError('Institution type must be HOSPITAL or BLOOD_BANK');
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new BadRequestError('Invalid institution ID');
      const body = updateInstitutionSchema.parse(req.body);
      const data = await adminService.updateInstitution(type, id, body, req.user);
      res.json({ message: 'Institution updated successfully', data });
    } catch (err) {
      next(err);
    }
  }

  async verifyInstitution(req, res, next) {
    try {
      const type = req.params.type?.toUpperCase();
      if (!['HOSPITAL', 'BLOOD_BANK'].includes(type)) {
        throw new BadRequestError('Institution type must be HOSPITAL or BLOOD_BANK');
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) throw new BadRequestError('Invalid institution ID');
      const body = verifyInstitutionSchema.parse(req.body);
      const data = await adminService.verifyInstitution(type, id, body, req.user);
      res.json({ message: `Institution verification ${body.isVerified ? 'approved' : 'revoked'} successfully`, data });
    } catch (err) {
      next(err);
    }
  }

  // --- Audit Logs ---
  async listAuditLogs(req, res, next) {
    try {
      const filters = auditFilterSchema.parse(req.query);
      const data = await adminService.listAuditLogs(filters);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  // --- Donor Link Claims ---
  async getClaims(req, res, next) {
    try {
      const filters = claimQuerySchema.parse(req.query);
      const data = await adminService.getClaims(filters.status, filters);
      res.json(Array.isArray(data) ? { data, count: data.length } : { data: data.rows, count: data.pagination.total, pagination: data.pagination });
    } catch (err) {
      next(err);
    }
  }

  async approveClaim(req, res, next) {
    try {
      const data = await adminService.approveClaim(req.params.id, req.user.id);
      res.json({ message: 'Donor account claim approved and linked', data });
    } catch (err) {
      next(err);
    }
  }

  async rejectClaim(req, res, next) {
    try {
      const { reason } = rejectClaimSchema.parse(req.body);
      const data = await adminService.rejectClaim(req.params.id, req.user.id, reason);
      res.json({ message: 'Donor account claim rejected', data });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
