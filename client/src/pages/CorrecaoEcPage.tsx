// ============================================================
// Correção EC / pH — calculadoras para operadores
// ============================================================

import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDecimalForInput, parseOptDecimal } from "@/lib/decimalInput";
import {
  RECEITA_AB_PADRAO,
  calcularCorrecaoEc,
  type ReceitaConcentradoAb,
} from "@shared/correcaoEc";
import {
  FATOR_ML_ESTOQUE_POR_L_POR_PH_PADRAO,
  KOH_ESTOQUE_G_PRODUTO_POR_L,
  KOH_ESTOQUE_MASSA_G,
  KOH_ESTOQUE_VOLUME_L,
  KOH_PA_EMBALAGEM_G,
  KOH_PRODUTO_NOME,
  KOH_TEOR_MIN,
  calcularCorrecaoPhKoh,
} from "@shared/correcaoPh";
import { AlertTriangle, Beaker, Copy, Droplets, FlaskConical, Link2, RotateCcw, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

const STORAGE_KEY_EC = "fazendas.correcaoEc.receita";
const STORAGE_KEY_PH = "fazendas.correcaoPh.fatorMlEstoque";
export const CALCULADORA_PUBLIC_PATH = "/calculadora";

function loadReceita(): ReceitaConcentradoAb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EC);
    if (!raw) return RECEITA_AB_PADRAO;
    const parsed = JSON.parse(raw) as ReceitaConcentradoAb;
    if (!parsed?.galaoA?.length || !parsed?.galaoB?.length) return RECEITA_AB_PADRAO;
    return {
      ...RECEITA_AB_PADRAO,
      ...parsed,
      volumeGalaoL: parsed.volumeGalaoL > 0 ? parsed.volumeGalaoL : 50,
      fatorTds: parsed.fatorTds > 0 ? parsed.fatorTds : 700,
    };
  } catch {
    return RECEITA_AB_PADRAO;
  }
}

function loadFatorPh(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PH);
    if (!raw) return FATOR_ML_ESTOQUE_POR_L_POR_PH_PADRAO;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : FATOR_ML_ESTOQUE_POR_L_POR_PH_PADRAO;
  } catch {
    return FATOR_ML_ESTOQUE_POR_L_POR_PH_PADRAO;
  }
}

function fmtMl(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${formatDecimalForInput(n, 1)} mL`;
}

function fmtG(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return `${formatDecimalForInput(n / 1000, 3)} kg`;
  return `${formatDecimalForInput(n, 2)} g`;
}

export default function CorrecaoEcPage({ publicMode = false }: { publicMode?: boolean }) {
  const [volumeEc, setVolumeEc] = useState("");
  const [ecAtual, setEcAtual] = useState("");
  const [ecAlvo, setEcAlvo] = useState("");
  const [receita, setReceita] = useState<ReceitaConcentradoAb>(() => loadReceita());
  const [mostrarReceita, setMostrarReceita] = useState(false);

  const [volumePh, setVolumePh] = useState("");
  const [phAtual, setPhAtual] = useState("");
  const [phAlvo, setPhAlvo] = useState("");
  const [fatorPh, setFatorPh] = useState(() => loadFatorPh());
  const [mostrarFatorPh, setMostrarFatorPh] = useState(false);

  const resultadoEc = useMemo(() => {
    const v = parseOptDecimal(volumeEc);
    const a = parseOptDecimal(ecAtual);
    const t = parseOptDecimal(ecAlvo);
    if (v == null || a == null || t == null) return null;
    return calcularCorrecaoEc({
      volumeCaixaL: v,
      ecAtual: a,
      ecAlvo: t,
      receita,
    });
  }, [volumeEc, ecAtual, ecAlvo, receita]);

  const resultadoPh = useMemo(() => {
    const v = parseOptDecimal(volumePh);
    const a = parseOptDecimal(phAtual);
    const t = parseOptDecimal(phAlvo);
    if (v == null || a == null || t == null) return null;
    return calcularCorrecaoPhKoh({
      volumeCaixaL: v,
      phAtual: a,
      phAlvo: t,
      fatorMlEstoquePorLPorPh: fatorPh,
      estoqueGProdutoPorL: KOH_ESTOQUE_G_PRODUTO_POR_L,
      teor: KOH_TEOR_MIN,
      embalagemG: KOH_PA_EMBALAGEM_G,
    });
  }, [volumePh, phAtual, phAlvo, fatorPh]);

  const salvarReceita = () => {
    localStorage.setItem(STORAGE_KEY_EC, JSON.stringify(receita));
    toast.success("Receita dos concentrados salva neste navegador");
  };

  const restaurarReceita = () => {
    setReceita(RECEITA_AB_PADRAO);
    localStorage.removeItem(STORAGE_KEY_EC);
    toast.success("Receita restaurada ao padrão");
  };

  const salvarFatorPh = () => {
    localStorage.setItem(STORAGE_KEY_PH, String(fatorPh));
    toast.success("Fator de correção de pH salvo neste navegador");
  };

  const restaurarFatorPh = () => {
    setFatorPh(FATOR_ML_ESTOQUE_POR_L_POR_PH_PADRAO);
    localStorage.removeItem(STORAGE_KEY_PH);
    toast.success("Fator de pH restaurado ao padrão");
  };

  const copiarLinkPublico = async () => {
    const url = `${window.location.origin}${CALCULADORA_PUBLIC_PATH}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link público copiado");
    } catch {
      toast.message(url);
    }
  };

  const updateSal = (galao: "A" | "B", id: string, massaKg: number) => {
    setReceita((prev) => ({
      ...prev,
      [galao === "A" ? "galaoA" : "galaoB"]: (galao === "A" ? prev.galaoA : prev.galaoB).map((s) =>
        s.id === id ? { ...s, massaKg } : s,
      ),
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      {publicMode ? (
        <header className="border-b border-border/60 bg-card/80">
          <div className="container py-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Beaker className="w-5 h-5 text-cyan-600 shrink-0" />
              <div className="min-w-0">
                <p className="font-display font-bold text-sm truncate">Fazendas Up</p>
                <p className="text-[11px] text-muted-foreground">Calculadora pública · EC / pH</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={copiarLinkPublico}>
                <Copy className="w-3.5 h-3.5" />
                Copiar link
              </Button>
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link href="/login">Entrar no sistema</Link>
              </Button>
            </div>
          </div>
        </header>
      ) : (
        <Header />
      )}
      <main className="container py-6 max-w-3xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Beaker className="w-6 h-6 text-cyan-600" />
              Correção EC / pH
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {publicMode
                ? "Ferramenta aberta — sem login. Escolha EC (concentrados A/B) ou pH (KOH P.A.)."
                : "Ferramenta liberada para operadores. Escolha EC (concentrados A/B) ou pH (hidróxido de potássio P.A.)."}
            </p>
          </div>
          {!publicMode ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={copiarLinkPublico}>
              <Link2 className="w-3.5 h-3.5" />
              Link público
            </Button>
          ) : null}
        </div>

        <Tabs defaultValue="ec" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="ec" className="gap-1.5 text-xs sm:text-sm">
              <Droplets className="w-3.5 h-3.5" /> Correção EC
            </TabsTrigger>
            <TabsTrigger value="ph" className="gap-1.5 text-xs sm:text-sm">
              <FlaskConical className="w-3.5 h-3.5" /> Correção pH (KOH)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ec" className="space-y-4 mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados da caixa</CardTitle>
                <CardDescription>
                  Informe volume, EC atual e alvo. A dose de A e B é 1:1. Use vírgula ou ponto (ex.: 1,35).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Volume da caixa (L)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex: 500"
                    value={volumeEc}
                    onChange={(e) => setVolumeEc(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">EC atual (mS/cm)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex: 1,20"
                    value={ecAtual}
                    onChange={(e) => setEcAtual(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">EC alvo (mS/cm)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex: 1,50"
                    value={ecAlvo}
                    onChange={(e) => setEcAlvo(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {resultadoEc ? (
              <Card className="border-cyan-500/30 bg-cyan-500/[0.04]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-cyan-600" />
                    Dose recomendada
                  </CardTitle>
                  <CardDescription>
                    ΔEC {formatDecimalForInput(resultadoEc.deltaEc, 2)} mS/cm · potência ≈{" "}
                    {formatDecimalForInput(resultadoEc.potenciaMlPorL, 3)} mS por mL/L de cada concentrado
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resultadoEc.aviso ? (
                    <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-50">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{resultadoEc.aviso}</p>
                    </div>
                  ) : null}

                  {resultadoEc.diluirComAguaL != null ? (
                    <div className="rounded-xl border bg-card p-4 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Água limpa a adicionar
                      </p>
                      <p className="font-display text-3xl font-bold tabular-nums mt-1">
                        {formatDecimalForInput(resultadoEc.diluirComAguaL, 1)} L
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Galão A</p>
                        <p className="font-display text-3xl font-bold tabular-nums mt-1 text-emerald-900 dark:text-emerald-100">
                          {fmtMl(resultadoEc.mlA)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-center">
                        <p className="text-xs font-semibold text-sky-800 dark:text-sky-200">Galão B</p>
                        <p className="font-display text-3xl font-bold tabular-nums mt-1 text-sky-900 dark:text-sky-100">
                          {fmtMl(resultadoEc.mlB)}
                        </p>
                      </div>
                    </div>
                  )}

                  {resultadoEc.sais.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Equivalente em sais (já dissolvidos nos concentrados)
                      </p>
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/40 text-xs">
                            <tr>
                              <th className="text-left p-2">Galão</th>
                              <th className="text-left p-2">Sal</th>
                              <th className="text-right p-2">Massa</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {resultadoEc.sais.map((s) => (
                              <tr key={`${s.galao}-${s.id}`}>
                                <td className="p-2 font-medium">{s.galao}</td>
                                <td className="p-2 text-muted-foreground">{s.nome}</td>
                                <td className="p-2 text-right tabular-nums">{fmtG(s.gramas)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Adicione A e B em volumes iguais, misture bem e meça o EC de novo após estabilizar. Calibre o
                    fator TDS se a leitura real divergir.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Preencha volume, EC atual e EC alvo para ver a dose.
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Concentrados A / B</CardTitle>
                  <CardDescription>
                    Estoque padrão: 2×{receita.volumeGalaoL} L · A{" "}
                    {formatDecimalForInput(resultadoEc?.concA_gL ?? 235.16, 1)} g/L · B{" "}
                    {formatDecimalForInput(resultadoEc?.concB_gL ?? 130.8, 1)} g/L
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setMostrarReceita((v) => !v)}>
                  {mostrarReceita ? "Ocultar receita" : "Editar receita"}
                </Button>
              </CardHeader>
              {mostrarReceita ? (
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Volume de cada galão (L)</Label>
                      <Input
                        inputMode="decimal"
                        value={String(receita.volumeGalaoL)}
                        onChange={(e) => {
                          const n = parseOptDecimal(e.target.value);
                          if (n != null && n > 0) setReceita((r) => ({ ...r, volumeGalaoL: n }));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Fator TDS do medidor</Label>
                      <Select
                        value={String(receita.fatorTds)}
                        onValueChange={(v) => setReceita((r) => ({ ...r, fatorTds: Number(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="500">500 (escala 500)</SelectItem>
                          <SelectItem value="640">640 (fertilizantes)</SelectItem>
                          <SelectItem value="700">700 (escala 700 — padrão)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Galão A</p>
                      {receita.galaoA.map((s) => (
                        <div key={s.id} className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{s.nome} (kg)</Label>
                          <Input
                            inputMode="decimal"
                            value={formatDecimalForInput(s.massaKg, 3)}
                            onChange={(e) => {
                              const n = parseOptDecimal(e.target.value);
                              if (n != null && n >= 0) updateSal("A", s.id, n);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">Galão B</p>
                      {receita.galaoB.map((s) => (
                        <div key={s.id} className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">{s.nome} (kg)</Label>
                          <Input
                            inputMode="decimal"
                            value={formatDecimalForInput(s.massaKg, 3)}
                            onChange={(e) => {
                              const n = parseOptDecimal(e.target.value);
                              if (n != null && n >= 0) updateSal("B", s.id, n);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={salvarReceita}>
                      Salvar receita
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={restaurarReceita}>
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar padrão
                    </Button>
                  </div>
                </CardContent>
              ) : null}
            </Card>
          </TabsContent>

          <TabsContent value="ph" className="space-y-4 mt-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados da caixa</CardTitle>
                <CardDescription>
                  Produto: <strong>{KOH_PRODUTO_NOME}</strong> — teor mín. {Math.round(KOH_TEOR_MIN * 100)}%.
                  Estoque: <strong>{KOH_ESTOQUE_MASSA_G} g</strong> do produto em{" "}
                  <strong>{KOH_ESTOQUE_VOLUME_L} L</strong> de água. A calculadora indica quantos{" "}
                  <strong>mL desse estoque</strong> colocar na caixa para subir o pH.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Volume da caixa (L)</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex: 500"
                    value={volumePh}
                    onChange={(e) => setVolumePh(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">pH atual</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex: 5,50"
                    value={phAtual}
                    onChange={(e) => setPhAtual(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">pH alvo</Label>
                  <Input
                    inputMode="decimal"
                    placeholder="Ex: 6,00"
                    value={phAlvo}
                    onChange={(e) => setPhAlvo(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {resultadoPh ? (
              <Card className="border-violet-500/30 bg-violet-500/[0.04]">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-violet-600" />
                    Dose na caixa
                  </CardTitle>
                  <CardDescription>
                    ΔpH {formatDecimalForInput(resultadoPh.deltaPh, 2)} · fator{" "}
                    {formatDecimalForInput(fatorPh, 3)} mL estoque / L / unidade de pH
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {resultadoPh.aviso ? (
                    <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-50">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <p>{resultadoPh.aviso}</p>
                    </div>
                  ) : null}

                  {!resultadoPh.precisaAcido && resultadoPh.mlEstoque > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-center sm:col-span-2">
                          <p className="text-xs font-semibold text-violet-800 dark:text-violet-200">
                            Solução estoque KOH a adicionar na caixa
                          </p>
                          <p className="font-display text-4xl font-bold tabular-nums mt-1 text-violet-900 dark:text-violet-100">
                            {fmtMl(resultadoPh.mlEstoque)}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            ≈ {fmtG(resultadoPh.produtoGramas)} de produto (
                            {fmtG(resultadoPh.kohPuroGramas)} KOH puro a {Math.round(resultadoPh.teor * 100)}%) ·
                            estoque {KOH_ESTOQUE_G_PRODUTO_POR_L} g/L
                            {resultadoPh.dosesPorLitroEstoque != null
                              ? ` · ~${formatDecimalForInput(resultadoPh.dosesPorLitroEstoque, 0)} doses desse tamanho por litro de estoque`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border bg-card p-3 text-sm space-y-2">
                        <p className="font-semibold flex items-center gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-600" />
                          Como preparar e aplicar
                        </p>
                        <ol className="list-decimal pl-4 space-y-1 text-muted-foreground text-xs sm:text-sm">
                          <li>
                            Prepare o estoque (se ainda não tiver): dissolva{" "}
                            <strong className="text-foreground">{KOH_ESTOQUE_MASSA_G} g</strong> do produto
                            (teor mín. {Math.round(KOH_TEOR_MIN * 100)}%, embalagem {KOH_PA_EMBALAGEM_G} g) em{" "}
                            <strong className="text-foreground">{KOH_ESTOQUE_VOLUME_L} L</strong> de água fria —
                            água primeiro, KOH depois, com EPI.
                          </li>
                          <li>
                            Com seringa ou proveta, meça{" "}
                            <strong className="text-foreground">{fmtMl(resultadoPh.mlEstoque)}</strong> dessa
                            solução estoque.
                          </li>
                          <li>
                            Adicione na caixa, misture bem e meça o pH após estabilizar. Se precisar, corrija de
                            novo em pequenas doses.
                          </li>
                        </ol>
                      </div>
                    </>
                  ) : null}

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Se na prática você usa bem menos ou mais mL, ajuste o fator abaixo até bater com o seu
                    histórico de correção.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Preencha volume, pH atual e pH alvo para ver quantos mL do estoque adicionar.
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Calibração do fator</CardTitle>
                  <CardDescription>
                    Padrão {formatDecimalForInput(FATOR_ML_ESTOQUE_POR_L_POR_PH_PADRAO, 3)} mL de estoque (100
                    g/L) por litro da caixa para subir 1,0 de pH
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setMostrarFatorPh((v) => !v)}>
                  {mostrarFatorPh ? "Ocultar" : "Ajustar fator"}
                </Button>
              </CardHeader>
              {mostrarFatorPh ? (
                <CardContent className="space-y-3">
                  <div className="space-y-1 max-w-xs">
                    <Label className="text-xs">mL estoque / L caixa / unidade de pH</Label>
                    <Input
                      inputMode="decimal"
                      value={formatDecimalForInput(fatorPh, 3)}
                      onChange={(e) => {
                        const n = parseOptDecimal(e.target.value);
                        if (n != null && n > 0) setFatorPh(n);
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={salvarFatorPh}>
                      Salvar fator
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={restaurarFatorPh}>
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restaurar padrão
                    </Button>
                  </div>
                </CardContent>
              ) : null}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
