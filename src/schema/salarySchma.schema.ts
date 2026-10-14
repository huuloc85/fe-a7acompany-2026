import { z } from 'zod';

import { defaultModelSchema, overrideSchema } from './defaultModel.schema';
import { employeeSchema } from './employeeSchema.schema';

export const salarySchema = defaultModelSchema.extend({
  title: z.string(),
  status: z.enum(['draft', 'published']).optional(),
  revision: z.number().optional(),
  calculator_key: z.string().nullable().optional(),
  published_at: z.string().nullable().optional(),
  total: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  date_show: z.string(),
  employee: employeeSchema.optional()
});

export const salaryCreateSchema = overrideSchema(salarySchema).omit({
  employee: true
});
