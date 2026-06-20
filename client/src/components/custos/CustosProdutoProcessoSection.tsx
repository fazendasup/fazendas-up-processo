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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LABEL_ETAPA_PROCESSO,
  LABEL_CATEGORIA_PRODUTO_CUSTO,
} from "@shared/custosProduto";
import {
  LABEL_REGIME_MO_ETAPA,
  REGIMES_MO_ETAPA,
  type RegimeMoEtapa,
} from "@shared/custosMoEquipe";
import type { CustosProdutoProcessoConfig } from "@shared/custosProdutoProcessoPadrao";
import { Cog, Factory, PackagePlus, Save } from "lucide-react";

const fmtMoney = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type FormState = {
  embalagemMicroverdeUn: string;
  embalagemOutrosUn: string;
  lavagemMinutosUn: string;
  embalagemMinutosUn: string;
  corteMinutosUn: string;
  adesivoCustoUn: string;
  regimeMoPadrao: RegimeMoEtapa;
  incluirLavagem: boolean;
  incluirCorte: boolean;
  incluirAdesivo: boolean;
};

function configToForm(config: CustosProdutoProcessoConfig): FormState {
  return {
    embalagemMicroverdeUn: String(config.embalagemMicroverdeUn),
    embalagemOutrosUn: String(config.embalagemOutrosUn),
    lavagemMinutosUn: config.lavagemMinutosUn != null ? String(config.lavagemMinutosUn) : "",
    embalagemMinutosUn: config.embalagemMinutosUn != null ? String(config.embalagemMinutosUn) : "",
    corteMinutosUn: config.corteMinutosUn != null ? String(config.corteMinutosUn) : "",
    adesivoCustoUn: config.adesivoCustoUn != null ? String(config.adesivoCustoUn) : "",
    regimeMoPadrao: config.regimeMoPadrao,
    incluirLavagem: config.incluirLavagem,
    incluirCorte: config.incluirCorte,
    incluirAdesivo: config.incluirAdesivo,
  };
}

function parseOpt(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function formToPayload(form: FormState) {
  return {
    embalagemMicroverdeUn: parseOpt(form.embalagemMicroverdeUn) ?? 0.95,
    embalagemOutrosUn: parseOpt(form.embalagemOutrosUn) ?? 0.6,
    lavagemMinutosUn: parseOpt(form.lavagemMinutosUn),
    embalagemMinutosUn: parseOpt(form.embalagemMinutosUn),
    corteMinutosUn: parseOpt(form.corteMinutosUn),
    adesivoCustoUn: parseOpt(form.adesivoCustoUn),
    regimeMoPadrao: form.regimeMoPadrao,
    incluirLavagem: form.incluirLavagem,
    incluirCorte: form.incluirCorte,
    incluirAdesivo: form.incluirAdesivo,
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
    minutosPorUnidade: number | null;
  }>;
}) {
  if (etapas.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {titulo}: nenhuma etapa ativa — ajuste os toggles ou minutos acima.
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <ul className="text-xs space-y-0.5">
        {etapas.map((e, i) => (
          <li key={i} className="flex flex-wrap gap-x-2 gap-y-0.5">
            <span>{e.nome || LABEL_ETAPA_PROCESSO[e.tipo as keyof typeof LABEL_ETAPA_PROCESSO]}</span>
            {e.custoPorUnidade > 0 ? (
              <span className="text-emerald-700 dark:text-emerald-400">{fmtMoney(e.custoPorUnidade)}/un</span>
            ) : null}
            {e.minutosPorUnidade != null && e.minutosPorUnidade > 0 ? (
              <span className="text-muted-foreground">{e.minutosPorUnidade} min/un (MO)</span>
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
  const semFicha = trpc.custosProducao.produtos.produtosSemFicha.useQuery();
  const [form, setForm] = useState<FormState | null>(null);

  useEffect(() => {
    if (configQuery.data?.config && !form) {
      setForm(configToForm(configQuery.data.config));
    }
  }, [configQuery.data?.config, form]);

  const salvar = trpc.custosProducao.produtos.salvarProcessoConfig.useMutation({
    onSuccess: async (data) => {
      toast.success("Modelo de processo salvo");
      setForm(configToForm(data.config));
      await utils.custosProducao.produtos.processoConfig.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const gerar = trpc.custosProducao.produtos.gerarFichasContaAzul.useMutation({
    onSuccess: async (data) => {
      if (data.inseridos === 0 && data.atualizados === 0) {
        toast.info("Nenhuma ficha nova criada — todos os produtos já tinham ficha.");
      } else {
        toast.success(
          `${data.inseridos} ficha(s) criada(s)${data.atualizados ? `, ${data.atualizados} atualizada(s)` : ""}.`,
        );
      }
      await utils.custosProducao.produtos.listarFichas.invalidate();
      await utils.custosProducao.produtos.produtosSemFicha.invalidate();
      await utils.custosProducao.rentabilidade.sugestaoCustoOperacional.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const preview = useMemo(() => {
    if (!form) return configQuery.data?.preview;
    const payload = formToPayload(form);
    return {
      microverde: payload.embalagemMicroverdeUn
        ? [
            ...(payload.incluirLavagem && payload.lavagemMinutosUn
              ? [{ tipo: "lavagem", nome: "Lavagem industrial", custoPorUnidade: 0, minutosPorUnidade: payload.lavagemMinutosUn }]
              : []),
            {
              tipo: "embalagem",
              nome: "Embalagem",
              custoPorUnidade: payload.embalagemMicroverdeUn,
              minutosPorUnidade: payload.embalagemMinutosUn,
            },
            ...(payload.incluirAdesivo && payload.adesivoCustoUn
              ? [{ tipo: "adesivo", nome: "Adesivo / rótulo", custoPorUnidade: payload.adesivoCustoUn, minutosPorUnidade: null }]
              : []),
          ]
        : [],
      outros: [
        ...(payload.incluirLavagem && payload.lavagemMinutosUn
          ? [{ tipo: "lavagem", nome: "Lavagem industrial", custoPorUnidade: 0, minutosPorUnidade: payload.lavagemMinutosUn }]
          : []),
        ...(payload.incluirCorte && payload.corteMinutosUn
          ? [{ tipo: "descasque_corte", nome: "Descasque / corte", custoPorUnidade: 0, minutosPorUnidade: payload.corteMinutosUn }]
          : []),
        {
          tipo: "embalagem",
          nome: "Embalagem",
          custoPorUnidade: payload.embalagemOutrosUn,
          minutosPorUnidade: payload.embalagemMinutosUn,
        },
        ...(payload.incluirAdesivo && payload.adesivoCustoUn
          ? [{ tipo: "adesivo", nome: "Adesivo / rótulo", custoPorUnidade: payload.adesivoCustoUn, minutosPorUnidade: null }]
          : []),
      ],
    };
  }, [form, configQuery.data?.preview]);

  if (!form) return null;

  const pendentes = semFicha.data?.length ?? 0;

  return (
    <div className="space-y-4">
      <Alert>
        <Factory className="h-4 w-4" />
        <AlertTitle>Modelo comum de processo (antes das fichas)</AlertTitle>
        <AlertDescription className="space-y-1">
          <p>
            <strong>Embalagem</strong> (R$ 0,95 microverdes · R$ 0,60 demais) é insumo, não salário.
            <strong> MO variável</strong> entra só via <em>minutos/unidade</em> × R$/h das equipes de
            processamento.
          </p>
          <p>
            <strong>MO fixa</strong> (ADM, supervisão, pró-labore) fica na Rentabilidade — não repita
            nas fichas nem use etapa &quot;Mão de obra&quot; com valor fixo.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cog className="h-4 w-4" />
            Valores comuns de processo
          </CardTitle>
          <CardDescription>
            Usados ao gerar fichas do Conta Azul e como ponto de partida em fichas novas.
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
              <Label>Embalagem demais produtos (R$/un)</Label>
              <Input
                inputMode="decimal"
                value={form.embalagemOutrosUn}
                onChange={(e) => setForm((f) => f && { ...f, embalagemOutrosUn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Adesivo / rótulo (R$/un)</Label>
              <Input
                inputMode="decimal"
                value={form.adesivoCustoUn}
                placeholder="Opcional"
                onChange={(e) => setForm((f) => f && { ...f, adesivoCustoUn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Regime MO padrão (minutos)</Label>
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

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Lavagem (min/un)</Label>
              <Input
                inputMode="decimal"
                value={form.lavagemMinutosUn}
                placeholder="Ex.: 2"
                onChange={(e) => setForm((f) => f && { ...f, lavagemMinutosUn: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.incluirLavagem}
                  onCheckedChange={(v) => setForm((f) => f && { ...f, incluirLavagem: v })}
                />
                <Label className="font-normal text-xs">Incluir lavagem</Label>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Embalagem (min/un — MO)</Label>
              <Input
                inputMode="decimal"
                value={form.embalagemMinutosUn}
                placeholder="Opcional"
                onChange={(e) => setForm((f) => f && { ...f, embalagemMinutosUn: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Corte (min/un)</Label>
              <Input
                inputMode="decimal"
                value={form.corteMinutosUn}
                placeholder="Opcional"
                onChange={(e) => setForm((f) => f && { ...f, corteMinutosUn: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.incluirCorte}
                  onCheckedChange={(v) => setForm((f) => f && { ...f, incluirCorte: v })}
                />
                <Label className="font-normal text-xs">Incluir corte</Label>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={form.incluirAdesivo}
              onCheckedChange={(v) => setForm((f) => f && { ...f, incluirAdesivo: v })}
            />
            <Label className="font-normal text-sm">Incluir etapa de adesivo quando houver valor</Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 rounded-lg border bg-muted/30 p-3">
            <PreviewEtapas
              titulo={`Prévia · ${LABEL_CATEGORIA_PRODUTO_CUSTO.microverde}`}
              etapas={preview?.microverde ?? []}
            />
            <PreviewEtapas
              titulo={`Prévia · demais (${LABEL_CATEGORIA_PRODUTO_CUSTO.outros})`}
              etapas={preview?.outros ?? []}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={salvar.isPending}
              onClick={() => salvar.mutate(formToPayload(form))}
            >
              <Save className="h-4 w-4 mr-1" />
              Salvar modelo
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={gerar.isPending || pendentes === 0}
              onClick={() => {
                if (
                  !window.confirm(
                    `Gerar fichas para ${pendentes} produto(s) do Conta Azul sem ficha?\n\n` +
                      "• Vincula produtoComercialId\n" +
                      "• Aplica etapas do modelo comum (embalagem + minutos MO)\n" +
                      "• Matéria-prima fica pendente — complete depois em cada ficha\n\n" +
                      "Salve o modelo antes se alterou algo acima.",
                  )
                ) {
                  return;
                }
                gerar.mutate({});
              }}
            >
              <PackagePlus className="h-4 w-4 mr-1" />
              Gerar fichas do Conta Azul ({pendentes})
            </Button>
          </div>

          {pendentes > 0 && semFicha.data ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {semFicha.data.slice(0, 12).map((p) => (
                <Badge key={p.id} variant="outline" className="font-normal text-[11px]">
                  {p.nome}
                  <span className="ml-1 text-muted-foreground">
                    ({LABEL_CATEGORIA_PRODUTO_CUSTO[p.categoriaCusto]})
                  </span>
                </Badge>
              ))}
              {pendentes > 12 ? (
                <Badge variant="secondary" className="font-normal text-[11px]">
                  +{pendentes - 12} produtos
                </Badge>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
