import { filtrarPlanosPrioridadeSomenteGerminacaoPlantio, ymdLocalKey } from "@shared/planosPlantioOperacao";
import type * as db from "./db";

export type FullFazendaData = Awaited<ReturnType<typeof db.loadFullFazendaData>>;
export type BancadaRow = Awaited<ReturnType<typeof db.getAllBancadas>>[number];
export type EstoqueAssistantItem = {
  nome: string;
  categoria: string;
  quantidadeTotal: number;
  unidadeTipo: string;
  status?: string | null;
  diasAteEsgotar?: number | null;
  fornecedor?: string | null;
};
export type ComercialAssistantResumo =
  | {
      disponivel: true;
      clientesTotal: number;
      clientesPorTipo: Record<string, number>;
      pedidosMes: number;
      vendasMesLiquido: number;
      vendasMesBruto: number;
      vendasMesFrete: number;
      vendasMesDesconto: number;
      pedidosMesPorStatus: Record<string, number>;
      oportunidadesAbertas: number;
      mensagensPendentes: number;
      ultimaSyncContaAzul: string | null;
      statusUltimaSyncContaAzul: string | null;
    }
  | { disponivel: false; motivo: string };

const MAX_SNAPSHOT_CHARS = 14_500;

function clip(body: string): string {
  if (body.length <= MAX_SNAPSHOT_CHARS) return body;
  return `${body.slice(0, MAX_SNAPSHOT_CHARS - 120)}\n\n[Parte do resumo foi omitida por limite de tamanho.]`;
}

function ts(v: Date | null | undefined): string {
  if (!v) return "";
  try {
    return v.toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return String(v);
  }
}

/**
 * Gera o **resumo operacional** do projeto em Markdown para o assistente (internamente: “snapshot” =
 * cópia dos dados num instante; para gestores: resumo consolidado ao enviar a mensagem).
 * Não inclui PII além do que já está nas entidades operacionais.
 */
export function buildCompactFazendaSnapshotMarkdown(
  data: FullFazendaData,
  opts: {
    projetoNome: string;
    projetoId: number;
    bancadas: BancadaRow[];
    estoqueItens?: EstoqueAssistantItem[] | null;
    comercial?: ComercialAssistantResumo | null;
  },
): string {
  const varById = new Map(data.variedades.map((v) => [v.id, v.nome]));
  const torreNome = (id: number | null | undefined) =>
    id == null ? "" : data.torres.find((t) => t.id === id)?.nome ?? `torre#${id}`;

  const andaresPorTorre = new Map<number, number>();
  for (const a of data.andares) {
    andaresPorTorre.set(a.torreId, (andaresPorTorre.get(a.torreId) ?? 0) + 1);
  }

  const lines: string[] = [];

  lines.push("## Projeto");
  lines.push(`- **Nome:** ${opts.projetoNome}`);
  lines.push(`- **Id interno:** ${opts.projetoId}`);
  lines.push(`- **Tipo:** ${data.projetoTipo ?? "desconhecido"}`);
  lines.push("");

  lines.push("## Módulos contratados / dados disponíveis");
  lines.push(`- **Estoque:** ${opts.estoqueItens ? "disponível neste resumo" : "não incluído ou módulo inativo"}`);
  lines.push(
    `- **Comercial:** ${
      opts.comercial?.disponivel
        ? "disponível neste resumo"
        : opts.comercial
          ? `não disponível (${opts.comercial.motivo})`
          : "não incluído ou módulo inativo"
    }`,
  );
  lines.push("");

  if (opts.comercial?.disponivel) {
    const c = opts.comercial;
    lines.push("## Comercial (Conta Azul / carteira)");
    lines.push(`- Clientes: ${c.clientesTotal}; por tipo: ${JSON.stringify(c.clientesPorTipo)}`);
    lines.push(
      `- Mês atual: ${c.pedidosMes} pedido(s); líquido R$ ${c.vendasMesLiquido.toFixed(2)}; bruto R$ ${c.vendasMesBruto.toFixed(2)}; frete R$ ${c.vendasMesFrete.toFixed(2)}; desconto R$ ${c.vendasMesDesconto.toFixed(2)}`,
    );
    lines.push(`- Pedidos por status no mês: ${JSON.stringify(c.pedidosMesPorStatus)}`);
    lines.push(`- Oportunidades abertas/em contato: ${c.oportunidadesAbertas}; mensagens pendentes: ${c.mensagensPendentes}`);
    lines.push(
      `- Última sync Conta Azul: ${c.ultimaSyncContaAzul ?? "—"}; status: ${c.statusUltimaSyncContaAzul ?? "—"}`,
    );
    lines.push("");
  }

  if (opts.estoqueItens) {
    const criticos = opts.estoqueItens.filter((i) => i.status === "critico").length;
    const atencao = opts.estoqueItens.filter((i) => i.status === "atencao").length;
    const porCategoria = new Map<string, number>();
    for (const item of opts.estoqueItens) {
      porCategoria.set(item.categoria, (porCategoria.get(item.categoria) ?? 0) + 1);
    }
    lines.push("## Estoque");
    lines.push(
      `- Itens: ${opts.estoqueItens.length}; críticos: ${criticos}; atenção: ${atencao}; por categoria: ${JSON.stringify(Object.fromEntries(porCategoria))}`,
    );
    for (const item of opts.estoqueItens.slice(0, 25)) {
      lines.push(
        `- **${item.nome}** — ${item.quantidadeTotal} ${item.unidadeTipo}, categoria ${item.categoria}, status ${item.status ?? "—"}, dias até esgotar ${item.diasAteEsgotar ?? "—"}${item.fornecedor ? `, fornecedor ${item.fornecedor}` : ""}`,
      );
    }
    if (opts.estoqueItens.length > 25) lines.push(`- … +${opts.estoqueItens.length - 25} outros itens`);
    lines.push("");
  }

  lines.push("## Torres");
  if (data.torres.length === 0) {
    lines.push("- (nenhuma torre cadastrada)");
  } else {
    for (const t of data.torres) {
      const na = andaresPorTorre.get(t.id) ?? t.numAndares;
      lines.push(
        `- **${t.nome}** (id ${t.id}) — fase \`${t.fase}\`, nº ${t.numeroTorre}, andares ≈ ${na}, ativa: ${t.ativa ? "sim" : "não"}`,
      );
    }
  }
  lines.push("");

  lines.push("## Bancadas (hidroponia / microverdes)");
  if (opts.bancadas.length === 0) {
    lines.push("- (nenhuma bancada cadastrada)");
  } else {
    for (const b of opts.bancadas) {
      const vn =
        b.plantioVariedadeId != null ? varById.get(b.plantioVariedadeId) ?? `#${b.plantioVariedadeId}` : "—";
      lines.push(
        `- **${b.nome}** (id ${b.id}) — fase \`${b.fase}\`, status \`${b.status}\`, caixas: ${b.quantidadeCaixas}, variedade plantio: ${vn}, previsão colheita: ${ts(b.plantioPrevisaoColheita)}`,
      );
    }
  }
  lines.push("");

  lines.push("## Variedades");
  if (data.variedades.length === 0) {
    lines.push("- (nenhuma)");
  } else {
    for (const v of data.variedades.slice(0, 40)) {
      const ciclo = v.diasMudas + v.diasVegetativa + v.diasMaturacao;
      lines.push(
        `- **${v.nome}** (id ${v.id}) — mudas ${v.diasMudas}d + veg ${v.diasVegetativa}d + mat ${v.diasMaturacao}d (≈ ${ciclo}d total)`,
      );
    }
    if (data.variedades.length > 40) {
      lines.push(`- … +${data.variedades.length - 40} outras`);
    }
  }
  lines.push("");

  lines.push("## Receitas de crescimento");
  lines.push(`- Total: ${data.receitas.length}`);
  for (const r of data.receitas.slice(0, 20)) {
    lines.push(`- **${r.nome}** (id ${r.id})`);
  }
  if (data.receitas.length > 20) lines.push(`- … +${data.receitas.length - 20} outras`);
  lines.push("");

  const perfisAtivos = data.perfis.filter((p) => p.ativo).length;
  const perfisComVar = data.perfis.filter((p) => p.variedadeId != null).length;
  const byStatus = new Map<string, number>();
  for (const p of data.perfis) {
    const k = p.cultivoStatus?.trim() || "(sem status)";
    byStatus.set(k, (byStatus.get(k) ?? 0) + 1);
  }
  lines.push("## Perfis / ocupação (torres)");
  lines.push(`- Total perfis: ${data.perfis.length}; ativos: ${perfisAtivos}; com variedade: ${perfisComVar}`);
  if (byStatus.size > 0) {
    lines.push(
      `- Distribuição cultivoStatus: ${Array.from(byStatus.entries())
        .map(([k, n]) => `${k}:${n}`)
        .join(", ")}`,
    );
  }
  lines.push("");

  lines.push("## Furos (amostra)");
  const furosOcup = data.furos.filter((f) => f.status && f.status !== "vazio").length;
  lines.push(`- Total furos: ${data.furos.length}; ocupados/não-vazios: ${furosOcup}`);
  lines.push("");

  lines.push("## Ciclos de automação / dosagem");
  lines.push(`- Total: ${data.ciclos.length}`);
  for (const c of data.ciclos.slice(-20)) {
    lines.push(
      `- **${c.nome}** (id ${c.id}) — tipo \`${c.tipo}\`, produto ${c.produto}, alvo \`${c.alvo}\`, ativo: ${c.ativo ? "sim" : "não"}${c.dosagem ? `, dosagem: ${c.dosagem}` : ""}`,
    );
  }
  lines.push("");

  lines.push("## Germinação / transplantio / manutenção");
  lines.push(`- Germinação: ${data.germinacao.length} registros`);
  lines.push(`- Transplantios: ${data.transplantios.length} registros`);
  lines.push(`- Manutenções: ${data.manutencoes.length} registros`);
  lines.push("");

  const tarefasSorted = [...data.tarefas].sort(
    (a, b) => new Date(a.dataVencimento).getTime() - new Date(b.dataVencimento).getTime(),
  );
  lines.push("## Tarefas (ordenadas por vencimento)");
  for (const t of tarefasSorted.slice(0, 35)) {
    lines.push(
      `- [${t.status}] ${ts(t.dataVencimento)} — **${t.titulo}** (${t.tipo}, ${t.prioridade})${t.torreId != null ? ` — ${torreNome(t.torreId)}` : ""}`,
    );
  }
  if (tarefasSorted.length > 35) lines.push(`- … +${tarefasSorted.length - 35} outras`);
  lines.push("");

  const refSnap = new Date();
  const filaGermSnap = filtrarPlanosPrioridadeSomenteGerminacaoPlantio(data.planosPlantio as any[], refSnap).filter(
    (p: { status: string }) => p.status === "planejado",
  );
  lines.push("## Planos — germinação / plantio inicial (fila como no painel Plantio)");
  lines.push(
    `- Planos em **planejado** elegíveis a **Iniciar germinação** agora (hoje local ${ymdLocalKey(refSnap)}): **${filaGermSnap.length}**`,
  );
  for (const p of filaGermSnap.slice(0, 25)) {
    const row = p as { id: number; variedadeNome: string; quantidadePlantas: number; status: string; dataInicioGerminacao: Date };
    lines.push(
      `- **#${row.id}** ${row.variedadeNome} — ${row.quantidadePlantas} plantas, status \`${row.status}\`, início germ. ${ts(row.dataInicioGerminacao)}`,
    );
  }
  if (filaGermSnap.length > 25) lines.push(`- … +${filaGermSnap.length - 25} outros planos na mesma fila`);
  lines.push("");

  lines.push("## Registros de colheita (últimos)");
  const rc = [...data.registrosColheita].slice(-12);
  for (const r of rc) {
    const peso = r.pesoTotalGramas != null ? `${r.pesoTotalGramas} g` : "";
    lines.push(
      `- ${ts(r.dataColheita)} — ${r.variedadeNome ?? "—"} — ${peso ? `${peso}, ` : ""}${r.quantidadePlantas} plantas, qualidade ${r.qualidade ?? "—"}`,
    );
  }
  lines.push("");

  lines.push("## Planos de plantio");
  lines.push(`- Total: ${data.planosPlantio.length}`);
  for (const p of data.planosPlantio.slice(0, 12)) {
    lines.push(
      `- **#${p.id}** ${p.variedadeNome} — status \`${p.status}\` — colheita prevista ${ts(p.dataColheitaPrevista)} — germinação ${ts(p.dataInicioGerminacao)}`,
    );
  }

  lines.push("");
  lines.push("## Medições recentes (caixa d’água)");
  lines.push(`- Total medições armazenadas: ${data.medicoesCaixa.length}`);
  for (const m of data.medicoesCaixa.slice(-8)) {
    lines.push(`- ${ts(m.dataHora)} — pH ${m.ph} — EC ${m.ec}`);
  }

  return clip(lines.join("\n"));
}
