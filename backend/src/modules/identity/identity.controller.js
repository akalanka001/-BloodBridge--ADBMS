import {
  donorRegistrationSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  staffInviteSchema,
  acceptInviteSchema,
} from './identity.validation.js';
import { identityService } from './identity.service.js';

export class IdentityController {
  async registerDonor(req, res, next) {
    try {
      const data = donorRegistrationSchema.parse(req.body);
      const result = await identityService.registerDonor(data);
      res.status(201).json({
        message: 'Donor account created',
        user: result.user,
        verificationToken: result.verificationToken,
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const ip = req.ip || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await identityService.login(email, password, ip, userAgent);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = refreshTokenSchema.parse(req.body);
      const ip = req.ip || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent'];
      const result = await identityService.refresh(refreshToken, ip, userAgent);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      const refreshToken = req.body?.refreshToken;
      const result = await identityService.logout(refreshToken);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const result = await identityService.getMe(req.user.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMemberships(req, res, next) {
    try {
      const result = await identityService.getMemberships(req.user.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const result = await identityService.forgotPassword(email);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      const result = await identityService.resetPassword(token, password);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async verifyEmail(req, res, next) {
    try {
      const { token } = verifyEmailSchema.parse(req.body);
      const result = await identityService.verifyEmail(token);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async inviteStaff(req, res, next) {
    try {
      const data = staffInviteSchema.parse(req.body);
      const result = await identityService.inviteStaff(req.user, data);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async acceptInvite(req, res, next) {
    try {
      const data = acceptInviteSchema.parse(req.body);
      const result = await identityService.acceptInvite(data);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const identityController = new IdentityController();
