import { z } from 'zod';

export const notificationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  category: z.string().trim().max(30).optional(),
  status: z.enum(['UNREAD', 'READ']).optional(),
  search: z.string().trim().max(100).optional(),
});

export const deliveryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['PENDING', 'PROCESSING', 'PUBLISHED', 'DELIVERED', 'FAILED']).optional(),
  channel: z.enum(['IN_APP', 'EMAIL', 'SMS']).optional(),
  search: z.string().trim().max(100).optional(),
});

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
