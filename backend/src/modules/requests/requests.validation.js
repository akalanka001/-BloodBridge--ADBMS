import { z } from 'zod';

export const bloodRequestSchema = z.object({
  hospitalId: z.number().int().positive(),
  urgency: z.enum(['ROUTINE', 'URGENT', 'CRITICAL']),
  neededBy: z.string().datetime({ offset: true }),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(z.object({
    bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']),
    componentCode: z.enum(['RBC', 'PLASMA', 'PLATELETS']),
    unitsRequested: z.number().int().positive().max(100),
  })).min(1).max(10),
});
