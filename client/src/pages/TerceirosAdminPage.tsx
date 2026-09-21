import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  formatarHorasDecimais,
  TERCEIROS_ALIMENTACAO,
  TERCEIROS_DIARIA_BASE,
  TERCEIROS_VALE_TRANSPORTE,
  TERCEIROS_VALOR_HORA_EXTRA,
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

/** Segunda-feira da semana ISO da data (America/SP civil). */
function inicioSemanaIso(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  const dow = dt.getUTCDay(); // 0=dom
  const delta = dow === 0 ? -6 : 1 - dow;
  return addDaysIso(iso, delta);
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

export default function TerceirosAdminPage() {
  const hoje = hojeIsoSp();
  const [modo, setModo] = useState<ModoFiltro>("semana");
  const [refDia, setRefDia] = useState(hoje);
  const [inicio, setInicio] = useState(inicioSemanaIso(hoje));
  const [fim, setFim] = useState(addDaysIso(inicioSemanaIso(hoje), 6));
  const [prestadorId, setPrestadorId] = useState<string>("todos");

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
      toast.success("Registro removido");
      await utils.terceiros.listRegistros.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const data = regs.data;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Terceiros — prestação de serviços
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Diária R$ {TERCEIROS_DIARIA_BASE} + VT R${" "}
              {TERCEIROS_VALE_TRANSPORTE} + alimentação R${" "}
              {TERCEIROS_ALIMENTACAO} (descontada se entrada antes das 12h).
              Hora extra = R$ {TERCEIROS_VALOR_HORA_EXTRA.toFixed(2)} (90÷8)
              além de 8h+1h almoço.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href="/terceiros" target="_blank">
              <ExternalLink className="h-3.5 w-3.5" />
              Página pública
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filtro</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Modo</Label>
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
                  <Label className="text-xs">De</Label>
                  <Input
                    type="date"
                    value={inicio}
                    onChange={e => setInicio(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Até</Label>
                  <Input
                    type="date"
                    value={fim}
                    onChange={e => setFim(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <div>
                <Label className="text-xs">
                  {modo === "semana" ? "Dia na semana" : "Dia"}
                </Label>
                <Input
                  type="date"
                  value={refDia}
                  onChange={e => setRefDia(e.target.value)}
                />
              </div>
            )}
            <div>
              <Label className="text-xs">Prestador</Label>
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
            <p className="w-full text-xs text-muted-foreground">
              Período: {fmtDataBr(periodo.inicio)} — {fmtDataBr(periodo.fim)}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">Dias</p>
              <p className="text-2xl font-semibold tabular-nums">
                {data?.totais.dias ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">
                Horas extras
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {data
                  ? formatarHorasDecimais(data.totais.horasExtras)
                  : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs uppercase text-muted-foreground">
                A pagar (período)
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {fmtMoney(data?.totais.valorTotal)}
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
                      <th className="px-3 py-2 text-right">Extras</th>
                      <th className="px-3 py-2 text-right">A pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.porPrestador.map(p => (
                      <tr key={p.prestadorId} className="border-b last:border-0">
                        <td className="px-3 py-2 font-medium">
                          {p.nomeCompleto}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {p.cpfMascarado}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {p.dias}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatarHorasDecimais(p.horasPresente)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {formatarHorasDecimais(p.horasExtras)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {fmtMoney(p.valorTotal)}
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
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase text-muted-foreground">
                      <th className="px-3 py-2">Dia</th>
                      <th className="px-3 py-2">Nome</th>
                      <th className="px-3 py-2">Entrada</th>
                      <th className="px-3 py-2">Saída</th>
                      <th className="px-3 py-2 text-right">Presente</th>
                      <th className="px-3 py-2 text-right">Extra</th>
                      <th className="px-3 py-2 text-right">Alim.</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {data!.itens.map(r => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          {fmtDataBr(r.dataServico)}
                        </td>
                        <td className="px-3 py-2 font-medium">
                          {r.nomeCompleto}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {r.horaEntrada}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {r.horaSaida}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.pagamento
                            ? formatarHorasDecimais(r.pagamento.horasPresente)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.pagamento
                            ? formatarHorasDecimais(r.pagamento.horasExtras)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {r.pagamento
                            ? r.pagamento.almocouNaEmpresa
                              ? "descontada"
                              : fmtMoney(r.pagamento.valorAlimentacao)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {fmtMoney(r.pagamento?.valorTotal)}
                        </td>
                        <td className="px-3 py-2 text-right">
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
            <p className="text-xs text-muted-foreground">
              Excluir desativa o prestador (não apaga o histórico de dias já
              lançados no banco; ele some das listagens ativas).
            </p>
          </CardHeader>
          <CardContent>
            {(prestadores.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum prestador cadastrado ainda. Eles entram pela{" "}
                <Link href="/terceiros" className="underline">
                  página pública
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {prestadores.data!.map(p => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{p.nomeCompleto}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.cpfMascarado}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={excluirPrestador.isPending}
                      onClick={() => {
                        if (
                          !confirm(
                            `Excluir ${p.nomeCompleto}? O acesso público será bloqueado.`,
                          )
                        ) {
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
    </div>
  );
}
