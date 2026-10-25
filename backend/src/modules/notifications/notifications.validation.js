import { z } from 'zod';

export const sendNotificationSchema = z.object({
  recipientUserId: z.string().uuid(),
  campId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(200),
  message: z.string().trim().min(5).max(1000),
  channel: z.enum(['IN_APP', 'EMAIL', 'SMS']).default('IN_APP'),
  priority: z.enum(['ROUTINE', 'URGENT', 'EMERGENCY']).default('ROUTINE'),
  category: z.enum(['CAMP', 'APPOINTMENT', 'EMERGENCY', 'SYSTEM']).default('CAMP'),
  destination: z.string().trim().min(3).optional(),
  idempotencyKey: z.string().trim().max(100).optional(),
});
