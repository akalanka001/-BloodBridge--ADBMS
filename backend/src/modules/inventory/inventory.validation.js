import { z } from 'zod';

export const reservationSchema = z.object({
  requestItemId: z.string().uuid(),
  bloodUnitId: z.string().uuid(),
});
