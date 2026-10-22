import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  availableForContact: z.boolean(),
  campNotificationsOptIn: z.boolean(),
});

export const updateProfileSchema = z.object({
  bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).nullable().optional(),
  districtCode: z.string().trim().min(1).max(20).optional(),
  dsCode: z.string().trim().max(20).nullable().optional(),
});

export const createClaimSchema = z.object({
  donorId: z.string().uuid(),
  verificationNotes: z.string().trim().max(500).optional(),
});
