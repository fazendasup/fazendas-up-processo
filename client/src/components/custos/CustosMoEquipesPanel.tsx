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
  REGIMES_MO_EQUIPE,
  type FinalidadeMoEquipe,
  type RegimeMoEquipe,
} from "@shared/custosMoEquipe";
import { AlertTriangle, Pencil, Plus, Trash2, Users } from "lucide-react";

const fmtMoney = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n)
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type EquipeForm = {
  id?: number;
  nome: string;
  regime: RegimeMoEquipe;
  finalidade: FinalidadeMoEquipe;
  numPessoas: string;
  horasMes: string;
  custoMensalBase: string;
  encargosPct: string;
  custoMensalTotal: string;
  observacoes: string;
  ativo: boolean;
};

function emptyForm(regime: RegimeMoEquipe = "clt"): EquipeForm {
  return {
    nome: "",
    regime,
    finalidade: "processamento",
    numPessoas: "1",
    horasMes: "",
    custoMensalBase: "",
    encargosPct: regime === "clt" ? "80" : "",
    custoMensalTotal: "",
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

  const mapa = query.data?.mapaCustoHora;
  const equipes = query.data?.equipes ?? [];

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
      regime: e.regime,
      finalidade: e.finalidade,
      numPessoas: String(e.numPessoas),
      horasMes: String(e.horasMes),
      custoMensalBase: e.custoMensalBase != null ? String(e.custoMensalBase) : "",
      encargosPct: e.encargosPct != null ? String(e.encargosPct) : "",
      custoMensalTotal: e.custoMensalTotal != null ? String(e.custoMensalTotal) : "",
      observacoes: e.observacoes ?? "",
      ativo: e.ativo !== false,
    });
    setOpen(true);
  }

  function handleSalvar() {
    salvar.mutate({
      id: form.id,
      nome: form.nome.trim(),
      regime: form.regime,
      finalidade: form.finalidade,
      numPessoas: parseNum(form.numPessoas) ?? 1,
      horasMes: parseNum(form.horasMes) ?? 0,
      custoMensalBase: parseNum(form.custoMensalBase),
      encargosPct: parseNum(form.encargosPct),
      custoMensalTotal: parseNum(form.custoMensalTotal),
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
            <CardTitle className="text-xs text-muted-foreground">MO fixa (overhead/mês)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums">
              {fmtMoney(query.data?.overheadMoMensal ?? 0)}
            </p>
            <p className="text-[11px] text-muted-foreground">Supervisão, admin produção…</p>
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
                  <TableHead>Vínculo</TableHead>
                  <TableHead>Finalidade</TableHead>
                  <TableHead className="text-right">Pessoas</TableHead>
                  <TableHead className="text-right">h/mês</TableHead>
                  <TableHead className="text-right">Custo/mês</TableHead>
                  <TableHead className="text-right">R$/h</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipes.map((e) => (
                  <TableRow key={e.id} className={e.ativo ? undefined : "opacity-50"}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell>
                      <Badge variant={e.regime === "clt" ? "default" : "secondary"}>
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
                placeholder="Ex.: Embalagem CLT"
              />
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
                placeholder="Use se já souber o total carregado"
              />
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
