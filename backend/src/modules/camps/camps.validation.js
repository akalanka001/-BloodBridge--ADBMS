import { z } from 'zod';

export const uuidParam = z.string().uuid();

export const campQuerySchema = z.object({
  districtCode: z.string().trim().max(20).optional(),
  provinceCode: z.string().trim().max(20).optional(),
  dsCode: z.string().trim().max(20).optional(),
  gnCode: z.string().trim().max(20).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED']).optional(),
  bloodBankId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['nearby', 'date', 'availability']).default('date'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const registrationQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['REGISTERED', 'CANCELLED', 'ATTENDED', 'NO_SHOW']).optional(),
  period: z.enum(['upcoming', 'history', 'all']).default('all'),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const createCampSchema = z.object({
  title: z.string().trim().min(4).max(200),
  description: z.string().trim().max(1000).optional(),
  organizerId: z.coerce.number().int().positive(),
  bloodBankId: z.coerce.number().int().positive(),
  locationId: z.coerce.number().int().positive().optional(),
  customLocation: z.object({
    districtCode: z.string().trim().min(1).max(20),
    dsCode: z.string().trim().max(20).optional(),
    town: z.string().trim().min(2).max(100),
    addressLine: z.string().trim().min(3).max(255).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  }).optional(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  publicContact: z.string().max(200).optional(),
}).refine(data => data.locationId || data.customLocation, {
  message: 'Either locationId or customLocation must be provided',
}).refine(data => new Date(data.endsAt) > new Date(data.startsAt), {
  message: 'Camp end time must be after start time',
});

export const updateCampSchema = z.object({
  title: z.string().trim().min(4).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  organizerId: z.coerce.number().int().positive().optional(),
  locationId: z.coerce.number().int().positive().optional(),
  startsAt: z.string().datetime({ offset: true }).optional(),
  endsAt: z.string().datetime({ offset: true }).optional(),
  capacity: z.coerce.number().int().positive().nullable().optional(),
  publicContact: z.string().max(200).optional(),
});

export const cancelCampSchema = z.object({
  reason: z.string().trim().min(4).max(500),
});

export const checkInSchema = z.object({
  donorId: z.string().uuid(),
  status: z.enum(['ATTENDED', 'NO_SHOW', 'REGISTERED', 'CANCELLED']).default('ATTENDED'),
  notes: z.string().trim().max(500).optional(),
});

export const campMediaSchema = z.object({
  mediaId: z.string().uuid().optional(),
  base64Data: z.string().optional(),
  originalName: z.string().optional(),
  altText: z.string().trim().max(255).optional(),
  isPrimary: z.boolean().default(true),
});
