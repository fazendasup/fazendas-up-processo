import { useEffect, useMemo, useState } from "react";
import { Clock, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarCpf, normalizarCpf } from "@shared/terceirosPagamento";

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
            <p className="text-sm text-muted-foreground">
              Informe seu CPF e nome completo para registrar os dias trabalhados
              e ver seu histórico.
            </p>
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

  return (
    <Shell>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="mt-1 text-xl font-bold">
            {prestador?.nomeCompleto ?? "Carregando…"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {prestador?.cpfMascarado}
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1" onClick={sair}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Registrar dia de serviço
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
            <Input
              id="entrada"
              type="time"
              value={horaEntrada}
              onChange={e => setHoraEntrada(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="saida">Saída</Label>
            <Input
              id="saida"
              type="time"
              value={horaSaida}
              onChange={e => setHoraSaida(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <Button
              className="w-full sm:w-auto"
              disabled={salvar.isPending || !token}
              onClick={() => {
                if (!token) return;
                salvar.mutate({
                  acessoToken: token,
                  dataServico,
                  horaEntrada,
                  horaSaida,
                });
              }}
            >
              Salvar dia
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Se já existir registro no mesmo dia, os horários serão atualizados.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Seu histórico</CardTitle>
          <p className="text-xs text-muted-foreground">
            Apenas dias, entradas e saídas. Valores de pagamento ficam com a
            administração.
          </p>
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
              {registros.map(r => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 px-3 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium">{fmtDataBr(r.dataServico)}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.horaEntrada} → {r.horaSaida}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
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
                </li>
              ))}
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
