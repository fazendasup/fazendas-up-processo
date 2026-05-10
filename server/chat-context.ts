import type * as db from "./db";

export type FullFazendaData = Awaited<ReturnType<typeof db.loadFullFazendaData>>;
export type BancadaRow = Awaited<ReturnType<typeof db.getAllBancadas>>[number];

const MAX_SNAPSHOT_CHARS = 14_500;

function clip(body: string): string {
  if (body.length <= MAX_SNAPSHOT_CHARS) return body;
  return `${body.slice(0, MAX_SNAPSHOT_CHARS - 120)}\n\n[Snapshot truncado por limite de contexto.]`;
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
 * Texto compacto em Markdown com dados operacionais do projeto para o modelo interpretar.
 * Não inclui PII além do que já está nas entidades operacionais.
 */
export function buildCompactFazendaSnapshotMarkdown(
  data: FullFazendaData,
  opts: { projetoNome: string; projetoId: number; bancadas: BancadaRow[] },
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
      `- **${p.variedadeNome}** — status \`${p.status}\` — colheita prevista ${ts(p.dataColheitaPrevista)} — germinação ${ts(p.dataInicioGerminacao)}`,
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
