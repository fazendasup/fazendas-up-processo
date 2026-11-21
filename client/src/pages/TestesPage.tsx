import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  CHLORELLA_DOSE_ML_POR_L,
  doseTotalMl,
  volumePadraoFaseAlface,
  volumePadraoPrimeiraRega,
  type CulturaTeste,
  type FaseAlfaceTeste,
  type TipoAplicacaoChlorella,
  type VolumeDosagemChlorella,
} from "@shared/testesChlorellaSeed";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Beaker,
  CalendarClock,
  CheckCircle2,
  FlaskConical,
  Leaf,
  Plus,
  Sprout,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

function hojeIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtData(v: string | Date | null | undefined): string {
  if (!v) return "—";
  try {
    const iso = typeof v === "string" ? v.slice(0, 10) : format(v, "yyyy-MM-dd");
    return format(parseISO(iso), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return String(v).slice(0, 10);
  }
}

function TestesLista() {
  const list = trpc.testes.list.useQuery();
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Acompanhamento de testes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Experimentos de bioestimulantes e protocolos em microverdes e alface.
        </p>
      </div>
      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : (list.data ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Nenhum teste cadastrado ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {(list.data ?? []).map(t => (
            <li key={t.id}>
              <Link href={`/testes/${t.slug}`}>
                <a className="flex items-start gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:bg-muted/30">
                  <FlaskConical className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{t.titulo}</p>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {t.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t.produto}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Dose alvo {t.doseAlvoMlPorL} ml/L · lembrete a cada{" "}
                      {t.intervaloLembreteDias} dia(s)
                    </p>
                  </div>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CampoNum({
  value,
  onSave,
  step = "1",
  disabled = false,
}: {
  value: number | null | undefined;
  onSave: (n: number | null) => void;
  step?: string;
  disabled?: boolean;
}) {
  const initial =
    value == null || Number.isNaN(Number(value)) ? "" : String(value);
  const [local, setLocal] = useState(initial);
  return (
    <Input
      className="h-8 w-20 text-sm tabular-nums"
      inputMode="decimal"
      step={step}
      disabled={disabled}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const raw = local.trim().replace(",", ".");
        if (!raw) {
          if (value != null) onSave(null);
          return;
        }
        const n = Number(raw);
        if (!Number.isFinite(n)) {
          toast.error("Número inválido");
          setLocal(initial);
          return;
        }
        if (n !== Number(value)) onSave(n);
      }}
    />
  );
}

function CampoNome({
  value,
  onSave,
  disabled = false,
}: {
  value: string;
  onSave: (nome: string) => void;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(value);
  return (
    <Input
      className="h-8 min-w-[9rem] text-sm font-medium"
      disabled={disabled}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const nome = local.trim();
        if (!nome) {
          setLocal(value);
          toast.error("Informe o nome da variedade");
          return;
        }
        if (nome !== value) onSave(nome);
      }}
    />
  );
}

function FormNovaVariedade({
  cultura,
  onAdd,
  pending,
}: {
  cultura: CulturaTeste;
  onAdd: (nome: string) => void;
  pending: boolean;
}) {
  const [nome, setNome] = useState("");
  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed bg-muted/20 p-3"
      onSubmit={e => {
        e.preventDefault();
        const n = nome.trim();
        if (!n) {
          toast.error("Informe o nome da variedade");
          return;
        }
        onAdd(n);
        setNome("");
      }}
    >
      <div className="min-w-[12rem] flex-1 space-y-1">
        <Label className="text-xs">
          Acrescentar variedade ({cultura === "microverdes" ? "microverde" : "alface"})
        </Label>
        <Input
          value={nome}
          onChange={e => setNome(e.target.value)}
          placeholder="Nome da variedade"
          className="h-9"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending} className="h-9">
        <Plus className="mr-1 h-4 w-4" />
        Acrescentar
      </Button>
    </form>
  );
}

function TesteDetalhe({ slug }: { slug: string }) {
  const utils = trpc.useUtils();
  const q = trpc.testes.bySlug.useQuery({ slug });
  const updateParcela = trpc.testes.updateParcela.useMutation({
    onSuccess: () => {
      void utils.testes.bySlug.invalidate({ slug });
    },
    onError: e => toast.error(e.message),
  });
  const registrar = trpc.testes.registrarDosagem.useMutation({
    onSuccess: () => {
      void utils.testes.bySlug.invalidate({ slug });
      toast.success("Dosagem registrada para todas as variedades desta cultura");
      setObs("");
    },
    onError: e => toast.error(e.message),
  });
  const deleteDosagem = trpc.testes.deleteDosagem.useMutation({
    onSuccess: () => {
      void utils.testes.bySlug.invalidate({ slug });
      toast.success("Dosagem removida");
    },
    onError: e => toast.error(e.message),
  });
  const addParcela = trpc.testes.addParcela.useMutation({
    onSuccess: () => {
      void utils.testes.bySlug.invalidate({ slug });
      toast.success("Variedade acrescentada");
    },
    onError: e => toast.error(e.message),
  });

  const [culturaDose, setCulturaDose] = useState<CulturaTeste>("microverdes");
  const [faseDose, setFaseDose] = useState<FaseAlfaceTeste>("mudas");
  const [tipoAplicacao, setTipoAplicacao] =
    useState<TipoAplicacaoChlorella>("tanque");
  const [volume, setVolume] = useState<VolumeDosagemChlorella>(500);
  const [doseMlL, setDoseMlL] = useState(String(CHLORELLA_DOSE_ML_POR_L));
  const [dataAplicacao, setDataAplicacao] = useState(hojeIso());
  const [obs, setObs] = useState("");
  const [mostrarInativas, setMostrarInativas] = useState(true);

  const teste = q.data?.teste;
  const parcelas = q.data?.parcelas ?? [];
  const dosagens = q.data?.dosagens ?? [];
  const lembretes = q.data?.lembretes ?? [];

  const micro = useMemo(
    () =>
      parcelas.filter(
        p =>
          p.cultura === "microverdes" &&
          (mostrarInativas || p.ativo !== false),
      ),
    [parcelas, mostrarInativas],
  );
  const alf = useMemo(
    () =>
      parcelas.filter(
        p => p.cultura === "alface" && (mostrarInativas || p.ativo !== false),
      ),
    [parcelas, mostrarInativas],
  );

  const doseNum = Number(String(doseMlL).replace(",", ".")) || 0;
  const totalMl = doseTotalMl(doseNum, volume);
  const isPrimeiraRega =
    culturaDose === "microverdes" &&
    tipoAplicacao === "primeira_rega_pre_escuro";

  const onCulturaChange = (c: CulturaTeste) => {
    setCulturaDose(c);
    if (c === "microverdes") {
      setTipoAplicacao("tanque");
      setVolume(500);
    } else {
      setTipoAplicacao("tanque");
      setVolume(volumePadraoFaseAlface(faseDose));
    }
  };

  const onTipoAplicacaoChange = (t: TipoAplicacaoChlorella) => {
    setTipoAplicacao(t);
    if (t === "primeira_rega_pre_escuro") {
      setVolume(volumePadraoPrimeiraRega());
    } else {
      setVolume(500);
    }
  };

  const onFaseChange = (f: FaseAlfaceTeste) => {
    setFaseDose(f);
    setVolume(volumePadraoFaseAlface(f));
  };

  if (q.isLoading) {
    return (
      <div className="mx-auto max-w-5xl p-4 text-sm text-muted-foreground">
        Carregando teste…
      </div>
    );
  }
  if (!teste) {
    return (
      <div className="mx-auto max-w-5xl space-y-3 p-4">
        <p className="text-sm text-muted-foreground">Teste não encontrado.</p>
        <Link href="/testes">
          <a className="text-sm text-primary underline">Voltar</a>
        </Link>
      </div>
    );
  }

  const saveParcela = (
    id: number,
    patch: Parameters<typeof updateParcela.mutate>[0],
  ) => {
    updateParcela.mutate({ id, ...patch });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/testes">
            <a className="text-xs text-muted-foreground hover:text-foreground">
              ← Testes
            </a>
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{teste.titulo}</h1>
          <p className="text-sm text-muted-foreground">{teste.produto}</p>
        </div>
        <div className="rounded-xl border bg-emerald-500/[0.07] px-3 py-2 text-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
            Dose alvo
          </p>
          <p className="font-extrabold tabular-nums">
            {teste.doseAlvoMlPorL} ml/L
          </p>
          <p className="text-[11px] text-muted-foreground">
            Lembrete a cada {teste.intervaloLembreteDias} dias
          </p>
        </div>
      </div>

      {teste.protocoloResumo ? (
        <p className="rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
          {teste.protocoloResumo}
        </p>
      ) : null}

      {lembretes.length > 0 ? (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <CalendarClock className="h-4 w-4" />
            Lembretes de aplicação
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {lembretes.map(l => (
              <div
                key={`${l.cultura}-${l.fase ?? ""}`}
                className={`rounded-lg border p-3 text-sm ${
                  l.atrasado
                    ? "border-amber-300 bg-amber-500/10"
                    : "bg-card"
                }`}
              >
                <div className="flex items-center gap-2">
                  {l.atrasado ? (
                    <AlertTriangle className="h-4 w-4 text-amber-700" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  )}
                  <p className="font-medium capitalize">
                    {l.cultura}
                    {l.fase ? ` · ${l.fase}` : ""}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Última: {fmtData(l.ultimaData)} · Próxima:{" "}
                  {fmtData(l.proximaPrevista)}
                  {l.diasAteProxima != null
                    ? l.atrasado
                      ? ` (${Math.abs(l.diasAteProxima)}d atrasado)`
                      : l.diasAteProxima === 0
                        ? " (hoje)"
                        : ` (em ${l.diasAteProxima}d)`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Beaker className="h-4 w-4" />
          Registrar dosagem (vale para todas as variedades)
        </h2>
        <p className="rounded-lg border border-amber-200/80 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-950 dark:border-amber-900/50 dark:text-amber-100">
          Indicação: diluir o extrato antes em <strong>2 L de água</strong>,
          filtrar e só depois aplicar no tanque ou na rega.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label>Cultura</Label>
            <Select
              value={culturaDose}
              onValueChange={v => onCulturaChange(v as CulturaTeste)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="microverdes">Microverdes</SelectItem>
                <SelectItem value="alface">Alface</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {culturaDose === "alface" ? (
            <div className="space-y-1">
              <Label>Fase</Label>
              <Select
                value={faseDose}
                onValueChange={v => onFaseChange(v as FaseAlfaceTeste)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mudas">Mudas (galão 50 L)</SelectItem>
                  <SelectItem value="vegetativa">Vegetativa (310/500 L)</SelectItem>
                  <SelectItem value="maturacao">Maturação (500 L)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={tipoAplicacao}
                onValueChange={v =>
                  onTipoAplicacaoChange(v as TipoAplicacaoChlorella)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tanque">Caixa SN (todas as variedades)</SelectItem>
                  <SelectItem value="primeira_rega_pre_escuro">
                    1ª rega antes do escuro
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>{isPrimeiraRega ? "Volume da rega" : "Volume do tanque"}</Label>
            <Select
              value={String(volume)}
              onValueChange={v =>
                setVolume(Number(v) as VolumeDosagemChlorella)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isPrimeiraRega ? (
                  <>
                    <SelectItem value="5">5 L</SelectItem>
                    <SelectItem value="10">10 L</SelectItem>
                  </>
                ) : culturaDose === "alface" && faseDose === "mudas" ? (
                  <SelectItem value="50">50 L (galão mudas)</SelectItem>
                ) : culturaDose === "alface" && faseDose === "vegetativa" ? (
                  <>
                    <SelectItem value="310">310 L</SelectItem>
                    <SelectItem value="500">500 L</SelectItem>
                  </>
                ) : culturaDose === "alface" && faseDose === "maturacao" ? (
                  <SelectItem value="500">500 L</SelectItem>
                ) : (
                  <>
                    <SelectItem value="310">310 L</SelectItem>
                    <SelectItem value="500">500 L</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Dosagem (ml/L)</Label>
            <Input
              value={doseMlL}
              onChange={e => setDoseMlL(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1">
            <Label>Dia da dosagem</Label>
            <Input
              type="date"
              value={dataAplicacao}
              onChange={e => setDataAplicacao(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Total no tanque</Label>
            <p className="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold tabular-nums">
              {totalMl} ml
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Observações</Label>
          <Textarea
            value={obs}
            onChange={e => setObs(e.target.value)}
            rows={2}
            placeholder="OD, turbidez, filtro, EC/pH após aplicação…"
          />
        </div>
        <Button
          type="button"
          disabled={registrar.isPending}
          onClick={() => {
            if (!doseNum || doseNum <= 0) {
              toast.error("Informe a dosagem em ml/L");
              return;
            }
            registrar.mutate({
              testeId: teste.id,
              cultura: culturaDose,
              fase: culturaDose === "alface" ? faseDose : null,
              tipoAplicacao:
                culturaDose === "microverdes" ? tipoAplicacao : "tanque",
              doseMlPorL: doseNum,
              volumeTanqueLitros: volume,
              dataAplicacao,
              observacoes: obs.trim() || null,
            });
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Registrar dosagem
        </Button>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <p>
          Cadastro geral de variedades do projeto:{" "}
          <Link href="/receitas">
            <a className="font-medium text-primary underline">
              Receitas e cadastros
            </a>
          </Link>
          {" "}
          (projeto Microverdes ou Fazenda Vertical). Nesta página você gerencia
          só as variedades do ensaio Chlorella.
        </p>
        <label className="flex items-center gap-2 text-foreground">
          <Switch
            checked={mostrarInativas}
            onCheckedChange={setMostrarInativas}
          />
          Mostrar desabilitadas
        </label>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Sprout className="h-4 w-4" />
          Microverdes — variedades, escuro, fotoperíodo e biomassa
        </h2>
        <p className="text-xs text-muted-foreground">
          Caixa de SN comum às variedades ativas. A dosagem acima atualiza o
          lote inteiro de uma vez. Desabilite a variedade para tirá-la do
          ensaio sem apagar o histórico.
        </p>
        <FormNovaVariedade
          cultura="microverdes"
          pending={addParcela.isPending}
          onAdd={nome =>
            addParcela.mutate({
              testeId: teste.id,
              cultura: "microverdes",
              variedadeNome: nome,
              diasEscuro: 2,
              diasFotoperiodo: 8,
              horasLuz: 16,
              biomassaEsperadaGramas: 30,
              ativo: true,
            })
          }
        />
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Ativa</th>
                <th className="px-3 py-2 font-semibold">Variedade</th>
                <th className="px-2 py-2 font-semibold">Escuro (d)</th>
                <th className="px-2 py-2 font-semibold">Fotoperíodo (d)</th>
                <th className="px-2 py-2 font-semibold">Luz (h/d)</th>
                <th className="px-2 py-2 font-semibold">Biomassa esp. (g)</th>
                <th className="px-2 py-2 font-semibold">Biomassa obs. (g)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {micro.map(p => {
                const ativa = p.ativo !== false;
                return (
                  <tr
                    key={p.id}
                    className={`align-top ${ativa ? "" : "bg-muted/30 opacity-70"}`}
                  >
                    <td className="px-3 py-2">
                      <Switch
                        checked={ativa}
                        onCheckedChange={checked =>
                          saveParcela(p.id, { ativo: checked })
                        }
                        aria-label={`Habilitar ${p.variedadeNome}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <CampoNome
                        value={p.variedadeNome}
                        onSave={nome =>
                          saveParcela(p.id, { variedadeNome: nome })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CampoNum
                        value={p.diasEscuro}
                        onSave={n => saveParcela(p.id, { diasEscuro: n })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CampoNum
                        value={p.diasFotoperiodo}
                        onSave={n => saveParcela(p.id, { diasFotoperiodo: n })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CampoNum
                        value={p.horasLuz}
                        onSave={n => saveParcela(p.id, { horasLuz: n })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CampoNum
                        value={p.biomassaEsperadaGramas}
                        step="0.1"
                        onSave={n =>
                          saveParcela(p.id, { biomassaEsperadaGramas: n })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CampoNum
                        value={p.biomassaObservadaGramas}
                        step="0.1"
                        onSave={n =>
                          saveParcela(p.id, { biomassaObservadaGramas: n })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Leaf className="h-4 w-4" />
          Alface — mudas (50 L), vegetativa (310/500 L), maturação (500 L)
        </h2>
        <FormNovaVariedade
          cultura="alface"
          pending={addParcela.isPending}
          onAdd={nome =>
            addParcela.mutate({
              testeId: teste.id,
              cultura: "alface",
              variedadeNome: nome,
              diasMudas: 14,
              diasVegetativa: 14,
              diasMaturacao: 14,
              biomassaEsperadaGramas: 180,
              ativo: true,
            })
          }
        />
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Ativa</th>
                <th className="px-3 py-2 font-semibold">Variedade</th>
                <th className="px-2 py-2 font-semibold">Mudas (d)</th>
                <th className="px-2 py-2 font-semibold">Vegetativa (d)</th>
                <th className="px-2 py-2 font-semibold">Maturação (d)</th>
                <th className="px-2 py-2 font-semibold">Biomassa esp. (g)</th>
                <th className="px-2 py-2 font-semibold">Biomassa obs. (g)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {alf.map(p => {
                const ativa = p.ativo !== false;
                return (
                  <tr
                    key={p.id}
                    className={`align-top ${ativa ? "" : "bg-muted/30 opacity-70"}`}
                  >
                    <td className="px-3 py-2">
                      <Switch
                        checked={ativa}
                        onCheckedChange={checked =>
                          saveParcela(p.id, { ativo: checked })
                        }
                        aria-label={`Habilitar ${p.variedadeNome}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <CampoNome
                        value={p.variedadeNome}
                        onSave={nome =>
                          saveParcela(p.id, { variedadeNome: nome })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CampoNum
                        value={p.diasMudas}
                        onSave={n => saveParcela(p.id, { diasMudas: n })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CampoNum
                        value={p.diasVegetativa}
                        onSave={n => saveParcela(p.id, { diasVegetativa: n })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CampoNum
                        value={p.diasMaturacao}
                        onSave={n => saveParcela(p.id, { diasMaturacao: n })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CampoNum
                        value={p.biomassaEsperadaGramas}
                        step="0.1"
                        onSave={n =>
                          saveParcela(p.id, { biomassaEsperadaGramas: n })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CampoNum
                        value={p.biomassaObservadaGramas}
                        step="0.1"
                        onSave={n =>
                          saveParcela(p.id, { biomassaObservadaGramas: n })
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold">Histórico de dosagens</h2>
        {dosagens.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Nenhuma dosagem registrada ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {dosagens.map(d => (
              <li
                key={d.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium capitalize">
                    {d.cultura}
                    {d.fase ? ` · ${d.fase}` : ""}
                    {d.tipoAplicacao === "primeira_rega_pre_escuro"
                      ? " · 1ª rega pré-escuro"
                      : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {fmtData(d.dataAplicacao)} · {d.doseMlPorL} ml/L ·{" "}
                    {d.volumeTanqueLitros} L →{" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {d.doseTotalMl} ml
                    </span>
                    {d.proximaPrevista
                      ? ` · próximo ${fmtData(d.proximaPrevista)}`
                      : ""}
                  </p>
                  {d.observacoes ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {d.observacoes}
                    </p>
                  ) : null}
                  {d.registradoPorNome ? (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      por {d.registradoPorNome}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm("Remover este registro de dosagem?")) {
                      deleteDosagem.mutate({ id: d.id });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function TestesPage() {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {slug ? <TesteDetalhe slug={slug} /> : <TestesLista />}
    </div>
  );
}
