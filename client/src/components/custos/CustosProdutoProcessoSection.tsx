import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  calcularLavagemReaisKgDeLote,
  DESCRICAO_PERFIL_PROCESSO,
  LABEL_PERFIL_PROCESSO_PRODUTO,
  nomeProdutoComercialGenerico,
  PERFIS_PROCESSO_PRODUTO,
  perfilUsaLavagemKg,
  type CustosProdutoProcessoConfig,
  type PerfilProcessoProduto,
} from "@shared/custosProdutoProcessoPadrao";
import {
  calcularLinhaProcessoIndustrial,
  LINHA_PROCESSO_INDUSTRIAL_PADRAO,
  modeloComumDeLinhaProcesso,
  type LinhaProcessoIndustrialInput,
} from "@shared/custosLinhaProcessoIndustrial";
import { Cog, Factory, PackagePlus, Save, TableProperties } from "lucide-react";
import {
  LABEL_REGIME_MO_ETAPA,
  REGIMES_MO_ETAPA,
  type RegimeMoEtapa,
} from "@shared/custosMoEquipe";

const fmtMoney = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type FormState = {
  embalagemMicroverdeUn: string;
  embalagemOutrosUn: string;
  lavagemReaisKg: string;
  lavagemMinutosUn: string;
  embalagemMinutosUn: string;
  corteMinutosUn: string;
  adesivoCustoUn: string;
  regimeMoPadrao: RegimeMoEtapa;
  incluirAdesivo: boolean;
  loteMinutos: string;
  loteKg: string;
  loteCustoHora: string;
};

type LinhaMap = {
  produtoComercialId: string;
  nome: string;
  semFicha: boolean;
  categoriaCusto: CategoriaProdutoCusto;
  perfilProcesso: PerfilProcessoProduto;
  kgPorUnidade: string;
  modoCompraMp: ModoCompraMp;
  perfilSugerido: PerfilProcessoProduto;
};

type LinhaForm = { [K in keyof LinhaProcessoIndustrialInput]: string };

function linhaToForm(l: LinhaProcessoIndustrialInput): LinhaForm {
  return {
    custoHoraMo: String(l.custoHoraMo),
    pesPorUnidadeRef: String(l.pesPorUnidadeRef),
    desfolhagemSegPorPe: String(l.desfolhagemSegPorPe),
    preLavagemKgHora: String(l.preLavagemKgHora),
    preLavagemEficienciaPct: String(l.preLavagemEficienciaPct),
    lavagemKgHora: String(l.lavagemKgHora),
    lavagemEficienciaPct: String(l.lavagemEficienciaPct),
    enxagueSeg: String(l.enxagueSeg),
    enxagueKg: String(l.enxagueKg),
    secagemMin: String(l.secagemMin),
    secagemKg: String(l.secagemKg),
    embalagemMinPorUn: String(l.embalagemMinPorUn),
    selagemMinPorCiclo: String(l.selagemMinPorCiclo),
    selagemUnPorCiclo: String(l.selagemUnPorCiclo),
  };
}

function linhaFormToInput(f: LinhaForm): LinhaProcessoIndustrialInput {
  return {
    custoHoraMo: parseOpt(f.custoHoraMo) ?? 0,
    pesPorUnidadeRef: parseOpt(f.pesPorUnidadeRef) ?? 1,
    desfolhagemSegPorPe: parseOpt(f.desfolhagemSegPorPe) ?? 0,
    preLavagemKgHora: parseOpt(f.preLavagemKgHora) ?? 300,
    preLavagemEficienciaPct: parseOpt(f.preLavagemEficienciaPct) ?? 70,
    lavagemKgHora: parseOpt(f.lavagemKgHora) ?? 300,
    lavagemEficienciaPct: parseOpt(f.lavagemEficienciaPct) ?? 70,
    enxagueSeg: parseOpt(f.enxagueSeg) ?? 0,
    enxagueKg: parseOpt(f.enxagueKg) ?? 1,
    secagemMin: parseOpt(f.secagemMin) ?? 0,
    secagemKg: parseOpt(f.secagemKg) ?? 1,
    embalagemMinPorUn: parseOpt(f.embalagemMinPorUn) ?? 0,
    selagemMinPorCiclo: parseOpt(f.selagemMinPorCiclo) ?? 0,
    selagemUnPorCiclo: parseOpt(f.selagemUnPorCiclo) ?? 1,
  };
}

function configToForm(config: CustosProdutoProcessoConfig): FormState {
  return {
    embalagemMicroverdeUn: String(config.embalagemMicroverdeUn),
    embalagemOutrosUn: String(config.embalagemOutrosUn),
    lavagemReaisKg: config.lavagemReaisKg != null ? String(config.lavagemReaisKg) : "",
    lavagemMinutosUn: config.lavagemMinutosUn != null ? String(config.lavagemMinutosUn) : "",
    embalagemMinutosUn: config.embalagemMinutosUn != null ? String(config.embalagemMinutosUn) : "",
    corteMinutosUn: config.corteMinutosUn != null ? String(config.corteMinutosUn) : "",
    adesivoCustoUn: config.adesivoCustoUn != null ? String(config.adesivoCustoUn) : "",
    regimeMoPadrao: config.regimeMoPadrao,
    incluirAdesivo: config.incluirAdesivo,
    loteMinutos: "",
    loteKg: "",
    loteCustoHora: "30",
  };
}

function parseOpt(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formToPayload(form: FormState, linhaProcesso: LinhaProcessoIndustrialInput) {
  return {
    embalagemMicroverdeUn: parseOpt(form.embalagemMicroverdeUn) ?? 0.95,
    embalagemOutrosUn: parseOpt(form.embalagemOutrosUn) ?? 0.6,
    lavagemReaisKg: parseOpt(form.lavagemReaisKg),
    lavagemMinutosUn: parseOpt(form.lavagemMinutosUn),
    embalagemMinutosUn: parseOpt(form.embalagemMinutosUn),
    corteMinutosUn: parseOpt(form.corteMinutosUn),
    adesivoCustoUn: parseOpt(form.adesivoCustoUn),
    regimeMoPadrao: form.regimeMoPadrao,
    incluirAdesivo: form.incluirAdesivo,
    linhaProcesso,
  };
}

function PreviewEtapas({
  titulo,
  etapas,
}: {
  titulo: string;
  etapas: Array<{
    tipo: string;
    nome: string;
    custoPorUnidade: number;
    custoPorKgProcessado: number | null;
    minutosPorUnidade: number | null;
  }>;
}) {
  if (etapas.length === 0) {
    return <p className="text-xs text-muted-foreground">{titulo}: nenhuma etapa.</p>;
  }
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <ul className="text-xs space-y-0.5">
        {etapas.map((e, i) => (
          <li key={i} className="flex flex-wrap gap-x-2">
            <span>{e.nome || LABEL_ETAPA_PROCESSO[e.tipo as keyof typeof LABEL_ETAPA_PROCESSO]}</span>
            {e.custoPorUnidade > 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400">{fmtMoney(e.custoPorUnidade)}/un</span>
            ) : null}
            {e.custoPorKgProcessado != null && e.custoPorKgProcessado > 0 ? (
              <span className="text-blue-700 dark:text-blue-400">{fmtMoney(e.custoPorKgProcessado)}/kg</span>
            ) : null}
            {e.minutosPorUnidade != null && e.minutosPorUnidade > 0 ? (
              <span className="text-muted-foreground">{e.minutosPorUnidade} min/un</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CustosProdutoProcessoSection() {
  const utils = trpc.useUtils();
  const configQuery = trpc.custosProducao.produtos.processoConfig.useQuery();
  const produtosQuery = trpc.custosProducao.produtos.listarProdutosComercial.useQuery();
  const [form, setForm] = useState<FormState | null>(null);
  const [linhaForm, setLinhaForm] = useState<LinhaForm>(() =>
    linhaToForm(LINHA_PROCESSO_INDUSTRIAL_PADRAO),
  );
  const [linhas, setLinhas] = useState<LinhaMap[]>([]);
  const [filtroSemFicha, setFiltroSemFicha] = useState(true);

  useEffect(() => {
    if (configQuery.data?.config && !form) {
      setForm(configToForm(configQuery.data.config));
    }
  }, [configQuery.data?.config, form]);

  useEffect(() => {
    const lp = configQuery.data?.config?.linhaProcesso;
    if (lp) setLinhaForm(linhaToForm(lp));
  }, [configQuery.data?.config?.linhaProcesso]);

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
        modoCompraMp: (p.mapeamento.modoCompraMp ?? "kg") as ModoCompraMp,
        perfilSugerido: p.perfilSugerido,
      })),
    );
  }, [produtosQuery.data]);

  const salvar = trpc.custosProducao.produtos.salvarProcessoConfig.useMutation({
    onSuccess: async (data) => {
      toast.success("Modelo de processo salvo");
      setForm(configToForm(data.config));
      await utils.custosProducao.produtos.processoConfig.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const salvarMap = trpc.custosProducao.produtos.salvarMapeamentos.useMutation({
    onSuccess: async (_data, variables) => {
      toast.success(`Classificação salva (${variables.itens.length} produto(s))`);
      await utils.custosProducao.produtos.listarProdutosComercial.invalidate();
      await utils.custosProducao.produtos.produtosSemFicha.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const gerar = trpc.custosProducao.produtos.gerarFichasContaAzul.useMutation({
    onSuccess: async (data) => {
      if (data.inseridos === 0 && data.atualizados === 0) {
        toast.info("Nenhuma ficha nova criada.");
      } else {
        toast.success(
          `${data.inseridos} ficha(s) criada(s)${data.atualizados ? `, ${data.atualizados} atualizada(s)` : ""}.`,
        );
      }
      if (data.avisos?.length) {
        toast.warning(
          `${data.avisos.length} aviso(s) — revise kg/un, R$/kg lavagem e matéria-prima nas fichas.`,
          { description: data.avisos.slice(0, 3).join(" · ") },
        );
      }
      await utils.custosProducao.produtos.listarFichas.invalidate();
      await utils.custosProducao.produtos.listarProdutosComercial.invalidate();
      await utils.custosProducao.produtos.produtosSemFicha.invalidate();
      await utils.custosProducao.rentabilidade.sugestaoCustoOperacional.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const preview = configQuery.data?.preview;
  const linhasVisiveis = useMemo(
    () => (filtroSemFicha ? linhas.filter((l) => l.semFicha) : linhas),
    [filtroSemFicha, linhas],
  );
  const pendentes = linhas.filter((l) => l.semFicha).length;

  const lavagemCalc = useMemo(() => {
    if (!form) return null;
    return calcularLavagemReaisKgDeLote({
      minutosLote: parseOpt(form.loteMinutos) ?? 0,
      kgTotalLote: parseOpt(form.loteKg) ?? 0,
      custoHoraMo: parseOpt(form.loteCustoHora) ?? 0,
    });
  }, [form]);

  const linhaCalc = useMemo(() => calcularLinhaProcessoIndustrial(linhaFormToInput(linhaForm)), [linhaForm]);
  const linhaModelo = useMemo(() => modeloComumDeLinhaProcesso(linhaCalc), [linhaCalc]);

  function updateLinhaForm(patch: Partial<LinhaForm>) {
    setLinhaForm((prev) => ({ ...prev, ...patch }));
  }

  function aplicarLinhaAoModelo() {
    setForm((f) =>
      f
        ? {
            ...f,
            lavagemReaisKg: String(linhaModelo.lavagemReaisKg),
            corteMinutosUn: String(linhaModelo.corteMinutosUn),
            embalagemMinutosUn: String(linhaModelo.embalagemMinutosUn),
          }
        : f,
    );
    toast.success("Valores da linha aplicados ao modelo (R$/kg, corte e embalagem).");
  }

  if (!form) return null;

  function updateMapLinha(id: string, patch: Partial<LinhaMap>) {
    setLinhas((prev) => prev.map((l) => (l.produtoComercialId === id ? { ...l, ...patch } : l)));
  }

  function mapItensSalvar(alvo: LinhaMap[]) {
    return alvo.map((l) => ({
      produtoComercialId: l.produtoComercialId,
      categoriaCusto: l.categoriaCusto,
      perfilProcesso: l.perfilProcesso,
      kgPorUnidade: parseOpt(l.kgPorUnidade),
      modoCompraMp: l.modoCompraMp,
    }));
  }

  function salvarClassificacao() {
    const alvo = filtroSemFicha ? linhas.filter((l) => l.semFicha) : linhas;
    if (alvo.length === 0) return toast.error("Nenhum produto para salvar.");
    salvarMap.mutate({ itens: mapItensSalvar(alvo) });
  }

  async function gerarFichasComClassificacao() {
    const alvo = linhas.filter((l) => l.semFicha);
    if (alvo.length === 0) return toast.info("Nenhum produto pendente.");
    const config = configQuery.data?.config;
    const faltamLavagem =
      config && !(config.lavagemReaisKg != null && config.lavagemReaisKg > 0)
        ? alvo.filter((l) => perfilUsaLavagemKg(l.perfilProcesso)).length
        : 0;
    const msg = [
      `Gerar fichas para ${alvo.length} produto(s)?`,
      "",
      "A classificação visível será salva antes de gerar.",
      faltamLavagem > 0
        ? `⚠ ${faltamLavagem} produto(s) com lavagem, mas modelo sem R$/kg — lavagem ficará zerada.`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
    if (!window.confirm(msg)) return;
    try {
      await salvarMap.mutateAsync({ itens: mapItensSalvar(alvo) });
      gerar.mutate({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar classificação.");
    }
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Factory className="h-4 w-4" />
        <AlertTitle>Processo complexo → 3 números simples nas fichas</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>
            Descreva sua linha real abaixo (tempos e capacidades). O sistema converte em{" "}
            <strong>R$/kg de processamento</strong> (pré-lav + lav + enxague + secagem),{" "}
            <strong>min/un de desfolhagem</strong> e <strong>min/un de embalagem+selagem</strong>.
          </p>
          <p>
            Na ficha de cada produto: lavagem = R$/kg × kg/un · desfolhagem/embalagem = min/un × R$/h
            das equipes. Matéria-prima e insumo de embalagem (R$ 0,60 / 0,95) entram separado.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sua linha de processo</CardTitle>
          <CardDescription>
            Valores padrão já vêm do seu fluxo (30 s/pé, 300 kg/h a 70%, etc.). Ajuste e clique em
            aplicar — não precisa calcular na mão.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">R$/h MO (processamento)</Label>
              <Input inputMode="decimal" value={linhaForm.custoHoraMo} onChange={(e) => updateLinhaForm({ custoHoraMo: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pés/un vendida (ref.)</Label>
              <Input inputMode="decimal" value={linhaForm.pesPorUnidadeRef} onChange={(e) => updateLinhaForm({ pesPorUnidadeRef: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desfolhagem (s/pé)</Label>
              <Input inputMode="decimal" value={linhaForm.desfolhagemSegPorPe} onChange={(e) => updateLinhaForm({ desfolhagemSegPorPe: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Embalagem (min/un)</Label>
              <Input inputMode="decimal" value={linhaForm.embalagemMinPorUn} onChange={(e) => updateLinhaForm({ embalagemMinPorUn: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pré-lavagem kg/h (nominal)</Label>
              <Input inputMode="decimal" value={linhaForm.preLavagemKgHora} onChange={(e) => updateLinhaForm({ preLavagemKgHora: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pré-lavagem eficiência (%)</Label>
              <Input inputMode="decimal" value={linhaForm.preLavagemEficienciaPct} onChange={(e) => updateLinhaForm({ preLavagemEficienciaPct: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lavagem kg/h (nominal)</Label>
              <Input inputMode="decimal" value={linhaForm.lavagemKgHora} onChange={(e) => updateLinhaForm({ lavagemKgHora: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lavagem eficiência (%)</Label>
              <Input inputMode="decimal" value={linhaForm.lavagemEficienciaPct} onChange={(e) => updateLinhaForm({ lavagemEficienciaPct: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Enxague (s por…)</Label>
              <div className="flex gap-1">
                <Input className="w-20" inputMode="decimal" value={linhaForm.enxagueSeg} onChange={(e) => updateLinhaForm({ enxagueSeg: e.target.value })} />
                <span className="self-center text-xs text-muted-foreground">s /</span>
                <Input className="flex-1" inputMode="decimal" value={linhaForm.enxagueKg} onChange={(e) => updateLinhaForm({ enxagueKg: e.target.value })} />
                <span className="self-center text-xs text-muted-foreground">kg</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Secagem (min por…)</Label>
              <div className="flex gap-1">
                <Input className="w-20" inputMode="decimal" value={linhaForm.secagemMin} onChange={(e) => updateLinhaForm({ secagemMin: e.target.value })} />
                <span className="self-center text-xs text-muted-foreground">min /</span>
                <Input className="flex-1" inputMode="decimal" value={linhaForm.secagemKg} onChange={(e) => updateLinhaForm({ secagemKg: e.target.value })} />
                <span className="self-center text-xs text-muted-foreground">kg</span>
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Selagem (min por N produtos)</Label>
              <div className="flex gap-1">
                <Input className="w-20" inputMode="decimal" value={linhaForm.selagemMinPorCiclo} onChange={(e) => updateLinhaForm({ selagemMinPorCiclo: e.target.value })} />
                <span className="self-center text-xs text-muted-foreground">min /</span>
                <Input className="w-20" inputMode="decimal" value={linhaForm.selagemUnPorCiclo} onChange={(e) => updateLinhaForm({ selagemUnPorCiclo: e.target.value })} />
                <span className="self-center text-xs text-muted-foreground">un</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Tempo</TableHead>
                  <TableHead>MO/un ou /kg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhaCalc.etapas.map((e) => (
                  <TableRow key={e.nome}>
                    <TableCell className="text-sm">{e.nome}</TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {e.minPorUn != null
                        ? `${e.minPorUn} min/un`
                        : e.minPorKg != null
                          ? `${e.minPorKg} min/kg`
                          : "—"}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
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

          <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 p-3 text-sm space-y-1">
            <p>
              <strong>→ Ficha (lavagem):</strong> {fmtMoney(linhaModelo.lavagemReaisKg)}/kg processado
              <span className="text-muted-foreground text-xs"> (soma pré-lav + lav + enxague + secagem)</span>
            </p>
            <p>
              <strong>→ Ficha (desfolhagem):</strong> {linhaModelo.corteMinutosUn} min/un
              <span className="text-muted-foreground text-xs"> (com {linhaForm.pesPorUnidadeRef} pé/un ref.)</span>
            </p>
            <p>
              <strong>→ Ficha (embalagem MO):</strong> {linhaModelo.embalagemMinutosUn} min/un
              <span className="text-muted-foreground text-xs"> (embalagem + selagem)</span>
            </p>
          </div>

          {linhaCalc.alertas.length > 0 ? (
            <ul className="text-xs text-amber-700 dark:text-amber-400 list-disc pl-4">
              {linhaCalc.alertas.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : null}

          <Button type="button" variant="secondary" size="sm" onClick={aplicarLinhaAoModelo}>
            Aplicar ao modelo abaixo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cog className="h-4 w-4" />
            Valores comuns de processo (fichas)
          </CardTitle>
          <CardDescription>
            Estes 3 campos alimentam as fichas geradas. Use &quot;Aplicar ao modelo&quot; acima ou preencha manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Embalagem microverdes (R$/un)</Label>
              <Input
                inputMode="decimal"
                value={form.embalagemMicroverdeUn}
                onChange={(e) => setForm((f) => f && { ...f, embalagemMicroverdeUn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Embalagem demais (R$/un)</Label>
              <Input
                inputMode="decimal"
                value={form.embalagemOutrosUn}
                onChange={(e) => setForm((f) => f && { ...f, embalagemOutrosUn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Lavagem — R$/kg médio (lote)</Label>
              <Input
                inputMode="decimal"
                value={form.lavagemReaisKg}
                placeholder="Ex.: 0,25"
                onChange={(e) => setForm((f) => f && { ...f, lavagemReaisKg: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Regime MO (minutos embalagem)</Label>
              <Select
                value={form.regimeMoPadrao}
                onValueChange={(v) =>
                  setForm((f) => f && { ...f, regimeMoPadrao: v as RegimeMoEtapa })
                }
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
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium">Calculadora de lote (lavagem)</p>
            <div className="grid gap-2 sm:grid-cols-4">
              <Input
                placeholder="Minutos do lote"
                inputMode="decimal"
                value={form.loteMinutos}
                onChange={(e) => setForm((f) => f && { ...f, loteMinutos: e.target.value })}
              />
              <Input
                placeholder="Kg total lavados"
                inputMode="decimal"
                value={form.loteKg}
                onChange={(e) => setForm((f) => f && { ...f, loteKg: e.target.value })}
              />
              <Input
                placeholder="R$/h MO"
                inputMode="decimal"
                value={form.loteCustoHora}
                onChange={(e) => setForm((f) => f && { ...f, loteCustoHora: e.target.value })}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={lavagemCalc == null}
                onClick={() => {
                  if (lavagemCalc == null) return;
                  setForm((f) =>
                    f ? { ...f, lavagemReaisKg: String(lavagemCalc) } : f,
                  );
                  toast.success(`R$/kg aplicado: ${lavagemCalc.toFixed(4)}`);
                }}
              >
                Usar {lavagemCalc != null ? lavagemCalc.toFixed(4) : "—"} R$/kg
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Fórmula: (minutos ÷ 60 × R$/h) ÷ kg do lote. Revise mensalmente conforme lotes reais.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Embalagem MO (min/un)</Label>
              <Input
                inputMode="decimal"
                value={form.embalagemMinutosUn}
                placeholder="Opcional"
                onChange={(e) => setForm((f) => f && { ...f, embalagemMinutosUn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Corte / desfolhagem MO (min/un)</Label>
              <Input
                inputMode="decimal"
                value={form.corteMinutosUn}
                placeholder="Da linha de processo"
                onChange={(e) => setForm((f) => f && { ...f, corteMinutosUn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Adesivo (R$/un)</Label>
              <Input
                inputMode="decimal"
                value={form.adesivoCustoUn}
                placeholder="Opcional"
                onChange={(e) => setForm((f) => f && { ...f, adesivoCustoUn: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.incluirAdesivo}
              onCheckedChange={(v) => setForm((f) => f && { ...f, incluirAdesivo: v })}
            />
            <Label className="font-normal text-sm">Incluir adesivo quando houver valor</Label>
          </div>

          {preview ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-lg border bg-muted/20 p-3">
              {(Object.keys(preview) as Array<keyof typeof preview>).map((k) => (
                <PreviewEtapas
                  key={k}
                  titulo={LABEL_PERFIL_PROCESSO_PRODUTO[k as PerfilProcessoProduto]}
                  etapas={preview[k]}
                />
              ))}
            </div>
          ) : null}

          <Button
            size="sm"
            disabled={salvar.isPending}
            onClick={() => salvar.mutate(formToPayload(form, linhaFormToInput(linhaForm)))}
          >
            <Save className="h-4 w-4 mr-1" />
            Salvar modelo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TableProperties className="h-4 w-4" />
                Classificar produtos do Conta Azul
              </CardTitle>
              <CardDescription>
                Ajuste perfil e kg/un antes de gerar fichas. Sugestão automática pode errar — confira
                microverdes sem nome e itens sem lavagem.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={filtroSemFicha} onCheckedChange={setFiltroSemFicha} />
              <Label className="font-normal text-sm">Só sem ficha ({pendentes})</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto max-h-[420px] border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Perfil de processo</TableHead>
                  <TableHead className="w-24">Kg/un</TableHead>
                  <TableHead className="w-28">Compra MP</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhasVisiveis.map((l) => {
                  const kgFaltando =
                    perfilUsaLavagemKg(l.perfilProcesso) && !parseOpt(l.kgPorUnidade);
                  const nomeGenerico = nomeProdutoComercialGenerico(l.nome);
                  return (
                  <TableRow key={l.produtoComercialId} className={kgFaltando ? "bg-amber-50/50 dark:bg-amber-950/20" : undefined}>
                    <TableCell className="max-w-[200px]">
                      <p className="text-sm font-medium truncate">{l.nome}</p>
                      {nomeGenerico ? (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400">
                          Nome genérico — confira categoria/perfil
                        </p>
                      ) : null}
                      {l.perfilProcesso !== l.perfilSugerido ? (
                        <p className="text-[10px] text-amber-700 dark:text-amber-400">
                          Sugestão: {LABEL_PERFIL_PROCESSO_PRODUTO[l.perfilSugerido]}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={l.categoriaCusto}
                        onValueChange={(v) =>
                          updateMapLinha(l.produtoComercialId, {
                            categoriaCusto: v as CategoriaProdutoCusto,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIAS_PRODUTO_CUSTO.map((c) => (
                            <SelectItem key={c} value={c}>
                              {LABEL_CATEGORIA_PRODUTO_CUSTO[c]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={l.perfilProcesso}
                        onValueChange={(v) =>
                          updateMapLinha(l.produtoComercialId, {
                            perfilProcesso: v as PerfilProcessoProduto,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs max-w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERFIS_PROCESSO_PRODUTO.map((p) => (
                            <SelectItem key={p} value={p} title={DESCRICAO_PERFIL_PROCESSO[p]}>
                              {LABEL_PERFIL_PROCESSO_PRODUTO[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className={`h-8 text-xs ${kgFaltando ? "border-amber-500" : ""}`}
                        inputMode="decimal"
                        placeholder={perfilUsaLavagemKg(l.perfilProcesso) ? "obrig. lavagem" : "opcional"}
                        title={
                          perfilUsaLavagemKg(l.perfilProcesso)
                            ? "Necessário para ratear lavagem R$/kg — deixe vazio só se não souber"
                            : "Opcional — para margem por kg"
                        }
                        value={l.kgPorUnidade}
                        onChange={(e) =>
                          updateMapLinha(l.produtoComercialId, { kgPorUnidade: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={l.modoCompraMp}
                        onValueChange={(v) =>
                          updateMapLinha(l.produtoComercialId, { modoCompraMp: v as ModoCompraMp })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODOS_COMPRA_MP.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m === "kg" ? "R$/kg" : "R$/un"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {l.semFicha ? (
                        <Badge variant="outline" className="text-[10px]">
                          Sem ficha
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          OK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={salvarMap.isPending} onClick={salvarClassificacao}>
              <Save className="h-4 w-4 mr-1" />
              Salvar classificação
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={gerar.isPending || salvarMap.isPending || pendentes === 0}
              onClick={() => void gerarFichasComClassificacao()}
            >
              <PackagePlus className="h-4 w-4 mr-1" />
              Gerar fichas ({pendentes})
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
