import { z } from 'zod';

export const userFilterSchema = z.object({
  search: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'DONOR', 'HOSPITAL_STAFF', 'BANK_STAFF']).optional(),
  isActive: z.string().optional().transform((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
  institutionId: z.string().trim().optional(),
  isEmailVerified: z.string().optional().transform((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().min(3, 'Audit reason must be at least 3 characters').optional(),
});

export const staffMembershipFilterSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  userId: z.string().uuid().optional(),
  role: z.enum(['HOSPITAL_STAFF', 'BANK_STAFF']).optional(),
  hospitalId: z.coerce.number().int().positive().optional(),
  bloodBankId: z.coerce.number().int().positive().optional(),
  isActive: z.string().optional().transform((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
});

export const assignMembershipSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['HOSPITAL_STAFF', 'BANK_STAFF']),
  hospitalId: z.coerce.number().int().positive().optional(),
  bloodBankId: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().default(true),
  reason: z.string().trim().optional(),
}).refine(
  (data) => {
    if (data.role === 'HOSPITAL_STAFF') {
      return Boolean(data.hospitalId) && !data.bloodBankId;
    }
    if (data.role === 'BANK_STAFF') {
      return Boolean(data.bloodBankId) && !data.hospitalId;
    }
    return false;
  },
  {
    message: 'HOSPITAL_STAFF requires hospitalId only; BANK_STAFF requires bloodBankId only',
  }
);

export const updateMembershipSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().trim().optional(),
});

export const institutionFilterSchema = z.object({
  type: z.enum(['HOSPITAL', 'BLOOD_BANK']).optional(),
  districtCode: z.string().trim().optional(),
  provinceCode: z.string().trim().optional(),
  isVerified: z.string().optional().transform((val) => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }),
  search: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).default(0),
});

export const oversightFilterSchema = z.object({
  search: z.string().trim().max(100).default(''),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const oversightDatasetSchema = z.enum([
  'requests', 'inventory', 'reservations', 'transfers', 'fulfillments',
  'donations', 'visits', 'movements', 'appeals',
  'request-items', 'matches', 'registrations', 'organizers', 'assessments', 'invitations',
]);

export const createInstitutionSchema = z.object({
  type: z.enum(['HOSPITAL', 'BLOOD_BANK']),
  name: z.string().trim().min(2, 'Institution name must be at least 2 characters'),
  contactPhone: z.string().trim().optional(),
  isVerified: z.boolean().default(false),
  hospitalId: z.coerce.number().int().positive().optional(),
  location: z.object({
    districtCode: z.string().trim().min(1, 'District code is required'),
    dsCode: z.string().trim().optional(),
    town: z.string().trim().min(2, 'Town must be at least 2 characters'),
    addressLine: z.string().trim().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  }),
}).refine(
  (data) => {
    if (data.type === 'HOSPITAL' && data.hospitalId) {
      return false;
    }
    return true;
  },
  {
    message: 'hospitalId is only applicable for BLOOD_BANK institutions',
  }
);

export const updateInstitutionSchema = z.object({
  name: z.string().trim().min(2).optional(),
  contactPhone: z.string().trim().optional(),
  hospitalId: z.coerce.number().int().positive().nullable().optional(),
});

export const verifyInstitutionSchema = z.object({
  isVerified: z.boolean(),
  reason: z.string().trim().min(3, 'Verification audit reason is required').optional(),
});

export const auditFilterSchema = z.object({
  actorId: z.string().uuid().optional(),
  entityName: z.string().trim().optional(),
  action: z.string().trim().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const rejectClaimSchema = z.object({
  reason: z.string().trim().min(3, 'Rejection reason must be at least 3 characters'),
});

export const claimQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).default(0),
});
