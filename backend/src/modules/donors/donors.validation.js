import { z } from 'zod';

export const updatePreferencesSchema = z.object({
  availableForContact: z.boolean().optional(),
  campNotificationsOptIn: z.boolean().optional(),
  emergencyAppealOptIn: z.boolean().optional(),
  smsAlerts: z.boolean().optional(),
  emailAlerts: z.boolean().optional(),
  inAppAlerts: z.boolean().optional(),
  newsletterOptIn: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD date required').nullable().optional(),
  weightKg: z.number().min(30).max(250).nullable().optional(),
  provinceCode: z.string().trim().max(20).optional(),
  districtCode: z.string().trim().min(1).max(20).optional(),
  dsCode: z.string().trim().max(20).nullable().optional(),
  gnCode: z.string().trim().max(20).nullable().optional(),
  town: z.string().trim().max(100).nullable().optional(),
  bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).nullable().optional(),
});

export const respondInvitationSchema = z.object({
  response: z.enum(['INTERESTED', 'UNAVAILABLE', 'DISMISSED']),
});

export const bookAppointmentSchema = z.object({
  bloodBankId: z.coerce.number().int().positive().nullable().optional(),
  campId: z.string().uuid().nullable().optional(),
  appointmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid YYYY-MM-DD date required'),
  timeSlot: z.string().trim().min(3).max(50),
  donationType: z.enum(['WHOLE_BLOOD', 'PLATELETS', 'PLASMA']).default('WHOLE_BLOOD'),
  notes: z.string().trim().max(300).nullable().optional(),
}).refine((data) => data.bloodBankId != null || data.campId != null, {
  message: 'Either bloodBankId or campId must be specified',
});

export const donorListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().max(100).optional(),
  year: z.string().regex(/^\d{4}$/).optional(),
});

export const createClaimSchema = z.object({
  donorId: z.string().uuid('Valid UUID required for claimed donor ID'),
  verificationNotes: z.string().trim().max(500).optional(),
});
