import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  districtCode: z.string().trim().max(20).optional(),
});
