import bcrypt from 'bcryptjs';
import { identityRepository } from './identity.repository.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generateRandomToken,
  hashToken,
} from './identity.tokens.js';
import {
  UnauthorizedError,
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../infrastructure/errors.js';

export class IdentityService {
  async registerDonor(data) {
    const existing = await identityRepository.findActiveUserByEmail(data.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    // If age was provided without birthDate, infer an approximate birth date
    let birthDate = data.birthDate;
    if (!birthDate && data.age) {
      const today = new Date();
      today.setFullYear(today.getFullYear() - Number(data.age));
      birthDate = today.toISOString().split('T')[0];
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await identityRepository.createUserWithDonor(
      { ...data, birthDate },
      passwordHash,
    );

    // Optional email verification token generation for mock verification
    const verificationRawToken = generateRandomToken(24);
    const verificationHash = hashToken(verificationRawToken);
    const verificationExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    await identityRepository.createEmailVerificationToken(user.id, verificationHash, verificationExpiry);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
      verificationToken: process.env.NODE_ENV !== 'production' ? verificationRawToken : undefined,
    };
  }

  async login(email, password, ipAddress = null, userAgent = null) {
    const user = await identityRepository.findActiveUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new UnauthorizedError('Incorrect email or password');
    }

    const token = generateAccessToken(user);
    const { rawToken: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

    await identityRepository.createAuthSession(
      user.id,
      tokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    );

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        emailVerified: user.email_verified,
      },
    };
  }

  async refresh(rawRefreshToken, _ipAddress = null, _userAgent = null) {
    const tokenHash = hashToken(rawRefreshToken);
    const session = await identityRepository.findActiveSession(tokenHash);

    if (!session) {
      throw new UnauthorizedError('Invalid or expired session');
    }

    const user = {
      id: session.user_id,
      role: session.role,
      email: session.email,
      fullName: session.full_name,
    };

    const newAccessToken = generateAccessToken(user);
    const { rawToken: newRefreshToken, tokenHash: newTokenHash, expiresAt } = generateRefreshToken();

    await identityRepository.rotateSession(tokenHash, newTokenHash, expiresAt);

    return {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user,
    };
  }

  async logout(rawRefreshToken) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await identityRepository.revokeSession(tokenHash);
    }
    return { success: true, message: 'Logged out successfully' };
  }

  async getMe(userId) {
    const details = await identityRepository.getUserWithDetails(userId);
    if (!details) {
      throw new NotFoundError('User profile not found');
    }
    return { user: details };
  }

  async getMemberships(userId) {
    const memberships = await identityRepository.getUserMemberships(userId);
    return { memberships };
  }

  async forgotPassword(email) {
    const user = await identityRepository.findActiveUserByEmail(email);
    if (!user) {
      // Do not disclose whether email exists
      return {
        message: 'If an account exists with this email, password recovery instructions have been dispatched.',
      };
    }

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await identityRepository.createPasswordResetToken(user.id, tokenHash, expiresAt);

    return {
      message: 'If an account exists with this email, password recovery instructions have been dispatched.',
      resetToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined,
    };
  }

  async resetPassword(rawToken, newPassword) {
    const tokenHash = hashToken(rawToken);
    const record = await identityRepository.findValidPasswordResetToken(tokenHash);

    if (!record) {
      throw new BadRequestError('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await identityRepository.markPasswordResetTokenUsed(record.id, record.user_id, passwordHash);

    return {
      success: true,
      message: 'Password has been reset successfully. Please sign in with your new credentials.',
    };
  }

  async verifyEmail(rawToken) {
    const tokenHash = hashToken(rawToken);
    const record = await identityRepository.findValidEmailVerificationToken(tokenHash);

    if (!record) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    await identityRepository.markEmailVerified(record.id, record.user_id);

    return {
      success: true,
      message: 'Email verified successfully.',
    };
  }

  async inviteStaff(adminUser, data) {
    const existing = await identityRepository.findActiveUserByEmail(data.email);
    if (existing) {
      throw new ConflictError('A user with this email is already registered');
    }

    const rawToken = generateRandomToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await identityRepository.createStaffInvitation(
      adminUser.id,
      data.email,
      data.role,
      data.hospitalId,
      data.bloodBankId,
      tokenHash,
      expiresAt,
    );

    return {
      message: 'Staff invitation created successfully',
      invitationToken: process.env.NODE_ENV !== 'production' ? rawToken : undefined,
      invitation,
    };
  }

  async acceptInvite(data) {
    const tokenHash = hashToken(data.token);
    const invitation = await identityRepository.findValidStaffInvitation(tokenHash);

    if (!invitation) {
      throw new BadRequestError('Invalid or expired staff invitation token');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const newUser = await identityRepository.acceptStaffInvitation(
      invitation.id,
      data.fullName,
      invitation.email,
      passwordHash,
      invitation.role,
      invitation.hospital_id,
      invitation.blood_bank_id,
    );

    return {
      success: true,
      message: 'Staff account successfully created and activated',
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
      },
    };
  }
}

export const identityService = new IdentityService();
