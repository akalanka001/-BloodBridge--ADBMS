import { z } from 'zod';

export const donorRegistrationSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255).transform(x => x.toLowerCase()),
  password: z.string().min(10).max(128),
  districtCode: z.string().trim().min(1).max(20),
  dsCode: z.string().trim().max(20).nullable().optional(),
  bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).nullable().optional(),
  availableForContact: z.boolean().default(false),
  campNotificationsOptIn: z.boolean().default(false),
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});
