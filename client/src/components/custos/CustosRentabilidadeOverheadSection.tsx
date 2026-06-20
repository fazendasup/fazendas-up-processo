import { useMemo } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  GRUPOS_CUSTO_PRODUCAO,
  LABEL_GRUPO_CUSTO_PRODUCAO,
  type GrupoCustoProducao,
} from "@shared/custosProducao";
import {
  LABEL_MODO_OVERHEAD_RENTABILIDADE,
  LABEL_ORIGEM_OVERHEAD_RENTABILIDADE,
  MODOS_OVERHEAD_RENTABILIDADE,
  somarOverheadItensIncluidos,
  type ModoOverheadRentabilidade,
  type OrigemOverheadRentabilidade,
} from "@shared/custosRentabilidadeOverhead";
import { AlertTriangle, CloudDownload, Layers, Plus, Trash2 } from "lucide-react";

const fmtMoney = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export type OverheadItemForm = {
  key: string;
  id?: number;
  origem: OrigemOverheadRentabilidade;
  contaAzulParcelaId?: string;
  refModeloId?: number;
  grupo: GrupoCustoProducao | string;
  rubrica: string;
  descricao: string;
  valorOriginal: string;
  valor: string;
  incluido: boolean;
};

export function emptyOverheadItem(): OverheadItemForm {
  return {
    key: crypto.randomUUID(),
    origem: "manual",
    grupo: "overhead",
    rubrica: "",
    descricao: "",
    valorOriginal: "",
    valor: "",
    incluido: true,
  };
}

function parseNum(s: string): number {
  const t = s.trim().replace(",", ".");
  if (!t) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function chaveModelo(origem: string, refModeloId?: number) {
  return refModeloId != null ? `${origem}:${refModeloId}` : null;
}

type Props = {
  inicio: string;
  fim: string;
  modoOverhead: ModoOverheadRentabilidade;
  onModoOverheadChange: (modo: ModoOverheadRentabilidade) => void;
  custoOperacionalManual: string;
  onCustoOperacionalManualChange: (v: string) => void;
  itens: OverheadItemForm[];
  onItensChange: (itens: OverheadItemForm[]) => void;
  sugestaoTotal: number;
  sugestaoCompartilhados: number;
  sugestaoMo: number;
  sugestaoRubricas: Array<{ id: number; rubrica: string; grupo: string; valorMensal: number | null }>;
  sugestaoEquipes: Array<{ id: number; nome: string; regime: string; custoMensal: number | null }>;
};

export function CustosRentabilidadeOverheadSection({
  inicio,
  fim,
  modoOverhead,
  onModoOverheadChange,
  custoOperacionalManual,
  onCustoOperacionalManualChange,
  itens,
  onItensChange,
  sugestaoTotal,
  sugestaoCompartilhados,
  sugestaoMo,
  sugestaoRubricas,
  sugestaoEquipes,
}: Props) {
  const periodo = useMemo(
    () => ({
      inicio: new Date(`${inicio}T00:00:00`),
      fim: new Date(`${fim}T23:59:59`),
    }),
    [inicio, fim],
  );

  const pagamentosCa = trpc.custosProducao.rentabilidade.pagamentosContaAzul.useQuery(periodo, {
    enabled: false,
  });
  const modelo = trpc.custosProducao.rentabilidade.itensModeloOverhead.useQuery();

  const totalItens = useMemo(
    () =>
      somarOverheadItensIncluidos(
        itens.map((i) => ({ valor: parseNum(i.valor), incluido: i.incluido })),
      ),
    [itens],
  );

  const updateItem = (key: string, patch: Partial<OverheadItemForm>) => {
    onItensChange(itens.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  };

  const removerItem = (key: string) => {
    onItensChange(itens.filter((i) => i.key !== key));
  };

  const mergePagamentos = async () => {
    const res = await pagamentosCa.refetch();
    const data = res.data;
    if (!data?.itens.length) {
      toast.error("Nenhum pagamento do Conta Azul neste período.");
      return;
    }
    const existentes = new Set(itens.map((i) => i.contaAzulParcelaId).filter(Boolean));
    const novos = data.itens.filter((p) => !existentes.has(p.contaAzulParcelaId));
    if (novos.length === 0) {
      toast.info("Todos os pagamentos deste período já estão na lista.");
      return;
    }
    onItensChange([
      ...itens,
      ...novos.map((p) => ({
        key: crypto.randomUUID(),
        origem: "conta_azul" as const,
        contaAzulParcelaId: p.contaAzulParcelaId,
        grupo: p.grupo,
        rubrica: p.rubrica,
        descricao: p.descricao ?? "",
        valorOriginal: String(p.valor),
        valor: String(p.valor),
        incluido: true,
      })),
    ]);
    toast.success(
      `${novos.length} pagamento(s) importados${data.aviso ? `. ${data.aviso}` : ""}`,
    );
  };

  const mergeModelo = () => {
    const modelos = modelo.data ?? [];
    if (modelos.length === 0) {
      toast.error("Nenhum item de modelo em Compartilhados ou MO fixa.");
      return;
    }
    const existentes = new Set(
      itens.map((i) => chaveModelo(i.origem, i.refModeloId)).filter(Boolean) as string[],
    );
    const novos = modelos.filter((m) => !existentes.has(chaveModelo(m.origem, m.refModeloId)!));
    if (novos.length === 0) {
      toast.info("Itens de modelo já presentes — evite duplicar com pagamentos do CA.");
      return;
    }
    if (
      !window.confirm(
        `Adicionar ${novos.length} item(ns) do cadastro (Compartilhados + MO fixa)? Revise duplicatas com pagamentos importados.`,
      )
    ) {
      return;
    }
    onItensChange([
      ...itens,
      ...novos.map((m) => ({
        key: crypto.randomUUID(),
        origem: m.origem,
        refModeloId: m.refModeloId,
        grupo: m.grupo,
        rubrica: m.rubrica,
        descricao: m.descricao ?? "",
        valorOriginal: String(m.valorOriginal),
        valor: String(m.valor),
        incluido: m.incluido,
      })),
    ]);
    toast.success(`${novos.length} item(ns) de modelo adicionados.`);
  };

  return (
    <>
      <div className="space-y-2 md:col-span-2">
        <Label>Modo de overhead operacional</Label>
        <Select
          value={modoOverhead}
          onValueChange={(v) => onModoOverheadChange(v as ModoOverheadRentabilidade)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODOS_OVERHEAD_RENTABILIDADE.map((m) => (
              <SelectItem key={m} value={m}>
                {LABEL_MODO_OVERHEAD_RENTABILIDADE[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Recomendado: importe pagamentos reais do Conta Azul, ajuste valores e exclua o que já entra
          no CMV ou em outra rubrica — sem duplicar folha, insumos ou consultorias.
        </p>
      </div>

      {modoOverhead === "manual" ? (
        <div className="space-y-2 md:col-span-2">
          <Label>Custo operacional do período (R$)</Label>
          <Input
            inputMode="decimal"
            value={custoOperacionalManual}
            onChange={(e) => onCustoOperacionalManualChange(e.target.value)}
            placeholder="Total único: admin, energia, BPO, combustível..."
          />
        </div>
      ) : null}

      {modoOverhead === "sugerido" ? (
        (sugestaoRubricas.length ?? 0) > 0 || (sugestaoEquipes.length ?? 0) > 0 ? (
          <div className="md:col-span-2 rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">R$/mês</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sugestaoRubricas.map((r) => (
                  <TableRow key={`r-${r.id}`}>
                    <TableCell className="text-xs">Compartilhados</TableCell>
                    <TableCell>
                      <span className="text-[11px] text-muted-foreground block">
                        {LABEL_GRUPO_CUSTO_PRODUCAO[r.grupo as GrupoCustoProducao] ?? r.grupo}
                      </span>
                      {r.rubrica}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMoney(r.valorMensal)}
                    </TableCell>
                  </TableRow>
                ))}
                {sugestaoEquipes.map((e) => (
                  <TableRow key={`e-${e.id}`}>
                    <TableCell className="text-xs">MO fixa ({e.regime.toUpperCase()})</TableCell>
                    <TableCell>{e.nome}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMoney(e.custoMensal)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell colSpan={2}>Total sugerido</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(sugestaoTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        ) : (
          <Alert className="md:col-span-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Cadastre rubricas em Compartilhados ou equipes MO overhead, ou use o modo curado com
              importação do Conta Azul.
            </AlertDescription>
          </Alert>
        )
      ) : null}

      {modoOverhead === "itens" ? (
        <div className="md:col-span-2 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagamentosCa.isFetching}
              onClick={() => void mergePagamentos()}
            >
              <CloudDownload className="h-4 w-4 mr-1" />
              Importar pagamentos CA
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={mergeModelo}>
              <Layers className="h-4 w-4 mr-1" />
              Adicionar do cadastro
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onItensChange([...itens, emptyOverheadItem()])}
            >
              <Plus className="h-4 w-4 mr-1" />
              Linha manual
            </Button>
          </div>

          {itens.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Importe pagamentos do mês no Conta Azul ou adicione rubricas manualmente (BPO,
                combustível, consultorias). Marque apenas o que compõe o overhead deste período.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Inc.</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Rubrica</TableHead>
                    <TableHead>Detalhe</TableHead>
                    <TableHead className="text-right w-28">Original</TableHead>
                    <TableHead className="text-right w-32">Valor (R$)</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.key} className={!item.incluido ? "opacity-50" : undefined}>
                      <TableCell>
                        <Switch
                          checked={item.incluido}
                          onCheckedChange={(v) => updateItem(item.key, { incluido: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {LABEL_ORIGEM_OVERHEAD_RENTABILIDADE[item.origem]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.grupo}
                          onValueChange={(v) => updateItem(item.key, { grupo: v })}
                        >
                          <SelectTrigger className="h-8 text-xs min-w-[8rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GRUPOS_CUSTO_PRODUCAO.map((g) => (
                              <SelectItem key={g} value={g}>
                                {LABEL_GRUPO_CUSTO_PRODUCAO[g]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs min-w-[10rem]"
                          value={item.rubrica}
                          onChange={(e) => updateItem(item.key, { rubrica: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs min-w-[8rem]"
                          value={item.descricao}
                          onChange={(e) => updateItem(item.key, { descricao: e.target.value })}
                          placeholder="Fornecedor, obs."
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {item.valorOriginal ? fmtMoney(parseNum(item.valorOriginal)) : "—"}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="h-8 text-xs text-right tabular-nums"
                          inputMode="decimal"
                          value={item.valor}
                          onChange={(e) => updateItem(item.key, { valor: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => removerItem(item.key)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell colSpan={6}>Total incluído no período</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(totalItens)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Sugestão cadastro (referência): {fmtMoney(sugestaoTotal)} — Compartilhados{" "}
            {fmtMoney(sugestaoCompartilhados)} + MO fixa {fmtMoney(sugestaoMo)}. Não some automaticamente
            para evitar duplicar folha ou despesas já importadas do CA.
          </p>
        </div>
      ) : null}
    </>
  );
}
