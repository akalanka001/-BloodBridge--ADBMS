import { z } from 'zod';

export const bloodRequestSchema = z.object({
  hospitalId: z.number().int().positive(),
  urgency: z.enum(['ROUTINE', 'URGENT', 'CRITICAL']),
  neededBy: z.string().refine((val) => {
    const d = Date.parse(val);
    return !isNaN(d) && new Date(val) > new Date();
  }, { message: 'neededBy must be a valid future datetime' }),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(z.object({
    bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']),
    componentCode: z.enum(['RBC', 'PLASMA', 'PLATELETS']),
    unitsRequested: z.number().int().positive().max(100),
  })).min(1).max(10),
});

export const cancelRequestSchema = z.object({
  reason: z.string().max(500).optional().default('Cancelled by hospital staff'),
});

export const requestFiltersSchema = z.object({
  hospitalId: z.coerce.number().int().positive().optional(),
  status: z.enum(['OPEN', 'PARTIALLY_FILLED', 'FULFILLED', 'CANCELLED']).optional(),
  urgency: z.enum(['ROUTINE', 'URGENT', 'CRITICAL']).optional(),
  search: z.string().optional(),
  bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).optional(),
  componentCode: z.enum(['RBC', 'PLASMA', 'PLATELETS']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const receiveFulfillmentSchema = z.object({
  receivedQuantity: z.number().int().positive(),
  conditionNotes: z.string().max(1000).optional(),
});
