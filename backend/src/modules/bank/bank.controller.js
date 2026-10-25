import { bankService } from './bank.service.js';

export class BankController {
  async getDashboard(req, res, next) {
    try {
      const bankId = req.query.bankId || req.query.bloodBankId;
      const componentCode = req.query.componentCode || 'RBC';
      const data = await bankService.getDashboard(bankId, req.user, componentCode);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getIncomingRequests(req, res, next) {
    try {
      const bankId = req.query.bankId || req.query.bloodBankId;
      const requestedLimit = Number(req.query.limit);
      const requestedOffset = Number(req.query.offset);
      const filters = {
        limit: Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(100, requestedLimit) : 10,
        offset: Number.isInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0,
      };
      const result = await bankService.getIncomingRequests(bankId, req.user, filters);
      res.json({ data: result.data, count: result.pagination.total, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  }

  async getUpcomingCamps(req, res, next) {
    try {
      const bankId = req.query.bankId || req.query.bloodBankId;
      const data = await bankService.getUpcomingCamps(bankId, req.user);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }

  async getVerifiedBloodBanks(req, res, next) {
    try {
      const { district } = req.query;
      const data = await bankService.getVerifiedBloodBanks(district);
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
}

export const bankController = new BankController();
