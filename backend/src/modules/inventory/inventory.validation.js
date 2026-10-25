import { z } from 'zod';

export const reservationSchema = z.object({
  requestItemId: z.string().uuid(),
  bloodUnitId: z.string().uuid(),
});

export const unitReleaseSchema = z.object({
  releaseStatus: z.enum(['RELEASED', 'REJECTED']),
  notes: z.string().max(500).optional(),
});

export const processDonationSchema = z.object({
  donationId: z.string().uuid(),
  components: z
    .array(
      z.object({
        componentCode: z.enum(['RBC', 'PLASMA', 'PLATELETS']),
        volumeMl: z.number().int().positive().optional(),
        daysValid: z.number().int().positive().optional(),
      })
    )
    .min(1, 'At least one component must be specified'),
});

export const inventoryQuerySchema = z.object({
  bloodBankId: z.coerce.number().int().optional(),
  bankId: z.coerce.number().int().optional(),
  bloodTypeCode: z.string().optional(),
  componentCode: z.string().optional(),
  releaseStatus: z.enum(['QUARANTINED', 'RELEASED', 'REJECTED']).optional(),
  inventoryStatus: z.enum(['IN_STOCK', 'RESERVED', 'IN_TRANSIT', 'ISSUED', 'DISCARDED']).optional(),
  search: z.string().optional(),
});
