import { rejectClaimSchema, claimQuerySchema } from './admin.validation.js';
import { adminService } from './admin.service.js';

export class AdminController {
  async getClaims(req, res, next) {
    try {
      const { status } = claimQuerySchema.parse(req.query);
      const data = await adminService.getClaims(status);
      res.json({ data, count: data.length });
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
