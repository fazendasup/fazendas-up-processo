import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FINALIDADES_MO_EQUIPE,
  LABEL_FINALIDADE_MO_EQUIPE,
  LABEL_REGIME_MO_EQUIPE,
  LABEL_MODO_CUSTO_MO_EQUIPE,
  REGIMES_MO_EQUIPE,
  type FinalidadeMoEquipe,
  type RegimeMoEquipe,
} from "@shared/custosMoEquipe";
import {
  CUSTO_MENSAL_TOTAL_OPERADOR_PJ,
  HORAS_MES_40H_SEMANA,
} from "@shared/custosMoEquipeOperadoresPj";
import { AlertTriangle, FileSpreadsheet, Pencil, Plus, Trash2, Users, UserPlus } from "lucide-react";

const fmtMoney = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type EquipeForm = {
  id?: number;
  nome: string;
  cargo: string;
  codigoFolha: string;
  regime: RegimeMoEquipe;
  finalidade: FinalidadeMoEquipe;
  numPessoas: string;
  horasMes: string;
  custoMensalBase: string;
  encargosPct: string;
  custoMensalTotal: string;
  liquidoMensal: string;
  observacoes: string;
  ativo: boolean;
};

function emptyForm(regime: RegimeMoEquipe = "clt"): EquipeForm {
  return {
    nome: "",
    cargo: "",
    codigoFolha: "",
    regime,
    finalidade: "processamento",
    numPessoas: "1",
    horasMes: "",
    custoMensalBase: "",
    encargosPct: regime === "clt" ? "80" : "",
    custoMensalTotal: "",
    liquidoMensal: "",
    observacoes: "",
    ativo: true,
  };
}

function parseNum(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function CustosMoEquipesPanel() {
  const utils = trpc.useUtils();
  const query = trpc.custosProducao.moEquipes.listar.useQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EquipeForm>(emptyForm());

  const salvar = trpc.custosProducao.moEquipes.salvar.useMutation({
    onSuccess: async () => {
      toast.success("Equipe salva");
      setOpen(false);
      await utils.custosProducao.moEquipes.listar.invalidate();
      await utils.custosProducao.rentabilidade.sugestaoCustoOperacional.invalidate();
      await utils.custosProducao.produtos.listarFichas.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const excluir = trpc.custosProducao.moEquipes.excluir.useMutation({
    onSuccess: async () => {
      toast.success("Equipe excluída");
      await utils.custosProducao.moEquipes.listar.invalidate();
      await utils.custosProducao.rentabilidade.sugestaoCustoOperacional.invalidate();
      await utils.custosProducao.produtos.listarFichas.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const cadastrarOperadoresPj = trpc.custosProducao.moEquipes.cadastrarOperadoresPjPadrao.useMutation({
    onSuccess: async (data) => {
      if (data.inseridos === 0) {
        toast.info("Os 7 operadores PJ já estavam cadastrados.");
      } else {
        toast.success(
          `${data.inseridos} operador(es) PJ cadastrados (${fmtMoney(data.custoMensalPorOperador)}/mês cada).`,
        );
      }
      await utils.custosProducao.moEquipes.listar.invalidate();
      await utils.custosProducao.rentabilidade.sugestaoCustoOperacional.invalidate();
      await utils.custosProducao.produtos.listarFichas.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const importarFolha = trpc.custosProducao.moEquipes.importarFolha052026.useMutation({
    onSuccess: async (data) => {
      toast.success(
        `Folha 05/2026: ${data.inseridos} novo(s), ${data.atualizados} atualizado(s).`,
      );
      await utils.custosProducao.moEquipes.listar.invalidate();
      await utils.custosProducao.rentabilidade.sugestaoCustoOperacional.invalidate();
      await utils.custosProducao.produtos.listarFichas.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const salvarConfig = trpc.custosProducao.moEquipes.salvarConfig.useMutation({
    onSuccess: async () => {
      await utils.custosProducao.moEquipes.listar.invalidate();
      await utils.custosProducao.rentabilidade.sugestaoCustoOperacional.invalidate();
      await utils.custosProducao.produtos.listarFichas.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const mapa = query.data?.mapaCustoHora;
  const equipes = query.data?.equipes ?? [];
  const usarLiquido = query.data?.config?.usarLiquidoDesembolso ?? false;
  const modoCusto = query.data?.modoCusto ?? "empregador";

  const resumo = useMemo(() => {
    const procClt = equipes.filter(
      (e) => e.ativo && e.finalidade === "processamento" && e.regime === "clt",
    );
    const procPj = equipes.filter(
      (e) => e.ativo && e.finalidade === "processamento" && e.regime === "pj",
    );
    return { procClt: procClt.length, procPj: procPj.length };
  }, [equipes]);

  function abrirNova(regime: RegimeMoEquipe) {
    setForm(emptyForm(regime));
    setOpen(true);
  }

  function abrirEditar(e: (typeof equipes)[number]) {
    setForm({
      id: e.id,
      nome: e.nome,
      cargo: e.cargo ?? "",
      codigoFolha: e.codigoFolha ?? "",
      regime: e.regime,
      finalidade: e.finalidade,
      numPessoas: String(e.numPessoas),
      horasMes: String(e.horasMes),
      custoMensalBase: e.custoMensalBase != null ? String(e.custoMensalBase) : "",
      encargosPct: e.encargosPct != null ? String(e.encargosPct) : "",
      custoMensalTotal: e.custoMensalTotal != null ? String(e.custoMensalTotal) : "",
      liquidoMensal: e.liquidoMensal != null ? String(e.liquidoMensal) : "",
      observacoes: e.observacoes ?? "",
      ativo: e.ativo !== false,
    });
    setOpen(true);
  }

  function handleSalvar() {
    salvar.mutate({
      id: form.id,
      nome: form.nome.trim(),
      cargo: form.cargo.trim() || null,
      codigoFolha: form.codigoFolha.trim() || null,
      regime: form.regime,
      finalidade: form.finalidade,
      numPessoas: parseNum(form.numPessoas) ?? 1,
      horasMes: parseNum(form.horasMes) ?? 0,
      custoMensalBase: parseNum(form.custoMensalBase),
      encargosPct: parseNum(form.encargosPct),
      custoMensalTotal: parseNum(form.custoMensalTotal),
      liquidoMensal: parseNum(form.liquidoMensal),
      observacoes: form.observacoes.trim() || null,
      ativo: form.ativo,
    });
  }

  return (
    <div className="space-y-4 mt-4">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertTitle>Equipes CLT e PJ — base para custo/hora automático</AlertTitle>
        <AlertDescription>
          Cadastre folha/contrato e horas produtivas. O sistema calcula R$/h e aplica nas fichas de{" "}
          <strong>Produtos vendidos</strong> via <strong>minutos por unidade</strong>. Equipes de{" "}
          <em>processamento</em> entram no CMV; equipes <em>fixas/overhead</em> entram no rateio mensal
          da Rentabilidade.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Desembolso líquido (sem encargos patronais)</p>
            <p className="text-xs text-muted-foreground max-w-xl">
              {LABEL_MODO_CUSTO_MO_EQUIPE.liquido}. R$/h do CMV, overhead MO e sugestão da
              Rentabilidade passam a usar o valor líquido de cada pessoa. Sem líquido cadastrado,
              mantém o custo empregador.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch
              checked={usarLiquido}
              disabled={salvarConfig.isPending}
              onCheckedChange={(v) => salvarConfig.mutate({ usarLiquidoDesembolso: v })}
            />
            <Label className="font-normal text-sm">
              {usarLiquido ? "Ativo" : "Inativo"}
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">R$/h CLT (processo)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums">
              {mapa?.clt != null ? fmtMoney(mapa.clt) : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">{resumo.procClt} equipe(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">R$/h PJ (processo)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums">
              {mapa?.pj != null ? fmtMoney(mapa.pj) : "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">{resumo.procPj} equipe(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-muted-foreground">
              MO fixa (overhead/mês)
              {usarLiquido ? " · líquido" : " · empregador"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums">
              {fmtMoney(query.data?.overheadMoMensal ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Supervisão, admin produção…
              {usarLiquido && query.data?.overheadMoEmpregador != null ? (
                <> · empregador: {fmtMoney(query.data.overheadMoEmpregador)}</>
              ) : null}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => abrirNova("clt")}>
          <Plus className="h-4 w-4 mr-1" />
          Equipe CLT
        </Button>
        <Button size="sm" variant="outline" onClick={() => abrirNova("pj")}>
          <Plus className="h-4 w-4 mr-1" />
          Equipe PJ
        </Button>
        <Button
          size="sm"
          disabled={cadastrarOperadoresPj.isPending}
          onClick={() => {
            if (
              window.confirm(
                `Cadastrar Operador 1 a 7 como PJ?\n\n` +
                  `• Operadores 1–5: processamento (R$/h no CMV)\n` +
                  `• Operadores 6–7: ADM/supervisão (overhead mensal)\n` +
                  `• Honorários: ${fmtMoney(2500)} (40 h/semana)\n` +
                  `• VT: R$ 10/dia × 5 dias úteis\n` +
                  `• VA: R$ 20/dia × 5 dias úteis\n` +
                  `• Total: ${fmtMoney(CUSTO_MENSAL_TOTAL_OPERADOR_PJ)}/mês · ${HORAS_MES_40H_SEMANA} h/mês\n\n` +
                  `Nomes já existentes serão ignorados.`,
              )
            ) {
              cadastrarOperadoresPj.mutate();
            }
          }}
        >
          <UserPlus className="h-4 w-4 mr-1" />
          Cadastrar 7 operadores PJ
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={importarFolha.isPending}
          onClick={() => {
            if (
              window.confirm(
                "Importar folha 05/2026 (6 colaboradores CLT + pró-labore)?\n\n" +
                  "Atualiza quem já existir pelo código da folha.",
              )
            ) {
              importarFolha.mutate();
            }
          }}
        >
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          Folha 05/2026
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Equipes cadastradas</CardTitle>
          <CardDescription>
            Mistura proporcional (CLT + PJ) usada quando a etapa da ficha está como &quot;Proporcional&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {equipes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma equipe cadastrada. Comece pela equipe CLT e PJ de processamento.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Finalidade</TableHead>
                  <TableHead className="text-right">Pessoas</TableHead>
                  <TableHead className="text-right">h/mês</TableHead>
                  <TableHead className="text-right">
                    {modoCusto === "liquido" ? "Líquido/mês" : "Custo/mês"}
                  </TableHead>
                  {modoCusto === "liquido" ? (
                    <TableHead className="text-right text-muted-foreground">Empregador</TableHead>
                  ) : null}
                  <TableHead className="text-right">R$/h</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipes.map((e) => (
                  <TableRow key={e.id} className={e.ativo ? undefined : "opacity-50"}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.cargo ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          e.regime === "clt"
                            ? "default"
                            : e.regime === "prolabore"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {LABEL_REGIME_MO_EQUIPE[e.regime]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {LABEL_FINALIDADE_MO_EQUIPE[e.finalidade]}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{e.numPessoas}</TableCell>
                    <TableCell className="text-right tabular-nums">{e.horasMes}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtMoney(e.calculo.custoMensalEfetivo)}
                    </TableCell>
                    {modoCusto === "liquido" ? (
                      <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                        {fmtMoney(e.calculo.custoMensalEmpregador)}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right tabular-nums">
                      {e.calculo.custoHora != null ? fmtMoney(e.calculo.custoHora) : "—"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => abrirEditar(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={excluir.isPending}
                        onClick={() => {
                          if (window.confirm(`Excluir equipe «${e.nome}»?`)) {
                            excluir.mutate({ id: e.id! });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar equipe" : "Nova equipe"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Kailany Barros Soares"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Cargo / função</Label>
                <Input
                  value={form.cargo}
                  onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                  placeholder="Ex.: AUXILIAR DE PROCESSO"
                />
              </div>
              <div className="space-y-2">
                <Label>Cód. folha</Label>
                <Input
                  value={form.codigoFolha}
                  onChange={(e) => setForm((f) => ({ ...f, codigoFolha: e.target.value }))}
                  placeholder="Ex.: 000009"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Vínculo</Label>
                <Select
                  value={form.regime}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      regime: v as RegimeMoEquipe,
                      encargosPct: v === "clt" ? f.encargosPct || "80" : "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIMES_MO_EQUIPE.map((r) => (
                      <SelectItem key={r} value={r}>
                        {LABEL_REGIME_MO_EQUIPE[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Finalidade</Label>
                <Select
                  value={form.finalidade}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, finalidade: v as FinalidadeMoEquipe }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINALIDADES_MO_EQUIPE.map((f) => (
                      <SelectItem key={f} value={f}>
                        {LABEL_FINALIDADE_MO_EQUIPE[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Pessoas</Label>
                <Input
                  inputMode="numeric"
                  value={form.numPessoas}
                  onChange={(e) => setForm((f) => ({ ...f, numPessoas: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Horas produtivas / mês (equipe)</Label>
                <Input
                  inputMode="decimal"
                  value={form.horasMes}
                  onChange={(e) => setForm((f) => ({ ...f, horasMes: e.target.value }))}
                  placeholder={form.finalidade === "overhead" ? "Opcional" : "Ex.: 352"}
                />
              </div>
            </div>
            {form.regime === "clt" ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>Base salarial CLT / mês (R$)</Label>
                  <Input
                    inputMode="decimal"
                    value={form.custoMensalBase}
                    onChange={(e) => setForm((f) => ({ ...f, custoMensalBase: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Encargos (%)</Label>
                  <Input
                    inputMode="decimal"
                    value={form.encargosPct}
                    onChange={(e) => setForm((f) => ({ ...f, encargosPct: e.target.value }))}
                    placeholder="Ex.: 80"
                  />
                </div>
              </div>
            ) : form.regime === "prolabore" ? (
              <div className="space-y-2">
                <Label>Pró-labore mensal (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.custoMensalBase}
                  onChange={(e) => setForm((f) => ({ ...f, custoMensalBase: e.target.value }))}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Valor contrato PJ / mês (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.custoMensalBase}
                  onChange={(e) => setForm((f) => ({ ...f, custoMensalBase: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Custo mensal total (R$) — opcional, sobrescreve cálculo</Label>
              <Input
                inputMode="decimal"
                value={form.custoMensalTotal}
                onChange={(e) => setForm((f) => ({ ...f, custoMensalTotal: e.target.value }))}
                placeholder="Use se já souber o total carregado (empregador)"
              />
            </div>
            <div className="space-y-2">
              <Label>Líquido desembolsado / mês (R$)</Label>
              <Input
                inputMode="decimal"
                value={form.liquidoMensal}
                onChange={(e) => setForm((f) => ({ ...f, liquidoMensal: e.target.value }))}
                placeholder="Valor que sai na conta (folha ou PIX PJ)"
              />
              <p className="text-[11px] text-muted-foreground">
                Usado quando a opção &quot;Desembolso líquido&quot; está ativa. Folha 05/2026 e
                operadores PJ já trazem esse valor preenchido.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))} />
              <Label className="font-normal">Ativa</Label>
            </div>
            {form.regime === "clt" && !form.custoMensalTotal && form.custoMensalBase ? (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Estimativa:{" "}
                  {fmtMoney(
                    (parseNum(form.custoMensalBase) ?? 0) *
                      (1 + (parseNum(form.encargosPct) ?? 0) / 100),
                  )}
                  /mês
                  {parseNum(form.horasMes)
                    ? ` · ${fmtMoney(
                        ((parseNum(form.custoMensalBase) ?? 0) *
                          (1 + (parseNum(form.encargosPct) ?? 0) / 100)) /
                          (parseNum(form.horasMes) ?? 1),
                      )}/h`
                    : ""}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvar} disabled={salvar.isPending || !form.nome.trim()}>
              {salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
