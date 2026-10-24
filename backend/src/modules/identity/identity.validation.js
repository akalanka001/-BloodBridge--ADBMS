import { z } from 'zod';

export const donorRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  email: z.string().trim().email('Invalid email address').max(255).transform((x) => x.toLowerCase()),
  password: z.string().min(10, 'Password must be at least 10 characters').max(128),
  confirmPassword: z.string().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  birthDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be in YYYY-MM-DD format')
    .refine((val) => {
      const birth = new Date(val);
      if (isNaN(birth.getTime())) return false;
      const today = new Date();
      const min18YearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      return birth <= min18YearsAgo;
    }, 'Donor must be at least 18 years of age')
    .nullable()
    .optional(),
  age: z.coerce
    .number()
    .int()
    .min(18, 'Donor must be at least 18 years of age')
    .max(65, 'Maximum age for initial donation is 65 years')
    .nullable()
    .optional(),
  weightKg: z.coerce
    .number()
    .min(50.0, 'Donor must weigh at least 50 kg to donate blood')
    .max(250.0)
    .nullable()
    .optional(),
  districtCode: z.string().trim().min(1, 'District is required').max(20),
  dsCode: z.string().trim().max(20).nullable().optional(),
  gnCode: z.string().trim().max(20).nullable().optional(),
  town: z.string().trim().max(120).nullable().optional(),
  bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).nullable().optional(),
  availableForContact: z.boolean().default(false),
  campNotificationsOptIn: z.boolean().default(false),
  emergencyAppealOptIn: z.boolean().default(false),
  smsConsent: z.boolean().default(false),
  emailConsent: z.boolean().default(false),
}).refine(
  (data) => !data.confirmPassword || data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  },
);

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').transform((x) => x.toLowerCase()),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').transform((x) => x.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  password: z.string().min(10, 'Password must be at least 10 characters').max(128),
  confirmPassword: z.string().optional(),
}).refine(
  (data) => !data.confirmPassword || data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  },
);

export const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, 'Verification token is required'),
});

export const staffInviteSchema = z.object({
  email: z.string().trim().email('Invalid email address').transform((x) => x.toLowerCase()),
  role: z.enum(['HOSPITAL_STAFF', 'BANK_STAFF']),
  hospitalId: z.coerce.number().int().positive().nullable().optional(),
  bloodBankId: z.coerce.number().int().positive().nullable().optional(),
}).refine(
  (data) => {
    const hasHospital = data.hospitalId != null;
    const hasBank = data.bloodBankId != null;
    return (hasHospital && !hasBank) || (!hasHospital && hasBank);
  },
  {
    message: 'Staff invitation must specify either hospitalId or bloodBankId, not both',
    path: ['role'],
  },
);

export const acceptInviteSchema = z.object({
  token: z.string().trim().min(1, 'Invitation token is required'),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters').max(120),
  password: z.string().min(10, 'Password must be at least 10 characters').max(128),
  confirmPassword: z.string().optional(),
}).refine(
  (data) => !data.confirmPassword || data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  },
);
