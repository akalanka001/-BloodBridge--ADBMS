import { z } from 'zod';

export const lookupSchema = z.object({
  nationalId: z.string().trim().min(5).max(30).optional(),
  phone: z.string().trim().min(7).max(25).optional(),
  fullName: z.string().trim().min(2).max(120).optional(),
}).refine(data => data.nationalId || data.phone || data.fullName, {
  message: 'At least one search criterion (nationalId, phone, or fullName) must be provided',
});

export const walkInRegistrationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(25),
  email: z.string().trim().email().max(255).nullable().optional(),
  nationalId: z.string().trim().min(5).max(30).optional(),
  bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).nullable().optional(),
  districtCode: z.string().trim().min(1).max(20),
  dsCode: z.string().trim().max(20).nullable().optional(),
  availableForContact: z.boolean().default(true),
  campNotificationsOptIn: z.boolean().default(true),
  bloodBankId: z.number().int().positive().optional(),
  campId: z.string().uuid().optional(),
}).refine(data => data.bloodBankId || data.campId, {
  message: 'Enrollment must specify either bloodBankId or campId',
});

export const visitCheckInSchema = z.object({
  donorId: z.string().uuid(),
  bloodBankId: z.number().int().positive().optional(),
  campId: z.string().uuid().optional(),
  purpose: z.enum(['DONATION', 'CONSULTATION', 'RETEST']).default('DONATION'),
  notes: z.string().max(500).optional(),
}).refine(data => data.bloodBankId || data.campId, {
  message: 'Visit check-in must specify either bloodBankId or campId',
});

export const assessmentSchema = z.object({
  status: z.enum(['PASSED', 'TEMPORARY_DEFERRAL', 'PERMANENT_DEFERRAL']),
  hemoglobin_g_dl: z.number().min(5.0).max(25.0).nullable().optional(),
  weight_kg: z.number().min(30.0).max(250.0).nullable().optional(),
  deferralReason: z.string().trim().max(500).optional(),
  deferralUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD').optional(),
  notes: z.string().max(500).optional(),
}).refine(data => data.status === 'PASSED' || (data.deferralReason && data.deferralReason.trim().length > 0), {
  message: 'deferralReason is required when donor is deferred',
});

export const donationCollectionSchema = z.object({
  visitId: z.string().uuid(),
  donorId: z.string().uuid(),
  bloodBankId: z.number().int().positive(),
  campId: z.string().uuid().optional(),
  bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']),
  collectedVolumeMl: z.number().int().min(200).max(600).default(450),
});
