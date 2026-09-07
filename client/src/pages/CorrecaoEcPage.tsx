// ============================================================
// Correção EC — calculadora de dose dos concentrados A/B
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
import { formatDecimalForInput, parseOptDecimal } from "@/lib/decimalInput";
import {
  RECEITA_AB_PADRAO,
  calcularCorrecaoEc,
  type ReceitaConcentradoAb,
} from "@shared/correcaoEc";
import { AlertTriangle, Beaker, Droplets, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "fazendas.correcaoEc.receita";

function loadReceita(): ReceitaConcentradoAb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

function fmtMl(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${formatDecimalForInput(n, 1)} mL`;
}

function fmtG(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return `${formatDecimalForInput(n / 1000, 3)} kg`;
  return `${formatDecimalForInput(n, 2)} g`;
}

export default function CorrecaoEcPage() {
  const [volume, setVolume] = useState("");
  const [ecAtual, setEcAtual] = useState("");
  const [ecAlvo, setEcAlvo] = useState("");
  const [receita, setReceita] = useState<ReceitaConcentradoAb>(() => loadReceita());
  const [mostrarReceita, setMostrarReceita] = useState(false);

  const resultado = useMemo(() => {
    const v = parseOptDecimal(volume);
    const a = parseOptDecimal(ecAtual);
    const t = parseOptDecimal(ecAlvo);
    if (v == null || a == null || t == null) return null;
    return calcularCorrecaoEc({
      volumeCaixaL: v,
      ecAtual: a,
      ecAlvo: t,
      receita,
    });
  }, [volume, ecAtual, ecAlvo, receita]);

  const salvarReceita = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receita));
    toast.success("Receita dos concentrados salva neste navegador");
  };

  const restaurarReceita = () => {
    setReceita(RECEITA_AB_PADRAO);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Receita restaurada ao padrão");
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
      <Header />
      <main className="container py-6 max-w-3xl space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Beaker className="w-6 h-6 text-cyan-600" />
            Correção de EC
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Informe o volume da caixa, o EC atual e o EC desejado. A calculadora indica quantos mL dos
            concentrados <strong>A</strong> e <strong>B</strong> adicionar (dosagem 1:1).
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados da caixa</CardTitle>
            <CardDescription>Use vírgula ou ponto nos decimais (ex.: 1,35).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Volume da caixa (L)</Label>
              <Input
                inputMode="decimal"
                placeholder="Ex: 500"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
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

        {resultado ? (
          <Card className="border-cyan-500/30 bg-cyan-500/[0.04]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-600" />
                Dose recomendada
              </CardTitle>
              <CardDescription>
                ΔEC {formatDecimalForInput(resultado.deltaEc, 2)} mS/cm · potência ≈{" "}
                {formatDecimalForInput(resultado.potenciaMlPorL, 3)} mS por mL/L de cada concentrado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {resultado.aviso ? (
                <div className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-50">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{resultado.aviso}</p>
                </div>
              ) : null}

              {resultado.diluirComAguaL != null ? (
                <div className="rounded-xl border bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Água limpa a adicionar</p>
                  <p className="font-display text-3xl font-bold tabular-nums mt-1">
                    {formatDecimalForInput(resultado.diluirComAguaL, 1)} L
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Galão A</p>
                    <p className="font-display text-3xl font-bold tabular-nums mt-1 text-emerald-900 dark:text-emerald-100">
                      {fmtMl(resultado.mlA)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-center">
                    <p className="text-xs font-semibold text-sky-800 dark:text-sky-200">Galão B</p>
                    <p className="font-display text-3xl font-bold tabular-nums mt-1 text-sky-900 dark:text-sky-100">
                      {fmtMl(resultado.mlB)}
                    </p>
                  </div>
                </div>
              )}

              {resultado.sais.length > 0 ? (
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
                        {resultado.sais.map((s) => (
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
                Adicione A e B em volumes iguais, misture bem e meça o EC de novo após estabilizar. O cálculo usa a
                massa dos sais nos galões de {receita.volumeGalaoL} L e o fator TDS {receita.fatorTds} do medidor —
                calibre o fator se a leitura real divergir.
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
                Estoque padrão: 2×{receita.volumeGalaoL} L · A {formatDecimalForInput(resultado?.concA_gL ?? 235.16, 1)}{" "}
                g/L · B {formatDecimalForInput(resultado?.concB_gL ?? 130.8, 1)} g/L
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
      </main>
    </div>
  );
}
