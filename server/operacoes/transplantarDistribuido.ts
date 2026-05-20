import {
  contarPlantasMudasFv,
  perfisMudasParaLiberar,
  plantasPorPerfilMudas,
} from "@shared/plantasPorPerfil";
import { resolverFaseDestinoTransplantio, type FaseDestinoTransplantioFv } from "@shared/transplantioDestino";
import { variedadePulaVegetativa } from "@shared/variedadesFase";
import { TRPCError } from "@trpc/server";
import * as db from "../db";
import { syncPlanoFromTransplantio } from "../planoOperacaoSync";

export type TransplantarDistribuidoInput = {
  andarOrigemId: number;
  destinos: { andarDestinoId: number; quantidade: number }[];
  observacoes?: string;
  quantidadeDesperdicio?: number;
  motivoDesperdicio?: string;
  faseDestino?: FaseDestinoTransplantioFv;
  /** Se informado, só esses perfis/bandejas entram na origem (índice 0-based). */
  perfilIndicesOrigem?: number[];
};

export type TransplantarDistribuidoCtx = {
  projetoId: number;
  userId: number;
  userName: string;
};

async function plantasPorPerfilMudasDoAndar(
  projetoId: number,
  origemVariedadeId: number,
  origemPerfis: { ativo: boolean; receitaId?: number | null }[],
): Promise<number> {
  const comReceita = origemPerfis.find((p) => p.ativo && p.receitaId);
  if (comReceita?.receitaId) {
    const rec = await db.getReceitaById(projetoId, comReceita.receitaId);
    if (rec?.densidadePorPerfil && rec.densidadePorPerfil > 0) {
      return rec.densidadePorPerfil;
    }
  }
  const lista = await db.getReceitasByVariedadeId(projetoId, origemVariedadeId);
  const ativa = lista.find((r) => r.ativa) ?? lista[0];
  if (ativa?.densidadePorPerfil && ativa.densidadePorPerfil > 0) {
    return ativa.densidadePorPerfil;
  }
  return plantasPorPerfilMudas(null);
}

/** Transplantio distribuído — mesma regra do router `andares.transplantarDistribuido`. */
export async function runTransplantarDistribuido(
  ctx: TransplantarDistribuidoCtx,
  input: TransplantarDistribuidoInput,
) {
  const pid = ctx.projetoId;
  const origemAndar = await db.getAndarById(pid, input.andarOrigemId);
  if (!origemAndar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar de origem não encontrado" });
  const origemTorre = await db.getTorreById(pid, origemAndar.torreId);
  if (!origemTorre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre de origem não encontrada" });
  if (origemTorre.ativa === false) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Torre de origem desativada" });
  }

  const faseOrigem = origemTorre.fase;
  if (faseOrigem !== "mudas" && faseOrigem !== "vegetativa") {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível transplantar a partir desta fase" });
  }

  const totalSolicitado = input.destinos.reduce((s, d) => s + d.quantidade, 0);
  const quantidadeDesperdicio = Math.max(0, Math.floor(input.quantidadeDesperdicio ?? 0));
  const totalProcessado = totalSolicitado + quantidadeDesperdicio;
  const origemPerfis = await db.getPerfisByAndarId(pid, input.andarOrigemId);
  const origemFuros = await db.getFurosByAndarId(pid, input.andarOrigemId);
  const perfilIndicesOrigem = input.perfilIndicesOrigem?.length
    ? input.perfilIndicesOrigem
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .sort((a, b) => a - b)
    : null;

  const origemVariedadeId = (() => {
    if (perfilIndicesOrigem?.length) {
      const nosSelecionados = origemPerfis.filter((p) => perfilIndicesOrigem.includes(p.perfilIndex));
      return (
        nosSelecionados.find((p) => p.ativo && p.variedadeId)?.variedadeId ??
        nosSelecionados.find((p) => p.variedadeId)?.variedadeId ??
        null
      );
    }
    return (
      origemPerfis.find((p) => p.ativo && p.variedadeId)?.variedadeId ??
      origemPerfis.find((p) => p.variedadeId)?.variedadeId ??
      null
    );
  })();
  if (!origemVariedadeId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Origem sem variedade definida. Defina a variedade antes de transplantar.",
    });
  }
  const vRow = await db.getVariedadeById(pid, origemVariedadeId);
  if (!vRow) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Variedade da origem não encontrada no cadastro." });
  }

  const projeto = await db.getProjetoRow(pid);
  const isMicroverdes = projeto?.tipo === "microverdes";

  const pulaVeg = variedadePulaVegetativa(vRow.slug, vRow.nome);
  if (faseOrigem === "vegetativa" && input.faseDestino && input.faseDestino !== "maturacao") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A partir da vegetativa o destino é sempre maturação.",
    });
  }
  const faseDestino = resolverFaseDestinoTransplantio(faseOrigem, {
    pulaVegetativa: pulaVeg,
    faseDestinoInformada: input.faseDestino ?? null,
    projetoTipo: projeto?.tipo ?? null,
  });

  const plantasPorPerfilMudasVal =
    faseOrigem === "mudas"
      ? await plantasPorPerfilMudasDoAndar(pid, origemVariedadeId, origemPerfis)
      : 0;
  const plantasPorPerfilMudasEfetivo =
    faseOrigem === "mudas" && isMicroverdes ? 1 : plantasPorPerfilMudasVal;

  const perfisOrigemMudas = (() => {
    const ativos = origemPerfis.filter((p) => p.ativo);
    if (!perfilIndicesOrigem?.length) return ativos;
    return ativos.filter((p) => perfilIndicesOrigem.includes(p.perfilIndex));
  })();

  if (perfilIndicesOrigem?.length) {
    if (faseOrigem === "mudas") {
      const inativos = perfilIndicesOrigem.filter(
        (idx) => !origemPerfis.some((p) => p.perfilIndex === idx && p.ativo),
      );
      if (inativos.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Perfil(is) de origem inativo(s) ou inexistente(s): ${inativos.map((i) => i + 1).join(", ")}.`,
        });
      }
    } else {
      const semPlanta = perfilIndicesOrigem.filter(
        (idx) => !origemFuros.some((f) => f.perfilIndex === idx && f.status === "plantado"),
      );
      if (semPlanta.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Perfil(is) sem plantas na origem: ${semPlanta.map((i) => i + 1).join(", ")}.`,
        });
      }
    }
  }

  const origemDisponivel =
    faseOrigem === "mudas"
      ? contarPlantasMudasFv(perfisOrigemMudas.length, plantasPorPerfilMudasEfetivo)
      : perfilIndicesOrigem?.length
        ? origemFuros.filter(
            (f) => f.status === "plantado" && perfilIndicesOrigem.includes(f.perfilIndex),
          ).length
        : origemFuros.filter((f) => f.status === "plantado").length;

  if (totalProcessado > origemDisponivel) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Quantidade processada (${totalProcessado}) maior que disponível na origem (${origemDisponivel}).`,
    });
  }
  if (totalProcessado <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Informe ao menos uma quantidade para transplantar ou descartar.",
    });
  }

  for (const d of input.destinos) {
    const destAndar = await db.getAndarById(pid, d.andarDestinoId);
    if (!destAndar) throw new TRPCError({ code: "NOT_FOUND", message: "Andar destino não encontrado" });
    const destTorre = await db.getTorreById(pid, destAndar.torreId);
    if (!destTorre) throw new TRPCError({ code: "NOT_FOUND", message: "Torre destino não encontrada" });
    if (destTorre.ativa === false) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Torre destino desativada" });
    }
    if (destTorre.fase !== faseDestino) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Destino deve estar na próxima fase (não pode ser a mesma fase)." });
    }
    const destPerfis = await db.getPerfisByAndarId(pid, d.andarDestinoId);
    const destFuros = await db.getFurosByAndarId(pid, d.andarDestinoId);
    const nVazios =
      destFuros.length > 0
        ? destFuros.filter((f) => f.status === "vazio").length
        : destPerfis.filter((p) => !p.ativo).length;
    if (d.quantidade > nVazios) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Destino sem furos vazios suficientes: andar ${destAndar.numero ?? destAndar.id} (${nVazios} vazios, solicitado ${d.quantidade}).`,
      });
    }
  }

  const variedadeNome = vRow.nome || String(origemVariedadeId);

  for (const d of input.destinos) {
    const destAndar = await db.getAndarById(pid, d.andarDestinoId);
    const destTorre = destAndar ? await db.getTorreById(pid, destAndar.torreId) : null;
    if (!destAndar || !destTorre) continue;

    const destFuros = await db.getFurosByAndarId(pid, d.andarDestinoId);
    const vazios = destFuros.filter((f) => f.status === "vazio").slice(0, d.quantidade);
    await db.batchUpdateFuros(
      pid,
      d.andarDestinoId,
      vazios.map((f) => ({
        perfilIndex: f.perfilIndex,
        furoIndex: f.furoIndex,
        status: "plantado",
        variedadeId: origemVariedadeId,
      })),
    );

    const perfisAfetados = Array.from(new Set(vazios.map((f) => f.perfilIndex)));
    await db.batchUpdatePerfis(
      pid,
      d.andarDestinoId,
      perfisAfetados.map((perfilIndex) => ({
        perfilIndex,
        ativo: true,
        variedadeId: origemVariedadeId,
      })),
    );

    if (!destAndar.dataEntrada) {
      await db.updateAndar(pid, d.andarDestinoId, { dataEntrada: new Date() });
    }

    await db.createTransplantio({
      projetoId: pid,
      dataHora: new Date(),
      torreOrigemId: origemTorre.id,
      andarOrigemId: origemAndar.id,
      faseOrigem,
      faseDestino,
      variedadeId: origemVariedadeId,
      variedadeNome,
      quantidadeTransplantada: d.quantidade,
      quantidadeDesperdicio: 0,
      torreDestinoId: destTorre.id,
      andarDestinoId: d.andarDestinoId,
      observacoes: input.observacoes ?? null,
      executadoPorId: ctx.userId,
      executadoPorNome: ctx.userName,
    });
  }

  if (quantidadeDesperdicio > 0) {
    await db.createTransplantio({
      projetoId: pid,
      dataHora: new Date(),
      torreOrigemId: origemTorre.id,
      andarOrigemId: origemAndar.id,
      faseOrigem,
      faseDestino,
      variedadeId: origemVariedadeId,
      variedadeNome,
      quantidadeTransplantada: 0,
      quantidadeDesperdicio,
      motivoDesperdicio: input.motivoDesperdicio?.trim() || "descarte_no_transplantio",
      torreDestinoId: null,
      andarDestinoId: null,
      observacoes: input.observacoes ?? null,
      executadoPorId: ctx.userId,
      executadoPorNome: ctx.userName,
    });
  }

  if (faseOrigem === "mudas") {
    const pool = perfilIndicesOrigem?.length
      ? perfisOrigemMudas.sort((a, b) => a.perfilIndex - b.perfilIndex)
      : origemPerfis.filter((p) => p.ativo).sort((a, b) => a.perfilIndex - b.perfilIndex);
    const nPerfisLiberar = perfisMudasParaLiberar(totalProcessado, plantasPorPerfilMudasEfetivo);
    const ativos = pool.slice(0, nPerfisLiberar);
    const esperado = contarPlantasMudasFv(ativos.length, plantasPorPerfilMudasEfetivo);
    if (perfilIndicesOrigem?.length && totalProcessado !== esperado) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Para os perfis selecionados, distribua e/ou descarte exatamente ${esperado} (você informou ${totalProcessado}).`,
      });
    }
    await db.batchUpdatePerfis(
      pid,
      input.andarOrigemId,
      ativos.map((p) => ({
        perfilIndex: p.perfilIndex,
        ativo: false,
        variedadeId: null,
        dataEntrada: null,
      })),
    );
  } else {
    const plantados = origemFuros
      .filter(
        (f) =>
          f.status === "plantado" &&
          (!perfilIndicesOrigem?.length || perfilIndicesOrigem.includes(f.perfilIndex)),
      )
      .sort((a, b) => (b.perfilIndex - a.perfilIndex) || (b.furoIndex - a.furoIndex))
      .slice(0, totalProcessado);
    await db.batchUpdateFuros(
      pid,
      input.andarOrigemId,
      plantados.map((f) => ({
        perfilIndex: f.perfilIndex,
        furoIndex: f.furoIndex,
        status: "vazio",
        variedadeId: null,
      })),
    );

    const furosPos = await db.getFurosByAndarId(pid, input.andarOrigemId);
    const perfisPos = await db.getPerfisByAndarId(pid, input.andarOrigemId);
    const perfisComPlanta = new Set<number>(furosPos.filter((f) => f.status === "plantado").map((f) => f.perfilIndex));
    const perfisParaLimpar = perfisPos
      .filter((p) => p.ativo && !perfisComPlanta.has(p.perfilIndex))
      .map((p) => ({
        perfilIndex: p.perfilIndex,
        ativo: false,
        variedadeId: null,
        dataEntrada: null,
      }));
    if (perfisParaLimpar.length > 0) {
      await db.batchUpdatePerfis(pid, input.andarOrigemId, perfisParaLimpar);
    }
    if (perfisComPlanta.size === 0) {
      await db.updateAndar(pid, input.andarOrigemId, { dataEntrada: null });
    }
  }

  if (totalSolicitado > 0) {
    await syncPlanoFromTransplantio(pid, origemVariedadeId, faseOrigem, faseDestino, totalSolicitado);
  }

  return { success: true as const, total: totalSolicitado, desperdicio: quantidadeDesperdicio, faseOrigem, faseDestino };
}
