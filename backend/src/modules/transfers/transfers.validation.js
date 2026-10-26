import { z } from 'zod';

export const transfersQuerySchema = z.object({
  bankId: z.preprocess(
    (val) => (val === '' || val === 'undefined' || val === 'null' ? undefined : val),
    z.coerce.number().int().positive().optional()
  ),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createTransferSchema = z.object({
  transferCode: z.string().trim().min(3).max(50),
  sourceBankId: z.number().int().positive(),
  targetBankId: z.number().int().positive(),
  unitIds: z.array(z.string().uuid()).min(1),
  notes: z.string().max(500).optional(),
}).refine(data => data.sourceBankId !== data.targetBankId, {
  message: 'sourceBankId and targetBankId must be different',
});

export const receiveTransferSchema = z.object({
  notes: z.string().max(500).optional(),
});
