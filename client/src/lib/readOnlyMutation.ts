import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { VISITOR_READONLY_MSG } from "@shared/const";

/** Bloqueia mutação no cliente para perfil visitante (espelha o middleware tRPC). */
export function wrapReadOnlyMutation<TData, TError, TVariables, TContext>(
  mutation: UseMutationResult<TData, TError, TVariables, TContext>,
  isReadOnly: boolean,
): UseMutationResult<TData, TError, TVariables, TContext> {
  if (!isReadOnly) return mutation;
  return {
    ...mutation,
    mutate: (() => {
      toast.error(VISITOR_READONLY_MSG);
    }) as typeof mutation.mutate,
    mutateAsync: (async () => {
      toast.error(VISITOR_READONLY_MSG);
      throw new Error("FORBIDDEN");
    }) as typeof mutation.mutateAsync,
  };
}
