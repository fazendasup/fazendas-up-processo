// ============================================================
// Fazendas Up — Motor de Inteligência Acionável
// Analisa dados operacionais e gera alertas/recomendações
// ============================================================

import type {
  IntelligentAlert,
  InsertIntelligentAlert,
  RecommendationRule,
} from "../drizzle/schema";
import * as crypto from "crypto";
import { variedadePulaVegetativa } from "../shared/variedadesFase";

// ---- Tipos internos ----

export interface FazendaSnapshot {
  torres: any[];
  andares: any[];
  perfis: any[];
  furos: any[];
  variedades: any[];
  caixasAgua: any[];
  medicoesCaixa: any[];
  aplicacoesCaixa: any[];
  aplicacoesAndar: any[];
  germinacao: any[];
  transplantios: any[];
  manutencoes: any[];
  ciclos: any[];
  tarefas: any[];
  fasesConfig: any[];
  receitas: any[];
  registrosColheita: any[];
  planosPlantio: any[];
  /** Tipo do projeto ("fazenda_vertical" | "microverdes" | "hidroponia"). */
  projetoTipo?: string | null;
  /** Hidroponia: unidades operacionais (bancadas) e últimas medições por bancada. */
  bancadas?: any[];
  medicoesBancada?: any[];
}

/** Nome da unidade alvo de uma manutenção: bancada (hidroponia) ou torre (FV/microverdes). */
function nomeUnidadeManutencao(
  m: any,
  torresMap: Map<any, any>,
  bancadasMap: Map<any, any>,
): { nome: string; entidadeTipo: "bancada" | "torre"; fase?: string } {
  if (m.bancadaId != null) {
    const b = bancadasMap.get(m.bancadaId);
    return { nome: b?.nome || "Bancada", entidadeTipo: "bancada", fase: b?.fase };
  }
  const t = torresMap.get(m.torreId);
  return { nome: t?.nome || "Torre", entidadeTipo: "torre", fase: t?.fase };
}

const FAIXAS_FASE_HIDRO: Record<string, { ecMin: number; ecMax: number; phMin: number; phMax: number }> = {
  mudas: { ecMin: 1.0, ecMax: 1.2, phMin: 5.8, phMax: 6.2 },
  vegetativa: { ecMin: 1.5, ecMax: 2.0, phMin: 5.5, phMax: 6.5 },
  maturacao: { ecMin: 2.0, ecMax: 2.5, phMin: 5.8, phMax: 6.2 },
};

export interface AlertCandidate {
  tipo: string;
  severidade: "baixa" | "media" | "alta" | "critica";
  prioridade: "baixa" | "media" | "alta" | "urgente";
  titulo: string;
  descricao: string;
  entidadeTipo?: string;
  entidadeId?: number;
  entidadeNome?: string;
  fase?: string;
  origem: string;
  ruleId?: number;
  dadosSnapshot?: any;
  sugestaoAcao: string;
  nivelConfianca: "alta" | "media" | "baixa";
  gerarTarefa: boolean;
  hashUnico: string;
}

function gerarHash(tipo: string, entidadeTipo: string, entidadeId: number | undefined, extra: string = ""): string {
  const raw = `${tipo}:${entidadeTipo}:${entidadeId || 0}:${extra}`;
  return crypto.createHash("md5").update(raw).digest("hex");
}

function diasEntre(d1: Date, d2: Date): number {
  const ms = d2.getTime() - d1.getTime();
  return Math.floor(ms / 86400000);
}

function toDateStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// ============================================================
// ALERTA: Medição atrasada (Caixa d'água)
// ============================================================
function avaliarMedicaoAtrasada(data: FazendaSnapshot, hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];
  const caixasMap = new Map((data.caixasAgua || []).map((c: any) => [c.id, c]));

  // última medição por caixa
  const ultimaPorCaixa = new Map<number, any>();
  for (const m of data.medicoesCaixa || []) {
    if (!m.caixaAguaId || !m.dataHora) continue;
    const prev = ultimaPorCaixa.get(m.caixaAguaId);
    if (!prev || new Date(m.dataHora) > new Date(prev.dataHora)) {
      ultimaPorCaixa.set(m.caixaAguaId, m);
    }
  }

  for (const [caixaId, caixa] of Array.from(caixasMap)) {
    const ultima = ultimaPorCaixa.get(caixaId);
    if (!ultima?.dataHora) {
      // Sem medição nenhuma registrada
      alertas.push({
        tipo: "medicao_atrasada",
        severidade: "alta",
        prioridade: "alta",
        titulo: `Medição pendente: ${caixa.nome}`,
        descricao: `Nenhuma medição registrada ainda para ${caixa.nome} (fase ${caixa.fase}).`,
        entidadeTipo: "caixa_agua",
        entidadeId: caixaId,
        entidadeNome: caixa.nome,
        fase: caixa.fase,
        origem: "motor_regras",
        sugestaoAcao: "Registrar medição de EC/pH agora.",
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: { ultimaMedicao: null },
        hashUnico: gerarHash("medicao_atrasada", "caixa_agua", caixaId, "sem_medicao"),
      });
      continue;
    }

    const dias = diasEntre(toDateStart(new Date(ultima.dataHora)), hoje);
    if (dias > 2) {
      const severidade = dias > 5 ? "critica" : dias > 3 ? "alta" : "media";
      const prioridade = dias > 5 ? "urgente" : dias > 3 ? "alta" : "media";
      alertas.push({
        tipo: "medicao_atrasada",
        severidade,
        prioridade,
        titulo: `Medição atrasada: ${caixa.nome} (${dias}d)`,
        descricao: `${caixa.nome} (fase ${caixa.fase}) está sem medição há ${dias} dia(s). Última medição: ${new Date(
          ultima.dataHora
        ).toLocaleDateString("pt-BR")}.`,
        entidadeTipo: "caixa_agua",
        entidadeId: caixaId,
        entidadeNome: caixa.nome,
        fase: caixa.fase,
        origem: "motor_regras",
        sugestaoAcao: "Registrar EC/pH agora e corrigir solução se necessário.",
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: { diasSemMedir: dias, ultimaMedicao: ultima.dataHora },
        hashUnico: gerarHash("medicao_atrasada", "caixa_agua", caixaId, String(dias)),
      });
    }
  }
  return alertas;
}

// ============================================================
// ALERTA: Colheita atrasada (crítico)
// ============================================================
function avaliarColheitaAtrasada(data: FazendaSnapshot, hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];
  const varMap = new Map((data.variedades || []).map((v: any) => [v.id, v]));
  const torresMap = new Map((data.torres || []).map((t: any) => [t.id, t]));
  const andaresMap = new Map((data.andares || []).map((a: any) => [a.id, a]));

  for (const perfil of (data.perfis || []).filter((p: any) => p.ativo && p.variedadeId)) {
    const andar = andaresMap.get(perfil.andarId);
    if (!andar) continue;
    const torre = torresMap.get(andar.torreId);
    if (!torre || torre.fase !== "maturacao") continue;
    const variedade = varMap.get(perfil.variedadeId);
    if (!variedade) continue;

    const dataEntrada = perfil.dataEntrada || andar.dataEntrada;
    if (!dataEntrada) continue;

    const entrada = toDateStart(new Date(dataEntrada));
    const diasPassados = diasEntre(entrada, hoje);
    const diasFase = variedade.diasMaturacao;
    if (!diasFase || diasFase <= 0) continue;

    const diasAtraso = diasPassados - diasFase;
    if (diasAtraso >= 3) {
      alertas.push({
        tipo: "colheita_atrasada",
        severidade: diasAtraso >= 7 ? "critica" : "alta",
        prioridade: "urgente",
        titulo: `Colheita atrasada: ${torre.nome} A${andar.numero} P${perfil.perfilIndex + 1}`,
        descricao: `${variedade.nome} está pronta para colheita há ${diasAtraso} dia(s). Risco de perder qualidade/produção.`,
        entidadeTipo: "andar",
        entidadeId: andar.id,
        entidadeNome: `${torre.nome} — Andar ${andar.numero}`,
        fase: "maturacao",
        origem: "motor_regras",
        sugestaoAcao: "Colher HOJE e registrar colheita.",
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: { diasAtraso, diasFase, diasPassados, variedade: variedade.nome },
        hashUnico: gerarHash("colheita_atrasada", "perfil", perfil.id, `${andar.id}`),
      });
    }
  }

  return alertas;
}

// ============================================================
// ALERTA: Manutenção vencida (prazo passado)
// ============================================================
function avaliarManutencaoVencida(data: FazendaSnapshot, hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];
  const torresMap = new Map((data.torres || []).map((t: any) => [t.id, t]));
  const bancadasMap = new Map((data.bancadas || []).map((b: any) => [b.id, b]));

  for (const m of (data.manutencoes || []).filter((x: any) => x.status === "aberta" && x.prazo)) {
    const prazo = toDateStart(new Date(m.prazo));
    const diasVencido = diasEntre(prazo, hoje);
    if (diasVencido >= 1) {
      const unidade = nomeUnidadeManutencao(m, torresMap, bancadasMap);
      alertas.push({
        tipo: "manutencao_vencida",
        severidade: diasVencido >= 7 ? "critica" : diasVencido >= 3 ? "alta" : "media",
        prioridade: diasVencido >= 7 ? "urgente" : "alta",
        titulo: `Manutenção vencida: ${m.tipo} — ${unidade.nome}`,
        descricao: `Manutenção "${m.tipo}" está vencida há ${diasVencido} dia(s).`,
        entidadeTipo: "manutencao",
        entidadeId: m.id,
        entidadeNome: `${m.tipo} — ${unidade.nome}`,
        fase: unidade.fase,
        origem: "motor_regras",
        sugestaoAcao: "Executar manutenção e registrar resolução.",
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: { diasVencido, prazo: m.prazo },
        hashUnico: gerarHash("manutencao_vencida", "manutencao", m.id, String(diasVencido)),
      });
    }
  }
  return alertas;
}

/** Inclui lotes “virtuais” da germinação dos planos de plantio no mesmo array usado pelas regras legado. */
function mergeGerminacaoDesdePlanos(data: FazendaSnapshot): FazendaSnapshot {
  const receitaById = new Map((data.receitas || []).map((r: any) => [r.id, r]));
  const virtual = (data.planosPlantio || [])
    .filter((p: any) => (p.status === "planejado" || p.status === "em_germinacao"))
    .map((p: any) => {
      const receita = receitaById.get(p.receitaId);
      const diasGerm = receita?.diasGerminacao ?? 5;
      const dataInicio = p.dataInicioGerminacao ? new Date(p.dataInicioGerminacao) : new Date();
      const fase = p.germinacaoFase || "pendente";
      const status = fase === "pronto_mudas" ? "pronto" : "germinando";
      return {
        id: -(Math.abs(Number(p.id)) + 1),
        variedadeId: p.variedadeId,
        variedadeNome: p.variedadeNome,
        quantidade: p.quantidadePlantas,
        germinadas: p.germinadas ?? 0,
        naoGerminadas: p.naoGerminadas ?? 0,
        dataPlantio: dataInicio,
        dataHora: dataInicio,
        diasParaTransplantio: diasGerm,
        status,
        observacoes: p.observacoes ?? null,
      };
    });

  return {
    ...data,
    germinacao: [...(data.germinacao || []), ...virtual],
  };
}

// ============================================================
// REGRA 1: Risco de Atraso
// ============================================================
function avaliarRiscoAtraso(data: FazendaSnapshot, hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];
  const varMap = new Map(data.variedades.map((v: any) => [v.id, v]));
  const torresMap = new Map(data.torres.map((t: any) => [t.id, t]));
  const andaresMap = new Map(data.andares.map((a: any) => [a.id, a]));

  // 1a. Perfis com transplantio/colheita atrasados
  for (const perfil of data.perfis.filter((p: any) => p.ativo && p.variedadeId)) {
    const andar = andaresMap.get(perfil.andarId);
    if (!andar) continue;
    const torre = torresMap.get(andar.torreId);
    if (!torre) continue;
    const variedade = varMap.get(perfil.variedadeId);
    if (!variedade) continue;

    const dataEntrada = perfil.dataEntrada || andar.dataEntrada;
    if (!dataEntrada) continue;

    const entrada = new Date(dataEntrada);
    entrada.setHours(0, 0, 0, 0);
    const diasPassados = diasEntre(entrada, hoje);

    const pulaVeg = variedadePulaVegetativa(variedade.slug, variedade.nome);
    let diasFase = 0;
    if (torre.fase === "mudas") diasFase = variedade.diasMudas;
    else if (torre.fase === "vegetativa") {
      if (pulaVeg) continue;
      diasFase = variedade.diasVegetativa;
    } else if (torre.fase === "maturacao") diasFase = variedade.diasMaturacao;

    if (diasFase <= 0) continue;

    const diasAtraso = diasPassados - diasFase;
    if (diasAtraso >= 1) {
      const acao = torre.fase === "maturacao" ? "colheita" : "transplantio";
      const severidade = diasAtraso >= 7 ? "critica" : diasAtraso >= 3 ? "alta" : "media";
      const prioridade = diasAtraso >= 7 ? "urgente" : diasAtraso >= 3 ? "alta" : "media";

      alertas.push({
        tipo: "risco_atraso",
        severidade,
        prioridade,
        titulo: `Atraso de ${acao}: ${torre.nome} A${andar.numero} P${perfil.perfilIndex + 1}`,
        descricao: `${variedade.nome} está ${diasAtraso} dia(s) atrasado(a) para ${acao}. Data de entrada: ${entrada.toLocaleDateString("pt-BR")}. Dias previstos: ${diasFase}, dias passados: ${diasPassados}.`,
        entidadeTipo: "andar",
        entidadeId: andar.id,
        entidadeNome: `${torre.nome} — Andar ${andar.numero}`,
        fase: torre.fase,
        origem: "motor_regras",
        sugestaoAcao: `Realizar ${acao} imediatamente. Perfil P${perfil.perfilIndex + 1} com ${variedade.nome}.`,
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: { diasAtraso, diasFase, diasPassados, variedade: variedade.nome, perfilIndex: perfil.perfilIndex },
        hashUnico: gerarHash("risco_atraso", "perfil", perfil.id, `${torre.fase}`),
      });
    }
  }

  // 1b. Manutenções com prazo vencido
  for (const m of data.manutencoes.filter((m: any) => m.status === "aberta" && m.prazo)) {
    const prazo = new Date(m.prazo);
    const diasAtraso = diasEntre(prazo, hoje);
    if (diasAtraso >= 1) {
      const torre = torresMap.get(m.torreId);
      const severidade = diasAtraso >= 7 ? "critica" : diasAtraso >= 3 ? "alta" : "media";
      alertas.push({
        tipo: "risco_atraso",
        severidade,
        prioridade: severidade === "critica" ? "urgente" : "alta",
        titulo: `Manutenção atrasada: ${m.tipo} — ${torre?.nome || "Torre"}`,
        descricao: `Manutenção "${m.tipo}" aberta há ${diasAtraso} dia(s) além do prazo. Descrição: ${m.descricao}.`,
        entidadeTipo: "manutencao",
        entidadeId: m.id,
        entidadeNome: `${m.tipo} — ${torre?.nome || "Torre"}`,
        fase: torre?.fase,
        origem: "motor_regras",
        sugestaoAcao: `Concluir manutenção "${m.tipo}" com urgência.`,
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: { diasAtraso, tipo: m.tipo },
        hashUnico: gerarHash("risco_atraso_manut", "manutencao", m.id),
      });
    }
  }

  // 1c. Ciclos não executados no prazo
  for (const ciclo of data.ciclos.filter((c: any) => c.ativo)) {
    let diasAtraso = 0;
    if (!ciclo.ultimaExecucao) {
      diasAtraso = 3; // Nunca executado — considerar atraso moderado
    } else {
      const ultima = new Date(ciclo.ultimaExecucao);
      if (ciclo.frequencia === "diario") {
        diasAtraso = diasEntre(ultima, hoje);
        if (diasAtraso < 2) continue; // Tolerância de 1 dia
      } else if (ciclo.frequencia === "intervalo" && ciclo.intervaloDias) {
        const esperado = diasEntre(ultima, hoje);
        diasAtraso = esperado - ciclo.intervaloDias;
        if (diasAtraso < 1) continue;
      } else {
        continue;
      }
    }

    if (diasAtraso >= 1) {
      alertas.push({
        tipo: "risco_atraso",
        severidade: diasAtraso >= 5 ? "alta" : "media",
        prioridade: diasAtraso >= 5 ? "alta" : "media",
        titulo: `Ciclo atrasado: ${ciclo.nome}`,
        descricao: `Ciclo "${ciclo.nome}" (${ciclo.produto}) está ${diasAtraso} dia(s) sem execução. Frequência: ${ciclo.frequencia}.`,
        entidadeTipo: "ciclo",
        entidadeId: ciclo.id,
        entidadeNome: ciclo.nome,
        origem: "motor_regras",
        sugestaoAcao: `Executar ciclo "${ciclo.nome}" — aplicar ${ciclo.produto}.`,
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: { diasAtraso, frequencia: ciclo.frequencia },
        hashUnico: gerarHash("risco_atraso_ciclo", "ciclo", ciclo.id),
      });
    }
  }

  return alertas;
}

// ============================================================
// REGRA 2: Torre Subutilizada
// ============================================================
function avaliarTorreSubutilizada(data: FazendaSnapshot, _hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];
  const LIMIAR_OCUPACAO = 30; // abaixo de 30% é subutilizada

  for (const torre of data.torres) {
    const andaresTorre = data.andares.filter((a: any) => a.torreId === torre.id);
    if (andaresTorre.length === 0) continue;

    const perfisAtivos = data.perfis.filter(
      (p: any) => p.ativo && andaresTorre.some((a: any) => a.id === p.andarId)
    );
    const totalPerfis = data.perfis.filter(
      (p: any) => andaresTorre.some((a: any) => a.id === p.andarId)
    ).length;

    if (totalPerfis === 0) continue;

    const ocupacao = Math.round((perfisAtivos.length / totalPerfis) * 100);

    if (ocupacao < LIMIAR_OCUPACAO) {
      const andaresVazios = andaresTorre.filter((a: any) => {
        const perfisAndar = data.perfis.filter((p: any) => p.andarId === a.id && p.ativo);
        return perfisAndar.length === 0;
      }).length;

      alertas.push({
        tipo: "torre_subutilizada",
        severidade: ocupacao === 0 ? "alta" : "media",
        prioridade: ocupacao === 0 ? "alta" : "media",
        titulo: `Torre subutilizada: ${torre.nome} (${ocupacao}%)`,
        descricao: `${torre.nome} (fase ${torre.fase}) está com apenas ${ocupacao}% de ocupação. ${andaresVazios} de ${andaresTorre.length} andares estão completamente vazios. Capacidade ociosa: ${totalPerfis - perfisAtivos.length} perfis.`,
        entidadeTipo: "torre",
        entidadeId: torre.id,
        entidadeNome: torre.nome,
        fase: torre.fase,
        origem: "motor_regras",
        sugestaoAcao: `Avaliar alocação de novos lotes para ${torre.nome}. Verificar se há lotes em germinação ou andares prontos para receber plantas.`,
        nivelConfianca: "alta",
        gerarTarefa: false,
        dadosSnapshot: { ocupacao, andaresVazios, totalAndares: andaresTorre.length, perfisAtivos: perfisAtivos.length, totalPerfis },
        hashUnico: gerarHash("torre_subutilizada", "torre", torre.id),
      });
    }
  }

  return alertas;
}

// ============================================================
// REGRA 3: Lote Fora do Padrão
// ============================================================
function avaliarLoteForaPadrao(data: FazendaSnapshot, _hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];

  // 3a. Germinação com taxa abaixo do esperado
  for (const lote of data.germinacao.filter((g: any) => g.status === "germinando" || g.status === "pronto")) {
    const total = lote.quantidade;
    const germinadas = lote.germinadas || 0;
    const naoGerminadas = lote.naoGerminadas || 0;
    const avaliadas = germinadas + naoGerminadas;

    if (avaliadas > 0 && total > 0) {
      const taxaGerminacao = Math.round((germinadas / avaliadas) * 100);
      if (taxaGerminacao < 70) {
        alertas.push({
          tipo: "lote_fora_padrao",
          severidade: taxaGerminacao < 50 ? "alta" : "media",
          prioridade: taxaGerminacao < 50 ? "alta" : "media",
          titulo: `Germinação baixa: ${lote.variedadeNome} (${taxaGerminacao}%)`,
          descricao: `Lote de ${lote.variedadeNome} com taxa de germinação de ${taxaGerminacao}% (${germinadas}/${avaliadas}). Esperado: acima de 70%. Quantidade plantada: ${total}.`,
          entidadeTipo: "germinacao",
          entidadeId: lote.id,
          entidadeNome: `Lote ${lote.variedadeNome}`,
          origem: "motor_regras",
          sugestaoAcao: `Verificar condições de germinação (temperatura, umidade, qualidade das sementes). Considerar replantio se taxa não melhorar.`,
          nivelConfianca: avaliadas >= total * 0.5 ? "alta" : "media",
          gerarTarefa: false,
          dadosSnapshot: { taxaGerminacao, germinadas, naoGerminadas, total },
          hashUnico: gerarHash("lote_germinacao", "germinacao", lote.id),
        });
      }
    }
  }

  // 3b. Transplantios com desperdício alto
  for (const t of data.transplantios) {
    const total = t.quantidadeTransplantada + t.quantidadeDesperdicio;
    if (total > 0 && t.quantidadeDesperdicio > 0) {
      const taxaDesperdicio = Math.round((t.quantidadeDesperdicio / total) * 100);
      if (taxaDesperdicio > 15) {
        alertas.push({
          // Tipo próprio para não confundir com “lote fora do padrão” (germinação).
          tipo: "desperdicio_alto",
          severidade: taxaDesperdicio > 30 ? "alta" : "media",
          prioridade: taxaDesperdicio > 30 ? "alta" : "media",
          titulo: `Desperdício alto em transplantio: ${t.variedadeNome} (${taxaDesperdicio}%)`,
          descricao: `Transplantio de ${t.variedadeNome} (${t.faseOrigem}→${t.faseDestino}) com ${taxaDesperdicio}% de desperdício (${t.quantidadeDesperdicio} de ${total}). Motivo: ${t.motivoDesperdicio || "não informado"}.`,
          entidadeTipo: "torre",
          entidadeId: t.torreDestinoId,
          entidadeNome: `Transplantio ${t.variedadeNome}`,
          origem: "motor_regras",
          sugestaoAcao: `Investigar causa do desperdício. Verificar manuseio, condições da torre de destino e saúde das plantas.`,
          nivelConfianca: "alta",
          gerarTarefa: false,
          dadosSnapshot: { taxaDesperdicio, desperdicio: t.quantidadeDesperdicio, total },
          hashUnico: gerarHash("desperdicio_alto", "transplantio", t.id),
        });
      }
    }
  }

  return alertas;
}

// ============================================================
// REGRA 4: Manutenção Crítica
// ============================================================
function avaliarManutencaoCritica(data: FazendaSnapshot, hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];
  const torresMap = new Map(data.torres.map((t: any) => [t.id, t]));
  const bancadasMap = new Map((data.bancadas || []).map((b: any) => [b.id, b]));

  // 4a. Manutenções abertas em itens críticos
  const tiposCriticos = ["vazamento_tubo_injetor", "bomba_defeito", "sistema_irrigacao", "falha_eletrica", "bomba", "vazamento", "eletrica"];
  for (const m of data.manutencoes.filter((m: any) => m.status === "aberta")) {
    const isCritico = tiposCriticos.some((tc) => m.tipo.toLowerCase().includes(tc.replaceAll("_", " ")) || m.tipo.toLowerCase().includes(tc));
    if (!isCritico && !m.prazo) continue;

    const unidade = nomeUnidadeManutencao(m, torresMap, bancadasMap);
    let diasAberta = 0;
    if (m.dataAbertura) {
      diasAberta = diasEntre(new Date(m.dataAbertura), hoje);
    }

    if (isCritico || diasAberta > 5) {
      alertas.push({
        tipo: "manutencao_critica",
        severidade: isCritico ? "critica" : "alta",
        prioridade: isCritico ? "urgente" : "alta",
        titulo: `Manutenção crítica: ${m.tipo} — ${unidade.nome}`,
        descricao: `Manutenção "${m.tipo}" aberta há ${diasAberta} dia(s) em ${unidade.nome}${m.andarNumero ? ` A${m.andarNumero}` : ""}. ${isCritico ? "Tipo classificado como crítico para operação." : "Tempo de resolução acima do esperado."}`,
        entidadeTipo: "manutencao",
        entidadeId: m.id,
        entidadeNome: `${m.tipo} — ${unidade.nome}`,
        fase: unidade.fase,
        origem: "motor_regras",
        sugestaoAcao: `Priorizar resolução imediata. ${isCritico ? "Verificar impacto na irrigação e produção." : "Avaliar se está bloqueando operação."}`,
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: { diasAberta, isCritico, tipo: m.tipo },
        hashUnico: gerarHash("manutencao_critica", "manutencao", m.id),
      });
    }
  }

  // 4b. Manutenções recorrentes na mesma unidade (torre ou bancada)
  const manutPorUnidade = new Map<string, any[]>();
  for (const m of data.manutencoes) {
    const chave = m.bancadaId != null ? `b:${m.bancadaId}` : `t:${m.torreId}`;
    const arr = manutPorUnidade.get(chave) || [];
    arr.push(m);
    manutPorUnidade.set(chave, arr);
  }

  for (const [chave, manuts] of Array.from(manutPorUnidade)) {
    const abertas = manuts.filter((m: any) => m.status === "aberta");
    const total30dias = manuts.filter((m: any) => {
      const dt = new Date(m.dataAbertura || m.createdAt);
      return diasEntre(dt, hoje) <= 30;
    });

    if (abertas.length >= 3 || total30dias.length >= 5) {
      const unidade = nomeUnidadeManutencao(manuts[0], torresMap, bancadasMap);
      const idNum = Number(chave.split(":")[1]);
      const palavra = unidade.entidadeTipo === "bancada" ? "bancada" : "torre";
      alertas.push({
        tipo: "concentracao_risco",
        severidade: abertas.length >= 3 ? "alta" : "media",
        prioridade: "alta",
        titulo: `Concentração de manutenções: ${unidade.nome}`,
        descricao: `${unidade.nome} tem ${abertas.length} manutenção(ões) aberta(s) e ${total30dias.length} nos últimos 30 dias. Pode indicar problema estrutural.`,
        entidadeTipo: unidade.entidadeTipo,
        entidadeId: idNum,
        entidadeNome: unidade.nome,
        fase: unidade.fase,
        origem: "motor_regras",
        sugestaoAcao: `Avaliar condição geral da ${palavra}. Considerar inspeção completa e manutenção preventiva.`,
        nivelConfianca: "alta",
        gerarTarefa: false,
        dadosSnapshot: { abertas: abertas.length, ultimos30dias: total30dias.length },
        hashUnico: gerarHash("concentracao_manut", unidade.entidadeTipo, idNum),
      });
    }
  }

  return alertas;
}

// ============================================================
// REGRA hidroponia: EC/pH da bancada fora da faixa ou sem leitura recente
// ============================================================
function avaliarBancadaEcPh(data: FazendaSnapshot, hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];
  const bancadas = (data.bancadas || []).filter((b: any) => b.ativa && b.status === "ativa");
  const medPorBancada = new Map<number, any>();
  for (const m of data.medicoesBancada || []) {
    if (!medPorBancada.has(m.bancadaId)) medPorBancada.set(m.bancadaId, m);
  }

  for (const b of bancadas) {
    const faixa = FAIXAS_FASE_HIDRO[b.fase as string] || FAIXAS_FASE_HIDRO.vegetativa;
    const med = medPorBancada.get(b.id);

    if (!med) {
      alertas.push({
        tipo: "medicao_atrasada",
        severidade: "media",
        prioridade: "media",
        titulo: `Sem leitura de EC/pH: ${b.nome}`,
        descricao: `A bancada ${b.nome} ainda não tem nenhuma medição de EC/pH registrada.`,
        entidadeTipo: "bancada",
        entidadeId: b.id,
        entidadeNome: b.nome,
        fase: b.fase,
        origem: "motor_regras",
        sugestaoAcao: "Registrar leitura de EC e pH da solução nutritiva da bancada.",
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: {},
        hashUnico: gerarHash("medicao_atrasada", "bancada", b.id),
      });
      continue;
    }

    const diasSemMedir = diasEntre(toDateStart(new Date(med.createdAt)), hoje);
    if (diasSemMedir >= 3) {
      alertas.push({
        tipo: "medicao_atrasada",
        severidade: diasSemMedir >= 7 ? "alta" : "media",
        prioridade: diasSemMedir >= 7 ? "alta" : "media",
        titulo: `Medição de EC/pH atrasada: ${b.nome}`,
        descricao: `Última leitura da bancada ${b.nome} foi há ${diasSemMedir} dia(s).`,
        entidadeTipo: "bancada",
        entidadeId: b.id,
        entidadeNome: b.nome,
        fase: b.fase,
        origem: "motor_regras",
        sugestaoAcao: "Registrar nova leitura de EC e pH para acompanhar a solução nutritiva.",
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: { diasSemMedir },
        hashUnico: gerarHash("medicao_atrasada", "bancada", b.id, String(diasSemMedir)),
      });
    }

    const ec = med.ec != null ? Number(med.ec) : null;
    const ph = med.ph != null ? Number(med.ph) : null;
    const ecFora = ec != null && (ec < faixa.ecMin || ec > faixa.ecMax);
    const phFora = ph != null && (ph < faixa.phMin || ph > faixa.phMax);
    if (ecFora || phFora) {
      const partes: string[] = [];
      if (ecFora) partes.push(`EC ${ec!.toFixed(2)} (ideal ${faixa.ecMin}-${faixa.ecMax})`);
      if (phFora) partes.push(`pH ${ph!.toFixed(1)} (ideal ${faixa.phMin}-${faixa.phMax})`);
      alertas.push({
        tipo: "desvio_ec_ph",
        severidade: ecFora && phFora ? "alta" : "media",
        prioridade: ecFora && phFora ? "alta" : "media",
        titulo: `EC/pH fora da faixa: ${b.nome}`,
        descricao: `Bancada ${b.nome} (${b.fase}) com ${partes.join(" e ")}.`,
        entidadeTipo: "bancada",
        entidadeId: b.id,
        entidadeNome: b.nome,
        fase: b.fase,
        origem: "motor_regras",
        sugestaoAcao: "Ajustar a solução nutritiva (dosagem/diluição) e corrigir o pH.",
        nivelConfianca: "media",
        gerarTarefa: true,
        dadosSnapshot: { ec, ph, faixa },
        hashUnico: gerarHash("desvio_ec_ph", "bancada", b.id),
      });
    }
  }

  return alertas;
}

// ============================================================
// REGRA 5: Capacidade Disponível
// ============================================================
function avaliarCapacidadeDisponivel(data: FazendaSnapshot, _hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];

  // Agrupar por fase
  const fases = ["mudas", "vegetativa", "maturacao"];
  for (const fase of fases) {
    const torresFase = data.torres.filter((t: any) => t.fase === fase);
    const andaresIds = new Set(
      data.andares
        .filter((a: any) => torresFase.some((t: any) => t.id === a.torreId))
        .map((a: any) => a.id)
    );

    const totalPerfis = data.perfis.filter((p: any) => andaresIds.has(p.andarId)).length;
    const perfisAtivos = data.perfis.filter((p: any) => andaresIds.has(p.andarId) && p.ativo).length;
    const livres = totalPerfis - perfisAtivos;

    if (totalPerfis > 0 && livres > totalPerfis * 0.5) {
      // Verificar se há lotes em germinação prontos
      const lotesGerminando = data.germinacao.filter((g: any) => g.status === "germinando" || g.status === "pronto");

      alertas.push({
        tipo: "capacidade_disponivel",
        severidade: "baixa",
        prioridade: lotesGerminando.length > 0 ? "media" : "baixa",
        titulo: `Capacidade disponível: fase ${fase} (${livres} perfis livres)`,
        descricao: `A fase ${fase} tem ${livres} de ${totalPerfis} perfis disponíveis (${Math.round((livres / totalPerfis) * 100)}% livre).${lotesGerminando.length > 0 ? ` Há ${lotesGerminando.length} lote(s) em germinação que podem ser alocados.` : ""}`,
        entidadeTipo: "torre",
        fase,
        origem: "motor_regras",
        sugestaoAcao: `${lotesGerminando.length > 0 ? "Planejar alocação dos lotes em germinação." : "Considerar iniciar novos lotes para aproveitar a capacidade."} Verificar planejamento de plantio.`,
        nivelConfianca: "alta",
        gerarTarefa: false,
        dadosSnapshot: { livres, totalPerfis, perfisAtivos, lotesGerminando: lotesGerminando.length },
        hashUnico: gerarHash("capacidade_disponivel", "fase", undefined, fase),
      });
    }
  }

  return alertas;
}

// ============================================================
// REGRA 6: Inconsistência Planejamento vs Execução
// ============================================================
function avaliarInconsistenciaPlano(data: FazendaSnapshot, hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];

  for (const plano of data.planosPlantio.filter((p: any) => p.status === "planejado" || p.status === "em_germinacao")) {
    // Plano planejado mas data de início já passou
    if (plano.status === "planejado") {
      const dataInicio = new Date(plano.dataInicioGerminacao);
      const diasAtraso = diasEntre(dataInicio, hoje);
      if (diasAtraso >= 3) {
        alertas.push({
          tipo: "inconsistencia_plano",
          severidade: diasAtraso >= 7 ? "alta" : "media",
          prioridade: diasAtraso >= 7 ? "alta" : "media",
          titulo: `Plano não iniciado: ${plano.variedadeNome}`,
          descricao: `Plano de plantio para ${plano.variedadeNome} (${plano.quantidadePlantas} plantas) deveria ter iniciado germinação em ${dataInicio.toLocaleDateString("pt-BR")} — ${diasAtraso} dia(s) de atraso.`,
          entidadeTipo: "plano",
          entidadeId: plano.id,
          entidadeNome: `Plano ${plano.variedadeNome}`,
          origem: "motor_regras",
          sugestaoAcao: `Iniciar germinação conforme planejado ou cancelar/reagendar o plano.`,
          nivelConfianca: "alta",
          gerarTarefa: true,
          dadosSnapshot: { diasAtraso, dataInicio: dataInicio.toISOString() },
          hashUnico: gerarHash("inconsistencia_plano", "plano", plano.id),
        });
      }
    }

    // Plano em germinação mas data de transplantio para mudas já passou
    if (plano.status === "em_germinacao") {
      const dataTransplantio = new Date(plano.dataTransplantioMudas);
      const diasAtraso = diasEntre(dataTransplantio, hoje);
      if (diasAtraso >= 2) {
        alertas.push({
          tipo: "inconsistencia_plano",
          severidade: diasAtraso >= 5 ? "alta" : "media",
          prioridade: "alta",
          titulo: `Transplantio atrasado no plano: ${plano.variedadeNome}`,
          descricao: `Plano de ${plano.variedadeNome} deveria ter transplantado para mudas em ${dataTransplantio.toLocaleDateString("pt-BR")} — ${diasAtraso} dia(s) de atraso.`,
          entidadeTipo: "plano",
          entidadeId: plano.id,
          entidadeNome: `Plano ${plano.variedadeNome}`,
          origem: "motor_regras",
          sugestaoAcao: `Realizar transplantio para torre de mudas ou atualizar datas do plano.`,
          nivelConfianca: "alta",
          gerarTarefa: true,
          dadosSnapshot: { diasAtraso },
          hashUnico: gerarHash("inconsistencia_plano_transpl", "plano", plano.id),
        });
      }
    }
  }

  return alertas;
}

// ============================================================
// REGRA 7: Sequência Operacional Incompleta
// ============================================================
function avaliarSequenciaIncompleta(data: FazendaSnapshot, hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];
  const torresMap = new Map(data.torres.map((t: any) => [t.id, t]));

  // 7a. Andares colhidos sem lavagem
  for (const andar of data.andares) {
    if (andar.dataColheitaTotal && !andar.lavado) {
      const torre = torresMap.get(andar.torreId);
      const diasSemLavar = diasEntre(new Date(andar.dataColheitaTotal), hoje);
      if (diasSemLavar >= 1) {
        alertas.push({
          tipo: "sequencia_incompleta",
          severidade: diasSemLavar >= 3 ? "alta" : "media",
          prioridade: diasSemLavar >= 3 ? "alta" : "media",
          titulo: `Lavagem pendente: ${torre?.nome || "Torre"} A${andar.numero}`,
          descricao: `Andar ${andar.numero} de ${torre?.nome || "Torre"} foi colhido há ${diasSemLavar} dia(s) mas ainda não foi lavado. Necessário para receber novo plantio.`,
          entidadeTipo: "andar",
          entidadeId: andar.id,
          entidadeNome: `${torre?.nome || "Torre"} — Andar ${andar.numero}`,
          fase: torre?.fase,
          origem: "motor_regras",
          sugestaoAcao: `Realizar lavagem do andar para liberar para próximo ciclo.`,
          nivelConfianca: "alta",
          gerarTarefa: true,
          dadosSnapshot: { diasSemLavar },
          hashUnico: gerarHash("sequencia_lavagem", "andar", andar.id),
        });
      }
    }
  }

  return alertas;
}

// ============================================================
// REGRA 8: Desempenho Abaixo da Média
// ============================================================
function avaliarDesempenhoAbaixo(data: FazendaSnapshot, _hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];

  // Analisar registros de colheita por variedade
  const colheitasPorVariedade = new Map<number, any[]>();
  for (const rc of data.registrosColheita) {
    if (!rc.variedadeId || !rc.pesoTotalGramas) continue;
    const arr = colheitasPorVariedade.get(rc.variedadeId) || [];
    arr.push(rc);
    colheitasPorVariedade.set(rc.variedadeId, arr);
  }

  const varMap = new Map(data.variedades.map((v: any) => [v.id, v]));

  for (const [variedadeId, colheitas] of Array.from(colheitasPorVariedade)) {
    if (colheitas.length < 3) continue; // Precisa de histórico mínimo

    const pesos = colheitas.map((c: any) => c.pesoTotalGramas / c.quantidadePlantas).filter((p: number) => p > 0);
    if (pesos.length < 3) continue;

    const media = pesos.reduce((s: number, p: number) => s + p, 0) / pesos.length;
    const ultimaColheita = colheitas[colheitas.length - 1];
    const pesoUltima = ultimaColheita.pesoTotalGramas / ultimaColheita.quantidadePlantas;

    if (pesoUltima < media * 0.7 && media > 0) {
      const variedade = varMap.get(variedadeId);
      const desvio = Math.round(((media - pesoUltima) / media) * 100);

      alertas.push({
        // A UI já tem um rótulo/ícone para yield.
        tipo: "yield_abaixo",
        severidade: desvio >= 40 ? "alta" : "media",
        prioridade: "media",
        titulo: `Yield abaixo da média: ${variedade?.nome || "Variedade"} (-${desvio}%)`,
        descricao: `Última colheita de ${variedade?.nome || "Variedade"} rendeu ${pesoUltima.toFixed(0)}g/planta, ${desvio}% abaixo da média histórica de ${media.toFixed(0)}g/planta (baseado em ${pesos.length} colheitas).`,
        entidadeTipo: "torre",
        entidadeId: ultimaColheita.torreId,
        entidadeNome: variedade?.nome || "Variedade",
        origem: "motor_regras",
        sugestaoAcao: `Investigar condições de cultivo (EC/pH, iluminação, temperatura). Comparar com receita padrão.`,
        nivelConfianca: pesos.length >= 5 ? "alta" : "media",
        gerarTarefa: false,
        dadosSnapshot: { pesoUltima, media, desvio, totalColheitas: pesos.length },
        hashUnico: gerarHash("yield_abaixo", "variedade", variedadeId, `${ultimaColheita.id}`),
      });
    }
  }

  return alertas;
}

// ============================================================
// REGRA 9: Desvio de EC/pH (Medições de Caixa)
// ============================================================
function avaliarDesvioEcPh(data: FazendaSnapshot, hoje: Date): AlertCandidate[] {
  const alertas: AlertCandidate[] = [];
  const caixasMap = new Map(data.caixasAgua.map((c: any) => [c.id, c]));
  const fasesMap = new Map(data.fasesConfig.map((f: any) => [f.fase, f]));

  // Pegar última medição de cada caixa
  const ultimaMedicaoPorCaixa = new Map<number, any>();
  for (const m of data.medicoesCaixa) {
    const existing = ultimaMedicaoPorCaixa.get(m.caixaAguaId);
    if (!existing || new Date(m.dataHora) > new Date(existing.dataHora)) {
      ultimaMedicaoPorCaixa.set(m.caixaAguaId, m);
    }
  }

  for (const [caixaId, medicao] of Array.from(ultimaMedicaoPorCaixa)) {
    const caixa = caixasMap.get(caixaId);
    if (!caixa) continue;
    const faseConfig = fasesMap.get(caixa.fase);
    if (!faseConfig) continue;

    // Verificar se medição é recente (últimos 3 dias)
    const diasMedicao = diasEntre(new Date(medicao.dataHora), hoje);
    if (diasMedicao > 3) continue;

    const desvios: string[] = [];
    if (medicao.ec < faseConfig.ecMin) desvios.push(`EC ${medicao.ec} abaixo do mínimo ${faseConfig.ecMin}`);
    if (medicao.ec > faseConfig.ecMax) desvios.push(`EC ${medicao.ec} acima do máximo ${faseConfig.ecMax}`);
    if (medicao.ph < faseConfig.phMin) desvios.push(`pH ${medicao.ph} abaixo do mínimo ${faseConfig.phMin}`);
    if (medicao.ph > faseConfig.phMax) desvios.push(`pH ${medicao.ph} acima do máximo ${faseConfig.phMax}`);

    if (desvios.length > 0) {
      alertas.push({
        tipo: "desvio_ec_ph",
        severidade: desvios.length >= 2 ? "alta" : "media",
        prioridade: "alta",
        titulo: `Desvio EC/pH: ${caixa.nome}`,
        descricao: `${caixa.nome} (fase ${caixa.fase}) com desvio(s): ${desvios.join("; ")}. Faixa esperada: EC ${faseConfig.ecMin}-${faseConfig.ecMax}, pH ${faseConfig.phMin}-${faseConfig.phMax}.`,
        entidadeTipo: "caixa_agua",
        entidadeId: caixaId,
        entidadeNome: caixa.nome,
        fase: caixa.fase,
        origem: "motor_regras",
        sugestaoAcao: `Corrigir solução nutritiva. Verificar dosagem e realizar nova medição após ajuste.`,
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: { ec: medicao.ec, ph: medicao.ph, desvios, faixaEsperada: { ecMin: faseConfig.ecMin, ecMax: faseConfig.ecMax, phMin: faseConfig.phMin, phMax: faseConfig.phMax } },
        hashUnico: gerarHash("desvio_ec_ph", "caixa_agua", caixaId, `${medicao.id}`),
      });
    }
  }

  return alertas;
}

// ============================================================
// FUNÇÃO PRINCIPAL: Executar todas as regras
// ============================================================
export function executarMotorInteligencia(data: FazendaSnapshot): AlertCandidate[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const snap = mergeGerminacaoDesdePlanos(data);

  // Hidroponia de bancada: as regras de torre/andar/perfil/caixa d'água não se aplicam.
  // Rodamos manutenção (agnóstica a unidade), EC/pH por bancada e as regras de plano/germinação genéricas.
  if (data.projetoTipo === "hidroponia") {
    return [
      ...avaliarBancadaEcPh(snap, hoje),
      ...avaliarManutencaoVencida(snap, hoje),
      ...avaliarManutencaoCritica(snap, hoje),
      ...avaliarLoteForaPadrao(snap, hoje),
      ...avaliarInconsistenciaPlano(snap, hoje),
      ...avaliarSequenciaIncompleta(snap, hoje),
    ];
  }

  const todosAlertas: AlertCandidate[] = [
    ...avaliarColheitaAtrasada(snap, hoje),
    ...avaliarMedicaoAtrasada(snap, hoje),
    ...avaliarManutencaoVencida(snap, hoje),
    ...avaliarRiscoAtraso(snap, hoje),
    ...avaliarTorreSubutilizada(snap, hoje),
    ...avaliarLoteForaPadrao(snap, hoje),
    ...avaliarManutencaoCritica(snap, hoje),
    ...avaliarCapacidadeDisponivel(snap, hoje),
    ...avaliarInconsistenciaPlano(snap, hoje),
    ...avaliarSequenciaIncompleta(snap, hoje),
    ...avaliarDesempenhoAbaixo(snap, hoje),
    ...avaliarDesvioEcPh(snap, hoje),
  ];

  return todosAlertas;
}
