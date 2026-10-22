import { z } from 'zod';

export const districtQuerySchema = z.object({
  provinceCode: z.string().trim().max(10).optional(),
});

export const dsQuerySchema = z.object({
  districtCode: z.string().trim().min(1, 'districtCode is required').max(20),
});

export const gnQuerySchema = z.object({
  dsCode: z.string().trim().max(20).optional(),
});
