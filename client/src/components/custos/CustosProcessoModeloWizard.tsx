/**
 * Assistente passo a passo: modelos de processo (folhosas, legumes…)
 * MO (CLT/PJ via equipes) + máquina (energia, deprec., consumíveis).
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DecimalInput } from "@/components/custos/DecimalInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseOptDecimal } from "@/lib/decimalInput";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CATEGORIAS_PRODUTO_CUSTO,
  LABEL_CATEGORIA_PRODUTO_CUSTO,
  LABEL_ETAPA_PROCESSO,
  LABEL_MODO_COMPRA_MP,
  MODOS_COMPRA_MP,
  type CategoriaProdutoCusto,
  type ModoCompraMp,
} from "@shared/custosProduto";
import {
  calcularLinhaProcessoIndustrial,
  depreciacaoReaisKgDeEquipamento,
  FAMILIAS_PROCESSO_MODELO,
  isEtapaLinhaProcessamento,
  LABEL_FAMILIA_PROCESSO_MODELO,
  LABEL_MODO_PESSOAS_PROCESSAMENTO,
  LINHA_ETAPA_CAMPO_PESSOAS,
  LINHA_ETAPA_CAMPO_REGIME,
  LINHA_PROCESSO_INDUSTRIAL_PADRAO,
  MODOS_PESSOAS_PROCESSAMENTO,
  normalizarLinhaProcessoInput,
  type CustoMaquinaInput,
  type FamiliaProcessoModelo,
  type LinhaProcessoIndustrialInput,
  type ModoPessoasProcessamento,
  type ProcessoModeloRecord,
} from "@shared/custosLinhaProcessoIndustrial";
import {
  DESCRICAO_PERFIL_PROCESSO,
  LABEL_PERFIL_PROCESSO_PRODUTO,
  PERFIS_PROCESSO_PRODUTO,
  perfilUsaLavagemKg,
  type PerfilProcessoProduto,
} from "@shared/custosProdutoProcessoPadrao";
import {
  LABEL_REGIME_MO_ETAPA,
  LABEL_REGIME_MO_EQUIPE,
  REGIMES_MO_ETAPA,
  type RegimeMoEtapa,
} from "@shared/custosMoEquipe";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Cog,
  Factory,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";

const fmtMoney = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const STEPS = [
  { id: "modelo", title: "Modelo", desc: "Escolha ou crie um modelo de linha" },
  { id: "base", title: "Base", desc: "Equipes MO, tarifa kWh e volume de referência" },
  { id: "mo", title: "Mão de obra", desc: "Tempos, pessoas e regime CLT/PJ por etapa" },
  { id: "maquina", title: "Máquinas", desc: "Energia, depreciação e consumíveis" },
  { id: "insumos", title: "Insumos", desc: "Embalagem, adesivo e regime padrão" },
  { id: "resultado", title: "Resultado", desc: "Conferir custo MO + máquina gerado" },
  { id: "produtos", title: "Produtos", desc: "Vincular SKUs e gerar fichas" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type LinhaMap = {
  produtoComercialId: string;
  nome: string;
  semFicha: boolean;
  categoriaCusto: CategoriaProdutoCusto;
  perfilProcesso: PerfilProcessoProduto;
  kgPorUnidade: string;
  modoCompraMp: ModoCompraMp;
  processoModeloId: string;
  perfilSugerido: PerfilProcessoProduto;
};

type ModeloDraft = {
  id?: number;
  nome: string;
  descricao: string;
  familia: FamiliaProcessoModelo;
  isDefault: boolean;
  kgReferenciaMes: string;
  embalagemMicroverdeUn: string;
  embalagemOutrosUn: string;
  adesivoCustoUn: string;
  regimeMoPadrao: RegimeMoEtapa;
  incluirAdesivo: boolean;
  linha: LinhaProcessoIndustrialInput;
};

function modeloToDraft(m: ProcessoModeloRecord): ModeloDraft {
  return {
    id: m.id,
    nome: m.nome,
    descricao: m.descricao ?? "",
    familia: m.familia,
    isDefault: m.isDefault,
    kgReferenciaMes: m.kgReferenciaMes != null ? String(m.kgReferenciaMes) : "",
    embalagemMicroverdeUn: String(m.embalagemMicroverdeUn),
    embalagemOutrosUn: String(m.embalagemOutrosUn),
    adesivoCustoUn: m.adesivoCustoUn != null ? String(m.adesivoCustoUn) : "",
    regimeMoPadrao: m.regimeMoPadrao,
    incluirAdesivo: m.incluirAdesivo,
    linha: m.linhaProcesso,
  };
}

function draftVazio(nome = "Novo modelo"): ModeloDraft {
  return {
    nome,
    descricao: "",
    familia: "folhosas",
    isDefault: false,
    kgReferenciaMes: "",
    embalagemMicroverdeUn: "0.95",
    embalagemOutrosUn: "0.60",
    adesivoCustoUn: "",
    regimeMoPadrao: "qualquer",
    incluirAdesivo: true,
    linha: { ...LINHA_PROCESSO_INDUSTRIAL_PADRAO },
  };
}

function draftToPayload(d: ModeloDraft) {
  return {
    id: d.id,
    nome: d.nome.trim(),
    descricao: d.descricao.trim() || null,
    familia: d.familia,
    isDefault: d.isDefault,
    kgReferenciaMes: parseOptDecimal(d.kgReferenciaMes),
    embalagemMicroverdeUn: parseOptDecimal(d.embalagemMicroverdeUn) ?? 0.95,
    embalagemOutrosUn: parseOptDecimal(d.embalagemOutrosUn) ?? 0.6,
    adesivoCustoUn: parseOptDecimal(d.adesivoCustoUn),
    regimeMoPadrao: d.regimeMoPadrao,
    incluirAdesivo: d.incluirAdesivo,
    linhaProcesso: normalizarLinhaProcessoInput(d.linha),
  };
}

function MaquinaFields({
  label,
  maquina,
  onChange,
  showContinuo,
  kgHoraHint,
}: {
  label: string;
  maquina: CustoMaquinaInput;
  onChange: (m: CustoMaquinaInput) => void;
  showContinuo?: boolean;
  kgHoraHint?: string;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <Switch checked={maquina.ativo} onCheckedChange={(v) => onChange({ ...maquina, ativo: v })} />
      </div>
      {maquina.ativo ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Potência (kW)</Label>
            <DecimalInput
              value={maquina.potenciaKw}
              onChange={(v) => onChange({ ...maquina, potenciaKw: v })}
            />
          </div>
          {showContinuo ? (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Modo contínuo (vazão kg/h da etapa)</Label>
              <p className="text-[11px] text-muted-foreground">{kgHoraHint ?? "Usa kg/h efetivo da lavagem"}</p>
              <Switch
                checked={maquina.modoContinuo}
                onCheckedChange={(v) => onChange({ ...maquina, modoContinuo: v })}
              />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Ciclo (min)</Label>
                <DecimalInput
                  value={maquina.minutosCiclo}
                  onChange={(v) => onChange({ ...maquina, minutosCiclo: v })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Kg por carga</Label>
                <DecimalInput
                  value={maquina.kgPorCiclo}
                  fallback={1}
                  onChange={(v) => onChange({ ...maquina, kgPorCiclo: v })}
                />
              </div>
            </>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Depreciação (R$/kg)</Label>
            <DecimalInput
              value={maquina.depreciacaoReaisKg}
              onChange={(v) => onChange({ ...maquina, depreciacaoReaisKg: v })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Consumíveis (R$/kg)</Label>
            <DecimalInput
              value={maquina.consumiveisReaisKg}
              onChange={(v) => onChange({ ...maquina, consumiveisReaisKg: v })}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sem custo de máquina nesta etapa.</p>
      )}
    </div>
  );
}

export function CustosProcessoModeloWizard() {
  const utils = trpc.useUtils();
  const modelosQuery = trpc.custosProducao.produtos.listarProcessoModelos.useQuery();
  const produtosQuery = trpc.custosProducao.produtos.listarProdutosComercial.useQuery();

  const [stepIdx, setStepIdx] = useState(0);
  const [draft, setDraft] = useState<ModeloDraft>(() => draftVazio());
  const [linhas, setLinhas] = useState<LinhaMap[]>([]);
  const [filtroSemFicha, setFiltroSemFicha] = useState(true);

  const mapaHora = modelosQuery.data?.mapaHora ?? null;
  const modelos = modelosQuery.data?.modelos ?? [];

  useEffect(() => {
    if (modelos.length > 0 && draft.id == null && draft.nome === "Novo modelo") {
      const padrao = modelos.find((m) => m.isDefault) ?? modelos[0];
      setDraft(modeloToDraft(padrao));
    }
  }, [modelos, draft.id, draft.nome]);

  useEffect(() => {
    if (!produtosQuery.data) return;
    setLinhas(
      produtosQuery.data.map((p) => ({
        produtoComercialId: p.id,
        nome: p.nome,
        semFicha: p.semFicha,
        categoriaCusto: p.mapeamento.categoriaCusto,
        perfilProcesso: p.mapeamento.perfilProcesso,
        kgPorUnidade: p.mapeamento.kgPorUnidade != null ? String(p.mapeamento.kgPorUnidade) : "",
        modoCompraMp: p.mapeamento.modoCompraMp ?? "kg",
        processoModeloId:
          p.mapeamento.processoModeloId != null ? String(p.mapeamento.processoModeloId) : "",
        perfilSugerido: p.perfilSugerido,
      })),
    );
  }, [produtosQuery.data]);

  const linhaCalc = useMemo(
    () => calcularLinhaProcessoIndustrial(normalizarLinhaProcessoInput(draft.linha), mapaHora),
    [draft.linha, mapaHora],
  );

  const salvarModelo = trpc.custosProducao.produtos.salvarProcessoModelo.useMutation({
    onSuccess: (data) => {
      toast.success(`Modelo «${data.modelo.nome}» salvo`);
      setDraft(modeloToDraft(data.modelo));
      void utils.custosProducao.produtos.listarProcessoModelos.invalidate();
      void utils.custosProducao.produtos.processoConfig.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const excluirModelo = trpc.custosProducao.produtos.excluirProcessoModelo.useMutation({
    onSuccess: () => {
      toast.success("Modelo excluído");
      setDraft(draftVazio());
      void utils.custosProducao.produtos.listarProcessoModelos.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const salvarMap = trpc.custosProducao.produtos.salvarMapeamentos.useMutation({
    onSuccess: (d) => toast.success(`Classificação salva (${d.total} produto(s))`),
    onError: (e) => toast.error(e.message),
  });

  const gerar = trpc.custosProducao.produtos.gerarFichasContaAzul.useMutation({
    onSuccess: async (data) => {
      toast.success(`Fichas: ${data.inseridos} nova(s), ${data.atualizados} atualizada(s)`);
      await utils.custosProducao.produtos.listarFichas.invalidate();
      await utils.custosProducao.produtos.listarProdutosComercial.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function patchLinha(patch: Partial<LinhaProcessoIndustrialInput>) {
    setDraft((d) => ({ ...d, linha: { ...d.linha, ...patch } }));
  }

  function aplicarDepreciacaoLavagem(valor: number, meses: number) {
    const kg = parseOptDecimal(draft.kgReferenciaMes);
    if (kg == null) {
      toast.error("Informe kg/mês de referência no passo Base");
      return;
    }
    const dep = depreciacaoReaisKgDeEquipamento(valor, meses, kg);
    patchLinha({
      lavagemMaquina: { ...draft.linha.lavagemMaquina, depreciacaoReaisKg: dep },
    });
    toast.success(`Depreciação lavagem: ${fmtMoney(dep)}/kg`);
  }

  const step = STEPS[stepIdx];
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  const linhasVisiveis = filtroSemFicha ? linhas.filter((l) => l.semFicha) : linhas;

  return (
    <div className="space-y-4">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Assistente de custo de processo</AlertTitle>
        <AlertDescription>
          Cadastre <strong>um modelo por tipo de linha</strong> (folhosas, legumes…). Cada etapa pode ser{" "}
          <strong>só MO</strong>, <strong>MO + máquina</strong> ou <strong>só máquina</strong> (lavagem
          automática). MO usa R$/h das <strong>Equipes MO</strong> (CLT/PJ) quando disponível.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Factory className="h-4 w-4" />
                Passo {stepIdx + 1} de {STEPS.length}: {step.title}
              </CardTitle>
              <CardDescription>{step.desc}</CardDescription>
            </div>
            <Badge variant="outline">{draft.nome || "Sem nome"}</Badge>
          </div>
          <Progress value={progress} className="h-1.5 mt-3" />
          <div className="flex flex-wrap gap-1 mt-2">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStepIdx(i)}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  i === stepIdx ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {i + 1}. {s.title}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step.id === "modelo" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {modelos.map((m) => (
                  <Button
                    key={m.id}
                    variant={draft.id === m.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDraft(modeloToDraft(m))}
                  >
                    {m.nome}
                    {m.isDefault ? " · padrão" : ""}
                  </Button>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDraft(draftVazio("Legumes"))}
                >
                  <Plus className="h-3 w-3 mr-1" /> Novo
                </Button>
                {draft.id ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDraft({ ...draft, id: undefined, nome: `${draft.nome} (cópia)` })}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Duplicar
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nome do modelo</Label>
                  <Input value={draft.nome} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Família</Label>
                  <Select
                    value={draft.familia}
                    onValueChange={(v) => setDraft({ ...draft, familia: v as FamiliaProcessoModelo })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FAMILIAS_PROCESSO_MODELO.map((f) => (
                        <SelectItem key={f} value={f}>
                          {LABEL_FAMILIA_PROCESSO_MODELO[f]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Descrição (opcional)</Label>
                  <Input
                    value={draft.descricao}
                    onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
                    placeholder="Ex.: linha folhosas 300 kg/h, lavagem automática"
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <Switch
                    checked={draft.isDefault}
                    onCheckedChange={(v) => setDraft({ ...draft, isDefault: v })}
                  />
                  <Label className="font-normal">Modelo padrão do projeto (fallback sem vínculo)</Label>
                </div>
              </div>
            </div>
          ) : null}

          {step.id === "base" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-3 space-y-2 sm:col-span-2">
                <p className="text-sm font-medium">R$/h das equipes (processamento)</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">CLT</p>
                    <p className="font-semibold tabular-nums">
                      {mapaHora?.clt != null ? fmtMoney(mapaHora.clt) : "—"}/h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">PJ</p>
                    <p className="font-semibold tabular-nums">
                      {mapaHora?.pj != null ? fmtMoney(mapaHora.pj) : "—"}/h
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Misto</p>
                    <p className="font-semibold tabular-nums">
                      {mapaHora?.misto != null ? fmtMoney(mapaHora.misto) : "—"}/h
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cadastre em Equipes MO. Sem equipe, usa R$/h manual abaixo.
                </p>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={draft.linha.usarEquipesMo}
                  onCheckedChange={(v) => patchLinha({ usarEquipesMo: v })}
                />
                <Label className="font-normal">Usar R$/h das equipes MO (recomendado)</Label>
              </div>
              <div className="space-y-1">
                <Label>R$/h manual (fallback)</Label>
                <DecimalInput
                  value={draft.linha.custoHoraMo}
                  fractionDigits={2}
                  onChange={(v) => patchLinha({ custoHoraMo: v })}
                />
              </div>
              <div className="space-y-1">
                <Label>Tarifa energia (R$/kWh)</Label>
                <DecimalInput
                  value={draft.linha.tarifaKwh}
                  fallback={0.75}
                  fractionDigits={4}
                  onChange={(v) => patchLinha({ tarifaKwh: v })}
                />
              </div>
              <div className="space-y-1">
                <Label>Kg processados / mês (referência depreciação)</Label>
                <Input
                  inputMode="decimal"
                  value={draft.kgReferenciaMes}
                  onChange={(e) => setDraft({ ...draft, kgReferenciaMes: e.target.value })}
                  placeholder="Ex.: 30000"
                />
              </div>
              <div className="space-y-1">
                <Label>Pés/un vendida (ref. desfolhagem)</Label>
                <DecimalInput
                  value={draft.linha.pesPorUnidadeRef}
                  fallback={1}
                  onChange={(v) => patchLinha({ pesPorUnidadeRef: v })}
                />
              </div>
            </div>
          ) : null}

          {step.id === "mo" ? (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
                <p className="text-sm font-medium">Como contar pessoas na linha de lavagem</p>
                <p className="text-xs text-muted-foreground">
                  O mesmo operador na sequência pré-lavagem → enxague → secagem: os tempos{" "}
                  <strong>somam</strong> (trabalho em série). Use &quot;Equipe na linha&quot; e informe
                  quantos operadores fazem essa sequência — não repita pessoas em cada etapa.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Modo de apontamento (linha kg)</Label>
                    <Select
                      value={draft.linha.modoPessoasProcessamento}
                      onValueChange={(v) =>
                        patchLinha({ modoPessoasProcessamento: v as ModoPessoasProcessamento })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MODOS_PESSOAS_PROCESSAMENTO.map((m) => (
                          <SelectItem key={m} value={m}>
                            {LABEL_MODO_PESSOAS_PROCESSAMENTO[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {draft.linha.modoPessoasProcessamento === "equipe_linha" ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Operadores na sequência da linha</Label>
                      <DecimalInput
                        integersOnly
                        fallback={1}
                        value={draft.linha.pessoasLinhaProcessamento}
                        onChange={(v) =>
                          patchLinha({ pessoasLinhaProcessamento: Math.max(1, v) })
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Lavagem automática = MO zero (máquina no passo Máquinas). Consumíveis = sanitizante,
                detergente etc. (R$/kg).
              </p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Desfolhagem (s/pé)</Label>
                  <DecimalInput
                    value={draft.linha.desfolhagemSegPorPe}
                    onChange={(v) => patchLinha({ desfolhagemSegPorPe: v })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pré-lavagem kg/h</Label>
                  <DecimalInput
                    value={draft.linha.preLavagemKgHora}
                    fallback={300}
                    onChange={(v) => patchLinha({ preLavagemKgHora: v })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pré-lavagem eficiência %</Label>
                  <DecimalInput
                    value={draft.linha.preLavagemEficienciaPct}
                    fallback={70}
                    onChange={(v) => patchLinha({ preLavagemEficienciaPct: v })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pré-lavagem consumíveis (R$/kg)</Label>
                  <DecimalInput
                    value={draft.linha.preLavagemConsumiveisReaisKg}
                    fractionDigits={4}
                    onChange={(v) => patchLinha({ preLavagemConsumiveisReaisKg: v })}
                    placeholder="Sanitizante, detergente…"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Lavagem kg/h</Label>
                  <DecimalInput
                    value={draft.linha.lavagemKgHora}
                    fallback={300}
                    onChange={(v) => patchLinha({ lavagemKgHora: v })}
                  />
                </div>
                <div className="space-y-1 flex items-end gap-2 pb-1 sm:col-span-2">
                  <Switch
                    checked={draft.linha.lavagemUsaMo}
                    onCheckedChange={(v) =>
                      patchLinha({
                        lavagemUsaMo: v,
                        lavagemMaquina: { ...draft.linha.lavagemMaquina, ativo: !v },
                      })
                    }
                  />
                  <Label className="text-xs">Lavagem com operador (senão só máquina)</Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Enxague (s / kg)</Label>
                  <div className="flex gap-1">
                    <DecimalInput
                      className="w-16"
                      value={draft.linha.enxagueSeg}
                      onChange={(v) => patchLinha({ enxagueSeg: v })}
                    />
                    <DecimalInput
                      className="flex-1"
                      value={draft.linha.enxagueKg}
                      fallback={1}
                      onChange={(v) => patchLinha({ enxagueKg: v })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Enxague consumíveis (R$/kg)</Label>
                  <DecimalInput
                    value={draft.linha.enxagueConsumiveisReaisKg}
                    fractionDigits={4}
                    onChange={(v) => patchLinha({ enxagueConsumiveisReaisKg: v })}
                    placeholder="Ácido, cloro…"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Secagem abastec. (s / kg)</Label>
                  <div className="flex gap-1">
                    <DecimalInput
                      className="w-16"
                      value={draft.linha.secagemSegOperador}
                      fallback={30}
                      onChange={(v) => patchLinha({ secagemSegOperador: v })}
                    />
                    <DecimalInput
                      className="flex-1"
                      value={draft.linha.secagemKg}
                      fallback={1}
                      onChange={(v) => patchLinha({ secagemKg: v })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Embalagem min/un</Label>
                  <DecimalInput
                    value={draft.linha.embalagemMinPorUn}
                    onChange={(v) => patchLinha({ embalagemMinPorUn: v })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Selagem min / N un</Label>
                  <div className="flex gap-1">
                    <DecimalInput
                      className="w-16"
                      value={draft.linha.selagemMinPorCiclo}
                      onChange={(v) => patchLinha({ selagemMinPorCiclo: v })}
                    />
                    <DecimalInput
                      className="w-16"
                      value={draft.linha.selagemUnPorCiclo}
                      fallback={1}
                      onChange={(v) => patchLinha({ selagemUnPorCiclo: v })}
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Etapa</TableHead>
                      <TableHead>Pessoas</TableHead>
                      <TableHead>Regime MO</TableHead>
                      <TableHead>R$/h usado</TableHead>
                      <TableHead>MO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhaCalc.etapas
                      .filter((e) => e.temMo)
                      .map((e) => {
                        const cp = LINHA_ETAPA_CAMPO_PESSOAS[e.nome];
                        const cr = LINHA_ETAPA_CAMPO_REGIME[e.nome];
                        return (
                          <TableRow key={e.nome}>
                            <TableCell className="text-sm">{e.nome}</TableCell>
                            <TableCell>
                              {cp &&
                              draft.linha.modoPessoasProcessamento === "equipe_linha" &&
                              isEtapaLinhaProcessamento(e.nome) ? (
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  equipe {draft.linha.pessoasLinhaProcessamento}
                                </span>
                              ) : cp ? (
                                <DecimalInput
                                  className="h-8 w-14 text-center"
                                  integersOnly
                                  fallback={1}
                                  value={draft.linha[cp] as number}
                                  onChange={(v) =>
                                    patchLinha({ [cp]: Math.max(1, v) } as never)
                                  }
                                />
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              {cr ? (
                                <Select
                                  value={String(draft.linha[cr])}
                                  onValueChange={(v) =>
                                    patchLinha({ [cr]: v as RegimeMoEtapa } as never)
                                  }
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {REGIMES_MO_ETAPA.map((r) => (
                                      <SelectItem key={r} value={r}>
                                        {LABEL_REGIME_MO_ETAPA[r]}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">
                              {e.custoHoraUsado != null ? fmtMoney(e.custoHoraUsado) : "—"}
                            </TableCell>
                            <TableCell className="text-xs tabular-nums">
                              {e.reaisPorUn != null
                                ? `${fmtMoney(e.reaisPorUn)}/un`
                                : e.moReaisPorKg != null
                                  ? `${fmtMoney(e.moReaisPorKg)}/kg`
                                  : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          {step.id === "maquina" ? (
            <div className="space-y-4">
              <MaquinaFields
                label="Lavagem industrial (automática ou complemento)"
                maquina={draft.linha.lavagemMaquina}
                showContinuo
                kgHoraHint={`~${((draft.linha.lavagemKgHora * draft.linha.lavagemEficienciaPct) / 100).toFixed(0)} kg/h efetivos`}
                onChange={(m) => patchLinha({ lavagemMaquina: m })}
              />
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Valor equip. lavagem (R$)</Label>
                  <Input id="val-lav" inputMode="decimal" placeholder="80000" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vida útil (meses)</Label>
                  <Input id="mes-lav" inputMode="decimal" placeholder="120" />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const v = parseOptDecimal((document.getElementById("val-lav") as HTMLInputElement)?.value ?? "");
                    const m = parseOptDecimal((document.getElementById("mes-lav") as HTMLInputElement)?.value ?? "");
                    if (v != null && m != null) aplicarDepreciacaoLavagem(v, m);
                  }}
                >
                  Calcular deprec. R$/kg
                </Button>
              </div>
              <MaquinaFields
                label="Centrífuga (ciclo de secagem — energia + fixos)"
                maquina={draft.linha.secagemMaquina}
                onChange={(m) => patchLinha({ secagemMaquina: m })}
              />
            </div>
          ) : null}

          {step.id === "insumos" ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <Label>Embalagem microverdes (R$/un)</Label>
                <Input
                  value={draft.embalagemMicroverdeUn}
                  onChange={(e) => setDraft({ ...draft, embalagemMicroverdeUn: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Embalagem demais (R$/un)</Label>
                <Input
                  value={draft.embalagemOutrosUn}
                  onChange={(e) => setDraft({ ...draft, embalagemOutrosUn: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Adesivo (R$/un)</Label>
                <Input
                  value={draft.adesivoCustoUn}
                  onChange={(e) => setDraft({ ...draft, adesivoCustoUn: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Regime MO padrão (fichas)</Label>
                <Select
                  value={draft.regimeMoPadrao}
                  onValueChange={(v) => setDraft({ ...draft, regimeMoPadrao: v as RegimeMoEtapa })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIMES_MO_ETAPA.map((r) => (
                      <SelectItem key={r} value={r}>
                        {LABEL_REGIME_MO_ETAPA[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch
                  checked={draft.incluirAdesivo}
                  onCheckedChange={(v) => setDraft({ ...draft, incluirAdesivo: v })}
                />
                <Label className="font-normal text-sm">Incluir adesivo nas fichas</Label>
              </div>
            </div>
          ) : null}

          {step.id === "resultado" ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground">Processamento MO</CardTitle>
                  </CardHeader>
                  <CardContent className="text-lg font-semibold tabular-nums">
                    {fmtMoney(linhaCalc.processamentoMoReaisKg)}/kg
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground">Máquina (energia+deprec.)</CardTitle>
                  </CardHeader>
                  <CardContent className="text-lg font-semibold tabular-nums">
                    {fmtMoney(linhaCalc.processamentoMaquinaReaisKg)}/kg
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground">Consumíveis (pré-lav/enxague)</CardTitle>
                  </CardHeader>
                  <CardContent className="text-lg font-semibold tabular-nums">
                    {fmtMoney(linhaCalc.processamentoConsumiveisReaisKg)}/kg
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs text-muted-foreground">Total R$/kg → ficha</CardTitle>
                  </CardHeader>
                  <CardContent className="text-lg font-semibold tabular-nums text-emerald-700">
                    {fmtMoney(linhaCalc.processamentoReaisKg)}/kg
                  </CardContent>
                </Card>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Etapa</TableHead>
                      <TableHead>MO</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Consum.</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhaCalc.etapas.map((e) => (
                      <TableRow key={e.nome}>
                        <TableCell className="text-sm">
                          {e.nome}
                          {e.nota ? (
                            <p className="text-[10px] text-muted-foreground">{e.nota}</p>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {e.moReaisPorUn != null
                            ? `${fmtMoney(e.moReaisPorUn)}/un`
                            : e.moReaisPorKg != null
                              ? `${fmtMoney(e.moReaisPorKg)}/kg`
                              : "—"}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {e.maquinaReaisPorKg != null ? `${fmtMoney(e.maquinaReaisPorKg)}/kg` : "—"}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {e.consumiveisReaisPorKg != null && e.consumiveisReaisPorKg > 0
                            ? `${fmtMoney(e.consumiveisReaisPorKg)}/kg`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums font-medium">
                          {e.reaisPorUn != null
                            ? `${fmtMoney(e.reaisPorUn)}/un`
                            : e.reaisPorKg != null
                              ? `${fmtMoney(e.reaisPorKg)}/kg`
                              : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Desfolhagem min/un</p>
                  <p className="font-semibold">{linhaCalc.desfolhagemMinPorUn}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Embalagem+selagem min/un</p>
                  <p className="font-semibold">{linhaCalc.embalagemSelagemMinPorUn}</p>
                </div>
              </div>
              {linhaCalc.alertas.length > 0 ? (
                <ul className="text-xs text-amber-700 list-disc pl-4">
                  {linhaCalc.alertas.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {step.id === "produtos" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <Switch checked={filtroSemFicha} onCheckedChange={setFiltroSemFicha} />
                <Label className="font-normal text-sm">Só produtos sem ficha</Label>
              </div>
              <div className="overflow-x-auto rounded-lg border max-h-[360px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>kg/un</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linhasVisiveis.map((l) => (
                      <TableRow key={l.produtoComercialId}>
                        <TableCell className="text-sm max-w-[180px] truncate">{l.nome}</TableCell>
                        <TableCell>
                          <Select
                            value={l.processoModeloId || "__padrao__"}
                            onValueChange={(v) =>
                              setLinhas((prev) =>
                                prev.map((x) =>
                                  x.produtoComercialId === l.produtoComercialId
                                    ? { ...x, processoModeloId: v === "__padrao__" ? "" : v }
                                    : x,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__padrao__">Padrão do projeto</SelectItem>
                              {modelos.map((m) => (
                                <SelectItem key={m.id} value={String(m.id)}>
                                  {m.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={l.perfilProcesso}
                            onValueChange={(v) =>
                              setLinhas((prev) =>
                                prev.map((x) =>
                                  x.produtoComercialId === l.produtoComercialId
                                    ? { ...x, perfilProcesso: v as PerfilProcessoProduto }
                                    : x,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PERFIS_PROCESSO_PRODUTO.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {LABEL_PERFIL_PROCESSO_PRODUTO[p]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 w-20"
                            inputMode="decimal"
                            value={l.kgPorUnidade}
                            onChange={(e) =>
                              setLinhas((prev) =>
                                prev.map((x) =>
                                  x.produtoComercialId === l.produtoComercialId
                                    ? { ...x, kgPorUnidade: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-between gap-2 pt-2 border-t">
            <Button
              variant="outline"
              disabled={stepIdx === 0}
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <div className="flex flex-wrap gap-2">
              {draft.id && !draft.isDefault ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm(`Excluir «${draft.nome}»?`)) {
                      excluirModelo.mutate({ id: draft.id! });
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Excluir
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={() => salvarModelo.mutate(draftToPayload(draft))}
                disabled={salvarModelo.isPending || !draft.nome.trim()}
              >
                <Save className="h-4 w-4 mr-1" />
                Salvar modelo
              </Button>
              {step.id === "produtos" ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() =>
                      salvarMap.mutate({
                        itens: linhas.map((l) => ({
                          produtoComercialId: l.produtoComercialId,
                          categoriaCusto: l.categoriaCusto,
                          perfilProcesso: l.perfilProcesso,
                          kgPorUnidade: parseOptDecimal(l.kgPorUnidade),
                          modoCompraMp: l.modoCompraMp,
                          processoModeloId: l.processoModeloId
                            ? Number(l.processoModeloId)
                            : null,
                        })),
                      })
                    }
                  >
                    Salvar vínculos
                  </Button>
                  <Button
                    onClick={() => {
                      const ids = linhasVisiveis.map((l) => l.produtoComercialId);
                      gerar.mutate({ produtoIds: ids.length ? ids : undefined });
                    }}
                    disabled={gerar.isPending}
                  >
                    <Cog className="h-4 w-4 mr-1" /> Gerar fichas
                  </Button>
                </>
              ) : stepIdx < STEPS.length - 1 ? (
                <Button onClick={() => setStepIdx((i) => Math.min(STEPS.length - 1, i + 1))}>
                  Próximo <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
