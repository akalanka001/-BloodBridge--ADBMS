import { z } from 'zod';

export const uuidParam = z.string().uuid();

export const campQuerySchema = z.object({
  districtCode: z.string().trim().max(20).optional(),
});

export const createCampSchema = z.object({
  title: z.string().trim().min(4).max(200),
  organizerId: z.number().int().positive(),
  bloodBankId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  capacity: z.number().int().positive().nullable().optional(),
  publicContact: z.string().max(200).optional(),
});
