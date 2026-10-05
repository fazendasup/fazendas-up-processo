import { useEffect, useMemo, useState } from "react";
import { Clock, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputHora24h } from "@/components/InputHora24h";
import { Label } from "@/components/ui/label";
import { formatarCpf, normalizarCpf, dataSaidaServico, normalizarHora24h } from "@shared/terceirosPagamento";

const STORAGE_KEY = "terceiros.acessoToken";

function hojeIsoSp(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function fmtDataBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtQuando(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type AjusteVisivel = {
  id: number;
  descricao: string;
  createdAt: Date | string;
};

/** Só o último ajuste do dia (horário e alimentação salvos juntos contam como um). */
function ultimoAjusteDoDia(ajustes: AjusteVisivel[] | undefined): {
  texto: string;
  quando: Date | string;
} | null {
  if (!ajustes?.length) return null;
  const ordenados = [...ajustes].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (tb !== ta) return tb - ta;
    return b.id - a.id;
  });
  const maisRecente = ordenados[0]!;
  const instante = new Date(maisRecente.createdAt).getTime();
  const doMesmoSalvamento = ordenados.filter(
    a => new Date(a.createdAt).getTime() === instante,
  );
  return {
    texto: doMesmoSalvamento
      .slice()
      .reverse()
      .map(a => a.descricao)
      .join(" "),
    quando: maisRecente.createdAt,
  };
}

export default function TerceirosPublicPage() {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [cpf, setCpf] = useState("");
  const [nome, setNome] = useState("");
  const [dataServico, setDataServico] = useState(hojeIsoSp);
  const [horaEntrada, setHoraEntrada] = useState("07:00");
  const [horaSaida, setHoraSaida] = useState("16:00");

  const utils = trpc.useUtils();

  const hist = trpc.terceiros.meuHistorico.useQuery(
    { acessoToken: token ?? "" },
    {
      enabled: Boolean(token),
      retry: false,
    },
  );

  useEffect(() => {
    if (hist.error && token) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setToken(null);
      toast.error("Sessão expirada. Identifique-se novamente.");
    }
  }, [hist.error, token]);

  const identificar = trpc.terceiros.identificar.useMutation({
    onSuccess: data => {
      try {
        sessionStorage.setItem(STORAGE_KEY, data.acessoToken);
      } catch {
        /* ignore */
      }
      setToken(data.acessoToken);
      toast.success(`Olá, ${data.nomeCompleto.split(" ")[0]}!`);
    },
    onError: err => toast.error(err.message),
  });

  const salvar = trpc.terceiros.salvarRegistro.useMutation({
    onSuccess: async () => {
      toast.success("Dia registrado");
      await utils.terceiros.meuHistorico.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const excluir = trpc.terceiros.excluirMeuRegistro.useMutation({
    onSuccess: async () => {
      toast.success("Registro removido");
      await utils.terceiros.meuHistorico.invalidate();
    },
    onError: err => toast.error(err.message),
  });

  const cpfFmt = useMemo(() => formatarCpf(cpf), [cpf]);

  function sair() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
    setCpf("");
    setNome("");
  }

  if (!token) {
    return (
      <Shell>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Prestação de serviços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={cpfFmt}
                onChange={e => setCpf(normalizarCpf(e.target.value).slice(0, 11))}
              />
            </div>
            <div>
              <Label htmlFor="nome">Nome completo</Label>
              <Input
                id="nome"
                autoComplete="name"
                placeholder="Seu nome completo"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={identificar.isPending}
              onClick={() =>
                identificar.mutate({
                  cpf: normalizarCpf(cpf),
                  nomeCompleto: nome.trim(),
                })
              }
            >
              Entrar
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const prestador = hist.data?.prestador;
  const registros = hist.data?.registros ?? [];
  const emAberto = hist.data?.emAberto ?? 0;

  return (
    <Shell>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="mt-1 text-xl font-bold">
            {prestador?.nomeCompleto ?? "Carregando…"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {prestador?.cpfMascarado}
            {prestador?.diariaBase != null
              ? ` · Diária ${fmtMoney(prestador.diariaBase)} / 8h`
              : null}
          </p>
          {prestador?.observacao ? (
            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {prestador.observacao}
            </p>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" className="gap-1" onClick={sair}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Em aberto
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-200">
            {fmtMoney(emAberto)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Registrar dia
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="data">Dia</Label>
            <Input
              id="data"
              type="date"
              value={dataServico}
              onChange={e => setDataServico(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="entrada">Entrada</Label>
            <InputHora24h
              id="entrada"
              value={horaEntrada}
              onChange={setHoraEntrada}
            />
            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
              {fmtDataBr(dataServico)}
            </p>
          </div>
          <div>
            <Label htmlFor="saida">Saída</Label>
            <InputHora24h
              id="saida"
              value={horaSaida}
              onChange={setHoraSaida}
            />
            <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
              {fmtDataBr(
                dataSaidaServico(dataServico, horaEntrada, horaSaida),
              )}
            </p>
          </div>
          <div className="sm:col-span-3">
            <Button
              className="w-full sm:w-auto"
              disabled={salvar.isPending || !token}
              onClick={() => {
                if (!token) return;
                const entrada = normalizarHora24h(horaEntrada);
                const saida = normalizarHora24h(horaSaida);
                if (!entrada || !saida) {
                  toast.error("Digite a hora no formato 24h, como 07:00.");
                  return;
                }
                setHoraEntrada(entrada);
                setHoraSaida(saida);
                salvar.mutate({
                  acessoToken: token,
                  dataServico,
                  horaEntrada: entrada,
                  horaSaida: saida,
                });
              }}
            >
              Salvar dia
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {hist.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : registros.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum dia registrado ainda.
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {registros.map(r => {
                const ultimo = ultimoAjusteDoDia(r.ajustes);
                return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium tabular-nums">
                      {fmtDataBr(r.dataServico)} {r.horaEntrada}
                      {" → "}
                      {fmtDataBr(
                        dataSaidaServico(
                          r.dataServico,
                          r.horaEntrada,
                          r.horaSaida,
                        ),
                      )}{" "}
                      {r.horaSaida}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.pagamento
                        ? `${r.pagamento.horasTrabalhadas}h`
                        : ""}
                      {r.pagamento?.almocouNaEmpresa
                        ? r.pagamento.almocouNaEmpresaManual
                          ? " · almoço descontado neste dia"
                          : " · almoço descontado"
                        : (r.pagamento?.valorAlimentacao ?? 0) > 0
                          ? r.pagamento?.almocouNaEmpresaManual
                            ? " · almoço não descontado neste dia"
                            : " · vale alimentação"
                          : (r.pagamento?.horasTrabalhadas ?? 0) > 0 &&
                              (r.pagamento?.horasTrabalhadas ?? 0) < 6
                            ? " · sem refeição (menos de 6h)"
                            : ""}
                    </p>
                    <p className="mt-0.5 text-xs">
                      <span className="font-semibold tabular-nums">
                        {fmtMoney(r.valorTotal)}
                      </span>
                      <span
                        className={
                          r.pago
                            ? "ml-2 text-emerald-700"
                            : "ml-2 text-amber-700"
                        }
                      >
                        {r.pago ? "pago" : "em aberto"}
                      </span>
                    </p>
                    {ultimo ? (
                      <p className="mt-1.5 border-l-2 border-sky-300 pl-2 text-[11px] leading-snug text-sky-900 dark:border-sky-700 dark:text-sky-100">
                        <span className="font-medium">Ajuste:</span>{" "}
                        {ultimo.texto}
                        <span className="ml-1 text-muted-foreground">
                          ({fmtQuando(ultimo.quando)})
                        </span>
                      </p>
                    ) : null}
                  </div>
                  {!r.pago ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 text-destructive"
                      disabled={excluir.isPending}
                      onClick={() => {
                        if (!token) return;
                        if (!confirm("Remover este dia?")) return;
                        excluir.mutate({
                          acessoToken: token,
                          registroId: r.id,
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white px-4 py-8 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Fazendas UP
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
