import { useCallback, useMemo, useRef, useState } from "react";
import Header from "@/components/Header";
import { useFazenda } from "@/contexts/FazendaContext";
import type { Torre } from "@/lib/types";
import { useRole } from "@/hooks/useRole";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Camera,
  Download,
  FlaskConical,
  ImagePlus,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";

type VisaoOutputs = inferRouterOutputs<AppRouter>["visao"];
type VisaoResultado = VisaoOutputs["analisar"]["resultado"];

const ROTULO_VALUES = [
  "saude_ok",
  "atraso_fenologico",
  "doenca_foliar",
  "praga",
  "deficiencia_nutricional",
  "estresse_hidrico",
  "anomalia_iluminacao",
  "outro",
] as const;
type RotuloPrincipal = (typeof ROTULO_VALUES)[number];

const ROTULOS: { value: RotuloPrincipal; label: string }[] = [
  { value: "saude_ok", label: "Saúde aparentemente boa" },
  { value: "atraso_fenologico", label: "Atraso fenológico" },
  { value: "doenca_foliar", label: "Doença foliar" },
  { value: "praga", label: "Praga" },
  { value: "deficiencia_nutricional", label: "Deficiência nutricional" },
  { value: "estresse_hidrico", label: "Estresse hídrico" },
  { value: "anomalia_iluminacao", label: "Anomalia de iluminação" },
  { value: "outro", label: "Outro" },
];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = r.result;
      if (typeof res !== "string") {
        reject(new Error("Leitura inválida"));
        return;
      }
      const comma = res.indexOf(",");
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function VisaoPage() {
  const { data: fazendaData } = useFazenda();
  const torres = fazendaData.torres;
  const { isAdmin } = useRole();
  const [tab, setTab] = useState("analise");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);
  const lastImagePayload = useRef<{ base64: string; mime: string } | null>(null);
  /** Imagem carregada só no separador Treino (sem passar pela análise). */
  const treinoOnlyPayload = useRef<{ base64: string; mime: string } | null>(null);
  const [torreSlug, setTorreSlug] = useState<string>("");
  const [variedadeNome, setVariedadeNome] = useState("");
  const [contextoNotas, setContextoNotas] = useState("");
  const [ultimoResultado, setUltimoResultado] = useState<VisaoResultado | null>(null);
  const [ultimoId, setUltimoId] = useState<number | null>(null);
  const [ultimoSha, setUltimoSha] = useState<string | null>(null);

  const [rotulo, setRotulo] = useState<RotuloPrincipal>("saude_ok");
  const [split, setSplit] = useState<"treino" | "validacao" | "teste">("treino");
  /** Força re-render quando refs de imagem para treino mudam. */
  const [payloadEpoch, setPayloadEpoch] = useState(0);

  const utils = trpc.useUtils();
  const analisar = trpc.visao.analisar.useMutation({
    onSuccess: (data) => {
      setUltimoResultado(data.resultado);
      setUltimoId(data.id);
      setUltimoSha(data.imageSha256);
      toast.success("Análise registrada");
      void utils.visao.listarAnalises.invalidate();
    },
    onError: (e) => toast.error(e.message || "Falha na análise"),
  });

  const enviarAmostra = trpc.visao.enviarAmostraTreino.useMutation({
    onSuccess: () => {
      treinoOnlyPayload.current = null;
      setPayloadEpoch((n) => n + 1);
      toast.success("Amostra guardada para treino");
      void utils.visao.listarAmostrasTreino.invalidate();
    },
    onError: (e) => toast.error(e.message || "Falha ao enviar amostra"),
  });

  const confirmar = trpc.visao.confirmarAmostraTreino.useMutation({
    onSuccess: () => {
      toast.success("Estado atualizado");
      void utils.visao.listarAmostrasTreino.invalidate();
    },
    onError: (e) => toast.error(e.message || "Falha"),
  });

  const exportQuery = trpc.visao.exportarAmostrasTreinoJson.useQuery(
    { limit: 200 },
    { enabled: false },
  );

  const listAnalises = trpc.visao.listarAnalises.useQuery({ limit: 25 });
  const listAmostras = trpc.visao.listarAmostrasTreino.useQuery({ limit: 60 });

  const torreItems = useMemo(
    () => (torres || []).map((t: Torre) => ({ slug: t.id, label: t.nome || t.id })),
    [torres],
  );

  const onPickFile = useCallback((file: File | null) => {
    fileRef.current = file;
    lastImagePayload.current = null;
    setUltimoResultado(null);
    setUltimoId(null);
    setUltimoSha(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    setPayloadEpoch((n) => n + 1);
  }, []);

  const runAnalyze = async () => {
    const f = fileRef.current;
    if (!f) {
      toast.error("Selecione uma imagem");
      return;
    }
    const base64 = await fileToBase64(f);
    lastImagePayload.current = { base64, mime: f.type || "image/jpeg" };
    setPayloadEpoch((n) => n + 1);
    await analisar.mutateAsync({
      base64Image: base64,
      mimeType: f.type || undefined,
      torreSlug: torreSlug || null,
      variedadeNome: variedadeNome.trim() || null,
      contextoNotas: contextoNotas.trim() || null,
    });
  };

  const runTrainingSubmit = async () => {
    const treinoSnap = treinoOnlyPayload.current;
    const analiseSnap = lastImagePayload.current;
    const pay = treinoSnap ?? analiseSnap;
    if (!pay) {
      toast.error("Carregue uma imagem abaixo ou faça primeiro uma análise no outro separador.");
      return;
    }
    await enviarAmostra.mutateAsync({
      base64Image: pay.base64,
      mimeType: pay.mime,
      rotuloPrincipal: rotulo,
      splitTreino: split,
      analysisId: treinoSnap ? undefined : ultimoId ?? undefined,
    });
  };

  const onPickTreinoOnlyFile = async (file: File | null) => {
    treinoOnlyPayload.current = null;
    if (!file) {
      setPayloadEpoch((n) => n + 1);
      return;
    }
    const base64 = await fileToBase64(file);
    treinoOnlyPayload.current = { base64, mime: file.type || "image/jpeg" };
    setPayloadEpoch((n) => n + 1);
    toast("Imagem pronta para rotular — escolha o rótulo e guarde.");
  };

  void payloadEpoch;
  const podeEnviarTreino = Boolean(treinoOnlyPayload.current || lastImagePayload.current);

  const onExport = async () => {
    const r = await exportQuery.refetch();
    if (r.data) {
      downloadJson(`amostras-visao-${new Date().toISOString().slice(0, 10)}.json`, r.data);
      toast.success("Exportação gerada");
    } else if (r.error) {
      toast.error(r.error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-16 pt-6">
        <div className="space-y-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            <Camera className="h-7 w-7 text-emerald-600" aria-hidden />
            Visão do cultivo
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Envio de fotos para detecção assistida de atraso, stress, possíveis pragas ou doenças — com motor de
            demonstração e circuito para rotular amostras e exportar dados para treinar um modelo futuro.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="analise" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              Análise
            </TabsTrigger>
            <TabsTrigger value="treino" className="gap-1.5">
              <FlaskConical className="h-4 w-4" />
              Treino
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analise" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Nova foto</CardTitle>
                <CardDescription>
                  JPEG ou PNG até 6 MB. O resultado atual é simulado (`stub-v1`) — adequado para fluxo de produto e
                  coleta de rótulos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="visao-file">Imagem</Label>
                    <Input
                      id="visao-file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="max-w-xs cursor-pointer"
                      onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                    />
                  </div>
                  {torreItems.length > 0 && (
                    <div className="space-y-2">
                      <Label>Torre (opcional)</Label>
                      <Select value={torreSlug || "__none__"} onValueChange={(v) => setTorreSlug(v === "__none__" ? "" : v)}>
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {torreItems.map((t) => (
                            <SelectItem key={t.slug} value={t.slug}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="vis-var">Variedade (opcional)</Label>
                    <Input
                      id="vis-var"
                      value={variedadeNome}
                      onChange={(e) => setVariedadeNome(e.target.value)}
                      placeholder="Ex.: rúcula selvagem"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="vis-ctx">Notas de contexto</Label>
                    <Textarea
                      id="vis-ctx"
                      value={contextoNotas}
                      onChange={(e) => setContextoNotas(e.target.value)}
                      placeholder="Ex.: 3.º dia após transplante; mancha observada só nas folhas inferiores"
                      rows={2}
                    />
                  </div>
                </div>

                {previewUrl && (
                  <div className="overflow-hidden rounded-lg border bg-muted/30">
                    <img src={previewUrl} alt="Pré-visualização" className="mx-auto max-h-72 object-contain" />
                  </div>
                )}

                <Button type="button" onClick={() => void runAnalyze()} disabled={analisar.isPending || !fileRef.current}>
                  {analisar.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A analisar…
                    </>
                  ) : (
                    <>
                      <ImagePlus className="mr-2 h-4 w-4" />
                      Analisar imagem
                    </>
                  )}
                </Button>

                {ultimoResultado && (
                  <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-4 text-sm">
                    <p className="font-medium text-foreground">{ultimoResultado.sumario}</p>
                    {ultimoResultado.avisoLegal && (
                      <p className="text-xs text-muted-foreground">{ultimoResultado.avisoLegal}</p>
                    )}
                    {ultimoResultado.metricasDerivadas && (
                      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                        {ultimoResultado.metricasDerivadas.luminosidadeMedia != null && (
                          <>
                            <dt className="text-muted-foreground">Luminosidade (deriv.)</dt>
                            <dd>{ultimoResultado.metricasDerivadas.luminosidadeMedia}</dd>
                          </>
                        )}
                        {ultimoResultado.metricasDerivadas.saturacaoVerde != null && (
                          <>
                            <dt className="text-muted-foreground">Verde (deriv.)</dt>
                            <dd>{ultimoResultado.metricasDerivadas.saturacaoVerde}</dd>
                          </>
                        )}
                        {ultimoResultado.metricasDerivadas.entropiaBytes != null && (
                          <>
                            <dt className="text-muted-foreground">Entropia</dt>
                            <dd>{ultimoResultado.metricasDerivadas.entropiaBytes}</dd>
                          </>
                        )}
                      </dl>
                    )}
                    <ul className="space-y-2">
                      {ultimoResultado.deteccoes.map((d, i) => (
                        <li
                          key={i}
                          className="rounded-md border border-border/60 bg-background/80 px-3 py-2"
                        >
                          <span className="font-medium text-foreground">
                            {(d.categoria || "").replace(/_/g, " ")}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            — conf. {Math.round((d.confianca ?? 0) * 100)}%
                          </span>
                          <p className="mt-1 text-muted-foreground">{d.descricao}</p>
                          {d.sugestoes?.length ? (
                            <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                              {d.sugestoes.map((s, j) => (
                                <li key={j}>{s}</li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                    {ultimoSha && (
                      <p className="font-mono text-[10px] text-muted-foreground">SHA-256: {ultimoSha}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico recente</CardTitle>
              </CardHeader>
              <CardContent>
                {listAnalises.isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando…</p>
                ) : listAnalises.data?.length ? (
                  <ul className="space-y-2 text-sm">
                    {listAnalises.data.map((row) => {
                      const r = row.resultadoJson as unknown as VisaoResultado;
                      return (
                        <li
                          key={row.id}
                          className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-border/50 px-3 py-2"
                        >
                          <span className="font-medium">#{row.id}</span>
                          <span className="text-muted-foreground">
                            {row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}
                          </span>
                          <span className="w-full text-xs text-muted-foreground line-clamp-2">{r?.sumario}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Ainda não há análises neste projeto.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treino" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Contribuir amostras rotuladas</CardTitle>
                <CardDescription>
                  Pode usar a imagem já analisada no outro separador, ou carregar uma foto só para rotular. Os dados
                  servem para treino supervisionado futuro; só administradores confirmam e exportam.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="visao-treino-file">Imagem só para treino (opcional)</Label>
                  <Input
                    id="visao-treino-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="max-w-md cursor-pointer"
                    onChange={(e) => void onPickTreinoOnlyFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Se escolher um ficheiro aqui, não precisa de correr a análise antes — o vínculo com uma análise anterior fica
                    desligado.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Rótulo principal</Label>
                    <Select value={rotulo} onValueChange={(v) => setRotulo(v as RotuloPrincipal)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROTULOS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Divisão (split)</Label>
                    <Select value={split} onValueChange={(v) => setSplit(v as typeof split)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="treino">Treino</SelectItem>
                        <SelectItem value="validacao">Validação</SelectItem>
                        <SelectItem value="teste">Teste</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void runTrainingSubmit()}
                  disabled={enviarAmostra.isPending || !podeEnviarTreino}
                >
                  {enviarAmostra.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A guardar…
                    </>
                  ) : (
                    <>
                      <FlaskConical className="mr-2 h-4 w-4" />
                      Guardar amostra
                    </>
                  )}
                </Button>
                {!podeEnviarTreino && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Carregue uma imagem acima ou faça uma análise no separador «Análise» para associar rótulos.
                  </p>
                )}
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4" />
                    Administração
                  </CardTitle>
                  <CardDescription>Confirmar amostras e exportar JSON para treino externo.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" size="sm" onClick={() => void onExport()} disabled={exportQuery.isFetching}>
                    {exportQuery.isFetching ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Exportar JSON (últimas 200)
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Amostras recentes</CardTitle>
              </CardHeader>
              <CardContent>
                {listAmostras.isLoading ? (
                  <p className="text-sm text-muted-foreground">Carregando…</p>
                ) : listAmostras.data?.length ? (
                  <ul className="space-y-2 text-sm">
                    {listAmostras.data.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center gap-2 rounded border border-border/50 px-3 py-2"
                      >
                        <span className="font-medium">#{s.id}</span>
                        <span>{s.rotuloPrincipal}</span>
                        <span className="text-muted-foreground">{s.splitTreino}</span>
                        {s.confirmadoPorAdmin ? (
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-800 dark:text-emerald-200">
                            confirmado
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">pendente</span>
                        )}
                        {isAdmin && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="ml-auto h-7 text-xs"
                            onClick={() =>
                              void confirmar.mutateAsync({ id: s.id, confirmado: !s.confirmadoPorAdmin })
                            }
                          >
                            {s.confirmadoPorAdmin ? "Desmarcar" : "Confirmar"}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma amostra ainda.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
