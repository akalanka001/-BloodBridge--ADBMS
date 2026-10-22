import { donorRegistrationSchema, loginSchema } from './identity.validation.js';
import { identityService } from './identity.service.js';

export class IdentityController {
  async registerDonor(req, res, next) {
    try {
      const data = donorRegistrationSchema.parse(req.body);
      const user = await identityService.registerDonor(data);
      res.status(201).json({ message: 'Donor account created', user });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const result = await identityService.login(email, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res) {
    res.json({ user: req.user });
  }
}

export const identityController = new IdentityController();
