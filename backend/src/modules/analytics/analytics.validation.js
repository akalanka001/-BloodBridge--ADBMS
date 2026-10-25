import { z } from 'zod';

export const analyticsFilterSchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  period: z.enum(['6', '12']).optional(),
  district: z.string().max(10).optional(),
  bloodGroup: z.enum(['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-']).optional(),
  component: z.enum(['RBC', 'PLASMA', 'PLATELETS']).optional(),
  urgency: z.enum(['ROUTINE', 'URGENT', 'CRITICAL']).optional(),
  hospitalId: z.coerce.number().optional(),
  bloodBankId: z.coerce.number().optional(),
  interval: z.enum(['day', 'month', 'year']).optional(),
  format: z.enum(['json', 'csv']).optional(),
});

export const etlTriggerSchema = z.object({
  jobName: z.string().min(1).max(100).optional(),
  loadMode: z.enum(['FULL', 'INCREMENTAL']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const benchmarkRunSchema = z.object({
  experimentId: z.enum([
    'EXP-01-COMPOSITE-GEO',
    'EXP-02-PARTIAL-INDEX',
    'EXP-03-HASH-VS-BTREE',
    'EXP-04-OLAP-STAR-JOIN',
    'EXP-05-CLUSTER-PHYSICAL',
  ]),
  repetitionCount: z.coerce.number().min(1).max(10).optional(),
  datasetSize: z.string().optional(),
});
