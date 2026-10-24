import { z } from 'zod';

export const createAppealSchema = z.object({
  requestId: z.string().uuid(),
  requestItemId: z.string().uuid(),
  hospitalId: z.number().int().positive(),
  shortageUnits: z.number().int().positive().max(50),
  reason: z.string().min(5).max(1000),
  escalationLevel: z.enum(['GN_DIVISION', 'DS_DIVISION', 'DISTRICT', 'PROVINCE', 'NATIONAL']).default('GN_DIVISION'),
});

export const escalateAppealSchema = z.object({
  targetStage: z.enum(['DS_DIVISION', 'DISTRICT', 'PROVINCE', 'NATIONAL']).optional(),
  reason: z.string().max(500).optional(),
});
