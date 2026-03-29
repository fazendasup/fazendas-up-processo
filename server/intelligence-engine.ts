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
}

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

    let diasFase = 0;
    if (torre.fase === "mudas") diasFase = variedade.diasMudas;
    else if (torre.fase === "vegetativa") diasFase = variedade.diasVegetativa;
    else if (torre.fase === "maturacao") diasFase = variedade.diasMaturacao;

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
          tipo: "lote_fora_padrao",
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
          hashUnico: gerarHash("lote_desperdicio", "transplantio", t.id),
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

  // 4a. Manutenções abertas em itens críticos
  const tiposCriticos = ["vazamento_tubo_injetor", "bomba_defeito", "sistema_irrigacao", "falha_eletrica"];
  for (const m of data.manutencoes.filter((m: any) => m.status === "aberta")) {
    const isCritico = tiposCriticos.some((tc) => m.tipo.toLowerCase().includes(tc.replace("_", " ")) || m.tipo.toLowerCase().includes(tc));
    if (!isCritico && !m.prazo) continue;

    const torre = torresMap.get(m.torreId);
    let diasAberta = 0;
    if (m.dataAbertura) {
      diasAberta = diasEntre(new Date(m.dataAbertura), hoje);
    }

    if (isCritico || diasAberta > 5) {
      alertas.push({
        tipo: "manutencao_critica",
        severidade: isCritico ? "critica" : "alta",
        prioridade: isCritico ? "urgente" : "alta",
        titulo: `Manutenção crítica: ${m.tipo} — ${torre?.nome || "Torre"}`,
        descricao: `Manutenção "${m.tipo}" aberta há ${diasAberta} dia(s) em ${torre?.nome || "Torre"}${m.andarNumero ? ` A${m.andarNumero}` : ""}. ${isCritico ? "Tipo classificado como crítico para operação." : "Tempo de resolução acima do esperado."}`,
        entidadeTipo: "manutencao",
        entidadeId: m.id,
        entidadeNome: `${m.tipo} — ${torre?.nome || "Torre"}`,
        fase: torre?.fase,
        origem: "motor_regras",
        sugestaoAcao: `Priorizar resolução imediata. ${isCritico ? "Verificar impacto na irrigação e produção." : "Avaliar se está bloqueando operação."}`,
        nivelConfianca: "alta",
        gerarTarefa: true,
        dadosSnapshot: { diasAberta, isCritico, tipo: m.tipo },
        hashUnico: gerarHash("manutencao_critica", "manutencao", m.id),
      });
    }
  }

  // 4b. Manutenções recorrentes na mesma torre
  const manutPorTorre = new Map<number, any[]>();
  for (const m of data.manutencoes) {
    const arr = manutPorTorre.get(m.torreId) || [];
    arr.push(m);
    manutPorTorre.set(m.torreId, arr);
  }

  for (const [torreId, manuts] of Array.from(manutPorTorre)) {
    const abertas = manuts.filter((m: any) => m.status === "aberta");
    const total30dias = manuts.filter((m: any) => {
      const dt = new Date(m.dataAbertura || m.createdAt);
      return diasEntre(dt, hoje) <= 30;
    });

    if (abertas.length >= 3 || total30dias.length >= 5) {
      const torre = torresMap.get(torreId);
      alertas.push({
        tipo: "concentracao_risco",
        severidade: abertas.length >= 3 ? "alta" : "media",
        prioridade: "alta",
        titulo: `Concentração de manutenções: ${torre?.nome || "Torre"}`,
        descricao: `${torre?.nome || "Torre"} tem ${abertas.length} manutenção(ões) aberta(s) e ${total30dias.length} nos últimos 30 dias. Pode indicar problema estrutural.`,
        entidadeTipo: "torre",
        entidadeId: torreId,
        entidadeNome: torre?.nome || "Torre",
        fase: torre?.fase,
        origem: "motor_regras",
        sugestaoAcao: `Avaliar condição geral da torre. Considerar inspeção completa e manutenção preventiva.`,
        nivelConfianca: "alta",
        gerarTarefa: false,
        dadosSnapshot: { abertas: abertas.length, ultimos30dias: total30dias.length },
        hashUnico: gerarHash("concentracao_manut", "torre", torreId),
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
        tipo: "desempenho_abaixo",
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
        hashUnico: gerarHash("desempenho_abaixo", "variedade", variedadeId, `${ultimaColheita.id}`),
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

  const todosAlertas: AlertCandidate[] = [
    ...avaliarRiscoAtraso(data, hoje),
    ...avaliarTorreSubutilizada(data, hoje),
    ...avaliarLoteForaPadrao(data, hoje),
    ...avaliarManutencaoCritica(data, hoje),
    ...avaliarCapacidadeDisponivel(data, hoje),
    ...avaliarInconsistenciaPlano(data, hoje),
    ...avaliarSequenciaIncompleta(data, hoje),
    ...avaliarDesempenhoAbaixo(data, hoje),
    ...avaliarDesvioEcPh(data, hoje),
  ];

  return todosAlertas;
}
