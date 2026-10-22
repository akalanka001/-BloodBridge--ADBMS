import { z } from 'zod';

export const rejectClaimSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const claimQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
});
