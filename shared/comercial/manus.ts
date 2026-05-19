import { z } from "zod";

export const manusResumoConversaInputSchema = z.object({
  clienteId: z.string(),
  textoBruto: z.string().min(1),
});

export const manusSugestaoCriativaInputSchema = z.object({
  clienteId: z.string(),
  contextoEstruturado: z.record(z.string(), z.unknown()).optional(),
  objetivo: z.enum(["upsell", "cross_sell", "reativacao", "pos_venda"]),
});

export const manusAjusteScoreInputSchema = z.object({
  clienteId: z.string(),
  scoreBaseApi: z.number().min(0).max(100),
  sinaisQualitativos: z.string().min(1),
});
