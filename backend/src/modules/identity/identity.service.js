import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { identityRepository } from './identity.repository.js';
import { UnauthorizedError } from '../../infrastructure/errors.js';

export class IdentityService {
  async registerDonor(data) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    return identityRepository.createUserWithDonor(data, passwordHash);
  }

  async login(email, password) {
    const user = await identityRepository.findActiveUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedError('Incorrect email or password');
    }

    const token = jwt.sign(
      { role: user.role, email: user.email },
      process.env.JWT_SECRET || 'dev_jwt_secret_must_be_set_in_production_min32chars',
      { subject: user.id, expiresIn: '8h' },
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }
}

export const identityService = new IdentityService();
