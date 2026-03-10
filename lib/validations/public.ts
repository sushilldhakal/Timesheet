import { z } from 'zod';

// Public Locations Response Schema
export const publicLocationsResponseSchema = z.object({
  locations: z.array(z.object({
    _id: z.string(),
    id: z.string(),
    name: z.string()
  })),
  count: z.number()
});