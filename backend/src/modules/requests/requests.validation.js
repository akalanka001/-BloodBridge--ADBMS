import { z } from 'zod';

export const bloodRequestSchema = z.object({
  hospitalId: z.number().int().positive(),
  urgency: z.enum(['ROUTINE', 'URGENT', 'CRITICAL']),
  neededBy: z.string().refine((val) => {
    const d = Date.parse(val);
    return !isNaN(d) && /(?:Z|[+-]\d{2}:\d{2})$/.test(val) && new Date(val) > new Date();
  }, { message: 'neededBy must be a valid future datetime with a timezone' }),
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
  search: z.string().trim().max(200).optional(),
  bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).optional(),
  componentCode: z.enum(['RBC', 'PLASMA', 'PLATELETS']).optional(),
  fromDate: z.string().datetime({ offset: true }).optional(),
  toDate: z.string().datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

const geoCode = z.string().trim().min(1).max(40).optional();
export const hospitalContextSchema = z.object({ hospitalId: z.coerce.number().int().positive().optional() });
export const matchingSummarySchema = z.object({ requestItemId: z.string().uuid().optional() });
export const donorCandidatesSchema = hospitalContextSchema.extend({
  bloodTypeCode: z.enum(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']).optional(),
  provinceCode: geoCode, districtCode: geoCode, dsCode: geoCode, gnCode: geoCode,
  requestId: z.string().uuid().optional(), requestItemId: z.string().uuid().optional(),
}).superRefine((value, ctx) => {
  if (value.dsCode && !value.districtCode) ctx.addIssue({ code: 'custom', path: ['dsCode'], message: 'DS division requires its district' });
  if (value.gnCode && !value.dsCode) ctx.addIssue({ code: 'custom', path: ['gnCode'], message: 'GN division requires its DS division' });
  if (Boolean(value.requestId) !== Boolean(value.requestItemId)) ctx.addIssue({ code: 'custom', path: ['requestItemId'], message: 'Choose both request and request item' });
});

export const receiveFulfillmentSchema = z.object({
  receivedQuantity: z.number().int().positive(),
  conditionNotes: z.string().max(1000).optional(),
});
