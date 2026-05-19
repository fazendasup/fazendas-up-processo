import { z } from "zod";

export const paginationInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const periodoFiltroSchema = z.object({
  inicio: z.coerce.date(),
  fim: z.coerce.date(),
});

export type PeriodoFiltro = z.infer<typeof periodoFiltroSchema>;
