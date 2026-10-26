import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ExternalLink,
  Trash2,
  CheckCircle2,
  Circle,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputHora24h } from "@/components/InputHora24h";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  dataSaidaServico,
  formatarHorasDecimais,
  normalizarHora24h,
  rotuloPausaMinutos,
} from "@shared/terceirosPagamento";

function hojeIsoSp(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! + days));
  return dt.toISOString().slice(0, 10);
}

/** Domingo de início da semana (dom→sáb) da data civil. */
function inicioSemanaIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  const dow = dt.getUTCDay(); // 0=dom … 6=sáb
  return addDaysIso(iso, -dow);
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtDataBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

type ModoFiltro = "dia" | "semana" | "periodo";
type AlimModo = "auto" | "empresa" | "vale";
/** padrao = cadastro do prestador; 0 = não descontar; 30 | 60 = forçar */
type DescModo = "padrao" | "0" | "30" | "60";

type RegistroEditavel = {
  id: number;
  nomeCompleto: string;
  dataServico: string;
  horaEntrada: string;
  horaSaida: string;
  almocouNaEmpresaOverride: boolean | null;
  minutosDescansoOverride: 0 | 30 | 60 | null;
  pausaMinutosPadrao: 30 | 60;
};

function modoAlmoco(
  override: boolean | null | undefined,
): AlimModo {
  if (override === true) return "empresa";
  if (override === false) return "vale";
  return "auto";
}

function modoDescanso(
  minutos: number | null | undefined,
  descontaLegado?: boolean | null,
): DescModo {
  if (minutos === 0 || minutos === 30 || minutos === 60) {
    return String(minutos) as DescModo;
  }
  if (descontaLegado === false) return "0";
  if (descontaLegado === true) return "60";
  return "padrao";
}

function minutosFromModo(modo: DescModo): 0 | 30 | 60 | null {
  if (modo === "padrao") return null;
  if (modo === "0") return 0;
  if (modo === "30") return 30;
  return 60;
}

export default function TerceirosAdminPage() {
  const hoje = hojeIsoSp();
  const [modo, setModo] = useState<ModoFiltro>("semana");
  const [refDia, setRefDia] = useState(hoje);
  const [inicio, setInicio] = useState(inicioSemanaIso(hoje));
  const [fim, setFim] = useState(addDaysIso(inicioSemanaIso(hoje), 6));
  const [prestadorId, setPrestadorId] = useState<string>("todos");
  const [editando, setEditando] = useState<RegistroEditavel | null>(null);
  const [editEntrada, setEditEntrada] = useState("07:00");
  const [editSaida, setEditSaida] = useState("16:00");
  const [editAlim, setEditAlim] = useState<AlimModo>("auto");
  const [editDescanso, setEditDescanso] = useState<DescModo>("padrao");

  const periodo = useMemo(() => {
    if (modo === "dia") return { inicio: refDia, fim: refDia };
    if (modo === "semana") {
      const ini = inicioSemanaIso(refDia);
      return { inicio: ini, fim: addDaysIso(ini, 6) };
    }
    return { inicio, fim };
  }, [modo, refDia, inicio, fim]);

  const utils = trpc.useUtils();
  const prestadores = trpc.terceiros.listPrestadores.useQuery();
  const regs = trpc.terceiros.listRegistros.useQuery({
    inicio: periodo.inicio,
    fim: periodo.fim,
    prestadorId:
      prestadorId === "todos" ? null : Number(prestadorId) || null,
  });

  useEffect(() => {
    if (!editando) return;
    setEditEntrada(editando.horaEntrada);
    setEditSaida(editando.horaSaida);
    setEditAlim(
      editando.almocouNaEmpresaOverride === true
        ? "empresa"
        : editando.almocouNaEmpresaOverride === false
          ? "vale"
          : "auto",
    );
    setEditDescanso(modoDescanso(editando.minutosDescansoOverride));
  }, [editando]);

  const atualizarPrestador = trpc.terceiros.atualizarPrestador.useMutation({
    onSuccess: async () => {
      toast.success("Pausa do prestador atualizada");
      await Promise.all([
        utils.terceiros.listPrestadores.invalidate(),
        utils.terceiros.listRegistros.invalidate(),
      ]);
    },
    onError: err => toast.error(err.message),
  });

  const excluirPrestador = trpc.terceiros.excluirPrestador.useMutation({
    onSuccess: async () => {
      toast.success("Prestador removido");
      await Promise.all([
        utils.terceiros.listPrestadores.invalidate(),
        utils.terceiros.listRegistros.invalidate(),
      ]);
    },
    onError: err => toast.error(err.message),
  });

  const excluirRegistro = trpc.terceiros.excluirRegistro.useMutation({
    onSuccess: async () => {
      toast.success("Dia removido");
      await utils.terceiros.listRegistros.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const marcarPago = trpc.terceiros.marcarPago.useMutation({
    onSuccess: async (_d, vars) => {
      toast.success(vars.pago ? "Marcado como pago" : "Voltou para em aberto");
      await utils.terceiros.listRegistros.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const ajustar = trpc.terceiros.ajustarRegistro.useMutation({
    onSuccess: async () => {
      toast.success("Ajuste salvo — o PJ verá no histórico");
      setEditando(null);
      await utils.terceiros.listRegistros.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const data = regs.data;

  return (
    <div className="min-h-dvh bg-background">
      <Header />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Terceiros</h1>
            <p className="text-sm text-muted-foreground">
              Diária de R$ 90 em 8 horas. Cada hora conta pelo mesmo valor.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/terceiros">
              Página pública
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filtro</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div>
              <Label>Modo</Label>
              <Select
                value={modo}
                onValueChange={v => setModo(v as ModoFiltro)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Dia</SelectItem>
                  <SelectItem value="semana">Semana</SelectItem>
                  <SelectItem value="periodo">Período</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {modo === "periodo" ? (
              <>
                <div>
                  <Label>Início</Label>
                  <Input
                    type="date"
                    value={inicio}
                    onChange={e => setInicio(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input
                    type="date"
                    value={fim}
                    onChange={e => setFim(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label>{modo === "dia" ? "Dia" : "Referência"}</Label>
                <Input
                  type="date"
                  value={refDia}
                  onChange={e => setRefDia(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>Prestador</Label>
              <Select value={prestadorId} onValueChange={setPrestadorId}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {(prestadores.data ?? []).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nomeCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {fmtDataBr(periodo.inicio)} → {fmtDataBr(periodo.fim)}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Dias</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {data?.totais.dias ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">
                Horas
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {data
                  ? formatarHorasDecimais(
                      data.porPrestador.reduce(
                        (soma, p) => soma + p.horasTrabalhadas,
                        0,
                      ),
                    )
                  : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">
                Total do período
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {fmtMoney(data?.totais.valorTotal)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">
                Em aberto
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700">
                {fmtMoney(data?.totais.emAberto)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por prestador</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.porPrestador.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum registro no período.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">CPF</th>
                      <th className="px-3 py-2 text-right">Dias</th>
                      <th className="px-3 py-2 text-right">Horas</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Em aberto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.porPrestador.map(p => (
                      <tr key={p.prestadorId} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">
                          <div>{p.nomeCompleto}</div>
                          {p.observacao ? (
                            <p className="mt-0.5 text-xs font-normal text-amber-800 dark:text-amber-200">
                              {p.observacao}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {p.cpfMascarado}
                          {p.diariaBase != null ? (
                            <div className="mt-0.5 tabular-nums">
                              Diária {fmtMoney(p.diariaBase)}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {p.dias}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatarHorasDecimais(p.horasTrabalhadas)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {fmtMoney(p.valorTotal)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-amber-700">
                          {fmtMoney(p.emAberto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detalhe dos dias</CardTitle>
          </CardHeader>
          <CardContent>
            {regs.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando…</p>
            ) : (data?.itens.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dias no filtro.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">Entrada</th>
                      <th className="px-3 py-2">Saída</th>
                      <th className="px-3 py-2 text-right">Horas</th>
                      <th className="px-3 py-2">Almoço e descanso</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {data!.itens.map(r => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">
                          {r.nomeCompleto}
                          {(r.ajustes?.length ?? 0) > 0 ? (
                            <p className="mt-0.5 text-[11px] font-normal text-sky-700 dark:text-sky-300">
                              {r.ajustes.length} ajuste
                              {r.ajustes.length > 1 ? "s" : ""}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                          {fmtDataBr(r.dataServico)} {r.horaEntrada}
                        </td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">
                          {fmtDataBr(
                            dataSaidaServico(
                              r.dataServico,
                              r.horaEntrada,
                              r.horaSaida,
                            ),
                          )}{" "}
                          {r.horaSaida}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.pagamento
                            ? formatarHorasDecimais(r.pagamento.horasTrabalhadas)
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="space-y-1">
                            <Select
                              value={modoAlmoco(r.almocouNaEmpresaOverride)}
                              disabled={ajustar.isPending}
                              onValueChange={v => {
                                ajustar.mutate({
                                  id: r.id,
                                  almocouNaEmpresaOverride:
                                    v === "auto" ? null : v === "empresa",
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 w-[13.5rem] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">
                                  Almoço: automático
                                </SelectItem>
                                <SelectItem value="empresa">
                                  Almoçou na empresa
                                </SelectItem>
                                <SelectItem value="vale">
                                  Não almoçou na empresa
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={modoDescanso(
                                r.minutosDescansoOverride,
                                r.descontaDescansoOverride,
                              )}
                              disabled={ajustar.isPending}
                              onValueChange={v => {
                                ajustar.mutate({
                                  id: r.id,
                                  minutosDescansoOverride: minutosFromModo(
                                    v as DescModo,
                                  ),
                                });
                              }}
                            >
                              <SelectTrigger className="h-8 w-[13.5rem] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="padrao">
                                  Pausa: padrão (
                                  {rotuloPausaMinutos(r.pausaMinutos ?? 60)})
                                </SelectItem>
                                <SelectItem value="30">
                                  Descontar 30 min
                                </SelectItem>
                                <SelectItem value="60">
                                  Descontar 1h
                                </SelectItem>
                                <SelectItem value="0">
                                  Não descontar pausa
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                            {r.pagamento?.descontaDescanso
                              ? `desconta ${rotuloPausaMinutos(r.pagamento.minutosDescanso ?? 60)}`
                              : "sem pausa"}
                            {" · "}
                            {r.pagamento?.almocouNaEmpresa
                              ? "sem R$ 25"
                              : fmtMoney(r.pagamento?.valorAlimentacao)}
                          </p>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {fmtMoney(r.valorTotal)}
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            variant={r.pago ? "secondary" : "outline"}
                            className="gap-1"
                            disabled={marcarPago.isPending}
                            onClick={() =>
                              marcarPago.mutate({
                                id: r.id,
                                pago: !r.pago,
                              })
                            }
                          >
                            {r.pago ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Pago
                              </>
                            ) : (
                              <>
                                <Circle className="h-3.5 w-3.5" />
                                Em aberto
                              </>
                            )}
                          </Button>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Ajustar horário / alimentação"
                            onClick={() =>
                              setEditando({
                                id: r.id,
                                nomeCompleto: r.nomeCompleto,
                                dataServico: r.dataServico,
                                horaEntrada: r.horaEntrada,
                                horaSaida: r.horaSaida,
                                almocouNaEmpresaOverride:
                                  r.almocouNaEmpresaOverride ?? null,
                                minutosDescansoOverride:
                                  r.minutosDescansoOverride === 0 ||
                                  r.minutosDescansoOverride === 30 ||
                                  r.minutosDescansoOverride === 60
                                    ? r.minutosDescansoOverride
                                    : null,
                                pausaMinutosPadrao:
                                  r.pausaMinutos === 30 ? 30 : 60,
                              })
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            disabled={excluirRegistro.isPending}
                            onClick={() => {
                              if (!confirm("Excluir este dia?")) return;
                              excluirRegistro.mutate({ id: r.id });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cadastros</CardTitle>
          </CardHeader>
          <CardContent>
            {(prestadores.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum prestador cadastrado.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {prestadores.data!.map(p => (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-start justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{p.nomeCompleto}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.cpfMascarado}
                        {p.diariaBase != null
                          ? ` · Diária ${fmtMoney(p.diariaBase)} / 8h`
                          : " · Diária padrão R$ 90 / 8h"}
                      </p>
                      {p.observacao ? (
                        <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                          {p.observacao}
                        </p>
                      ) : null}
                      <div className="mt-2 max-w-[16rem]">
                        <Label className="text-[11px] text-muted-foreground">
                          Pausa padrão (descontada)
                        </Label>
                        <Select
                          value={String(p.pausaMinutos === 30 ? 30 : 60)}
                          disabled={atualizarPrestador.isPending}
                          onValueChange={v => {
                            atualizarPrestador.mutate({
                              id: p.id,
                              pausaMinutos: v === "30" ? 30 : 60,
                            });
                          }}
                        >
                          <SelectTrigger className="mt-1 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 minutos</SelectItem>
                            <SelectItem value="60">1 hora</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-destructive"
                      disabled={excluirPrestador.isPending}
                      onClick={() => {
                        if (!confirm(`Excluir ${p.nomeCompleto}?`)) {
                          return;
                        }
                        excluirPrestador.mutate({ id: p.id });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog
        open={editando != null}
        onOpenChange={open => {
          if (!open) setEditando(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar dia</DialogTitle>
          </DialogHeader>
          {editando ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {editando.nomeCompleto} · {fmtDataBr(editando.dataServico)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="aj-entrada">Entrada</Label>
                  <InputHora24h
                    id="aj-entrada"
                    value={editEntrada}
                    onChange={setEditEntrada}
                  />
                </div>
                <div>
                  <Label htmlFor="aj-saida">Saída</Label>
                  <InputHora24h
                    id="aj-saida"
                    value={editSaida}
                    onChange={setEditSaida}
                  />
                </div>
              </div>
              <div>
                <Label>Almoço na empresa</Label>
                <Select
                  value={editAlim}
                  onValueChange={v => setEditAlim(v as AlimModo)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      Automático (11h–13h)
                    </SelectItem>
                    <SelectItem value="empresa">
                      Almoçou na empresa
                    </SelectItem>
                    <SelectItem value="vale">
                      Não almoçou na empresa
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pausa (desconto de horas)</Label>
                <Select
                  value={editDescanso}
                  onValueChange={v => setEditDescanso(v as DescModo)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="padrao">
                      Padrão do prestador (
                      {rotuloPausaMinutos(editando.pausaMinutosPadrao)})
                    </SelectItem>
                    <SelectItem value="30">Descontar 30 min</SelectItem>
                    <SelectItem value="60">Descontar 1h</SelectItem>
                    <SelectItem value="0">Não descontar pausa</SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  A pausa sai das horas pagas (30 min ou 1h). O cadastro do
                  prestador define o padrão; aqui você pode mudar só neste dia.
                  Quem almoça na empresa (11h–13h) não recebe os R$ 25.
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button
              disabled={ajustar.isPending || !editando}
              onClick={() => {
                if (!editando) return;
                const entrada = normalizarHora24h(editEntrada);
                const saida = normalizarHora24h(editSaida);
                if (!entrada || !saida) {
                  toast.error("Digite a hora no formato 24h, como 07:00.");
                  return;
                }
                ajustar.mutate({
                  id: editando.id,
                  horaEntrada: entrada,
                  horaSaida: saida,
                  almocouNaEmpresaOverride:
                    editAlim === "auto"
                      ? null
                      : editAlim === "empresa",
                  minutosDescansoOverride: minutosFromModo(editDescanso),
                });
              }}
            >
              Salvar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
