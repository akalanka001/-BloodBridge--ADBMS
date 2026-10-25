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
      const data = await bankService.getIncomingRequests(bankId, req.user);
      res.json({ data });
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
