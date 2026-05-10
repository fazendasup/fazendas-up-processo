import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Trash2,
  Pause,
  Play,
} from "lucide-react";
import {
  ROTULO_MODO_PROGRAMACAO,
  DIAS_SEMANA,
  type ModoProgramacaoPainel,
  type ProgramacaoVertical,
  criarProgramacaoVazia,
  resumoProgramacao,
  validarProgramacao,
  type NutricaoTipo,
} from "@/lib/programacoesAutomacao";
import { cn } from "@/lib/utils";

type TorreMini = { id: string; nome: string };
type CaixaMini = { id: string; nome: string };

type NivelLog = "ok" | "warn" | "critico";

type Props = {
  torres: TorreMini[];
  caixasAgua: CaixaMini[];
  programacoes: ProgramacaoVertical[];
  onProgramacoesChange: (lista: ProgramacaoVertical[]) => void;
  supervisorPausado: boolean;
  onToggleSupervisor: () => void;
  pushLog: (nivel: NivelLog, msg: string) => void;
};

const MODOS: ModoProgramacaoPainel[] = [
  "semanal",
  "temporizador",
  "bloco",
  "bloco_sensores",
  "sensores_inteligentes",
  "hidro_multicaixa",
  "pos_torre",
  "alarme",
  "desativado",
];

function patch<P extends ProgramacaoVertical>(p: P, partial: Partial<P>): P {
  return { ...p, ...partial };
}

function CampoListaHorarios({
  valores,
  onChange,
  label,
}: {
  valores: string[];
  onChange: (v: string[]) => void;
  label: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onChange([...valores, "12:00"])}>
          <Plus className="w-3 h-3" />
          Horário
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {valores.map((h, i) => (
          <div key={`${h}-${i}`} className="flex items-center gap-1">
            <Input
              className="h-8 w-[88px] text-sm font-mono"
              value={h}
              onChange={(e) => {
                const next = [...valores];
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder="HH:mm"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground"
              onClick={() => onChange(valores.filter((_, j) => j !== i))}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeletorDias({
  dias,
  onChange,
}: {
  dias: number[];
  onChange: (d: number[]) => void;
}) {
  const set = new Set(dias);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Dias da semana</Label>
      <div className="flex flex-wrap gap-1">
        {DIAS_SEMANA.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => {
              const n = new Set(set);
              if (n.has(d.id)) n.delete(d.id);
              else n.add(d.id);
              onChange(Array.from(n).sort((a, b) => a - b));
            }}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] font-medium transition",
              set.has(d.id)
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50",
            )}
          >
            {d.short}
          </button>
        ))}
      </div>
    </div>
  );
}

function FormPorModo({
  p,
  onChange,
  torres,
  caixasAgua,
}: {
  p: ProgramacaoVertical;
  onChange: (next: ProgramacaoVertical) => void;
  torres: TorreMini[];
  caixasAgua: CaixaMini[];
}) {
  const nomeTorre = (id: string) => torres.find((t) => t.id === id)?.nome ?? (id || "—");

  switch (p.modo) {
    case "semanal":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Torre (setor vertical)</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.torreId ?? ""}
              onChange={(e) => onChange(patch(p, { torreId: e.target.value }))}
            >
              <option value="">Selecione…</option>
              {torres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <SeletorDias dias={p.diasSemana ?? []} onChange={(d) => onChange(patch(p, { diasSemana: d }))} />
          <div className="space-y-2">
            <Label className="text-xs">Duração (min)</Label>
            <Input
              type="number"
              min={1}
              className="h-9"
              value={p.duracaoMin ?? 10}
              onChange={(e) => onChange(patch(p, { duracaoMin: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Nutrição na linha</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.nutricao ?? "solucao"}
              onChange={(e) => onChange(patch(p, { nutricao: e.target.value as NutricaoTipo }))}
            >
              <option value="solucao">Solução completa (irrigação nutricional)</option>
              <option value="agua">Somente água (lavagem / pré-molhar)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <CampoListaHorarios
              label="Horários de disparo (vários por dia)"
              valores={p.horarios ?? ["06:30"]}
              onChange={(h) => onChange(patch(p, { horarios: h.length ? h : ["06:30"] }))}
            />
          </div>
        </div>
      );

    case "temporizador":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Torre</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.torreId ?? ""}
              onChange={(e) => onChange(patch(p, { torreId: e.target.value }))}
            >
              <option value="">Selecione…</option>
              {torres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <SeletorDias dias={p.diasSemana ?? []} onChange={(d) => onChange(patch(p, { diasSemana: d }))} />
          <div className="space-y-2">
            <Label className="text-xs">Nutrição</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.nutricao ?? "agua"}
              onChange={(e) => onChange(patch(p, { nutricao: e.target.value as NutricaoTipo }))}
            >
              <option value="agua">Água</option>
              <option value="solucao">Solução</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Janela início</Label>
            <Input className="h-9 font-mono" value={p.janelaInicio ?? "07:00"} onChange={(e) => onChange(patch(p, { janelaInicio: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Janela fim</Label>
            <Input className="h-9 font-mono" value={p.janelaFim ?? "19:00"} onChange={(e) => onChange(patch(p, { janelaFim: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Ligado (min)</Label>
            <Input type="number" min={1} className="h-9" value={p.ligadoMin ?? 3} onChange={(e) => onChange(patch(p, { ligadoMin: Number(e.target.value) }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Desligado (min)</Label>
            <Input type="number" min={0} className="h-9" value={p.desligadoMin ?? 12} onChange={(e) => onChange(patch(p, { desligadoMin: Number(e.target.value) }))} />
          </div>
          <p className="text-[11px] text-muted-foreground sm:col-span-2">
            Na vertical: ideal para névoa, microgotas ou refresh em NFT — fotoperíodo alinhado à janela de luz.
          </p>
        </div>
      );

    case "bloco": {
      const ordem = p.torreIdsOrdem ?? [];
      const move = (idx: number, dir: -1 | 1) => {
        const j = idx + dir;
        if (j < 0 || j >= ordem.length) return;
        const next = [...ordem];
        [next[idx], next[j]] = [next[j], next[idx]];
        onChange(patch(p, { torreIdsOrdem: next }));
      };
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Nome do bloco</Label>
              <Input value={p.nomeBloco ?? ""} onChange={(e) => onChange(patch(p, { nomeBloco: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Duração cada torre (min)</Label>
              <Input type="number" min={1} value={p.duracaoMinPorTorre ?? 10} onChange={(e) => onChange(patch(p, { duracaoMinPorTorre: Number(e.target.value) }))} />
            </div>
          </div>
          <SeletorDias dias={p.diasSemana ?? []} onChange={(d) => onChange(patch(p, { diasSemana: d }))} />
          <CampoListaHorarios
            label="Horários que disparam a fila inteira"
            valores={p.horariosDisparo ?? ["06:00"]}
            onChange={(h) => onChange(patch(p, { horariosDisparo: h.length ? h : ["06:00"] }))}
          />
          <div className="space-y-2">
            <Label className="text-xs">Fila de torres (ordem = mesma bomba / sem sobrepor vazão)</Label>
            <div className="rounded-md border border-border/70 bg-muted/20 p-2 space-y-1">
              {ordem.length === 0 && <p className="text-xs text-muted-foreground">Adicione torres à fila.</p>}
              {ordem.map((tid, idx) => (
                <div key={`${tid}-${idx}`} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-6">{idx + 1}.</span>
                  <span className="flex-1 truncate">{nomeTorre(tid)}</span>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => move(idx, -1)}>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => move(idx, 1)}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive"
                    onClick={() => onChange(patch(p, { torreIdsOrdem: ordem.filter((_, i) => i !== idx) }))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (!v || ordem.includes(v)) return;
                onChange(patch(p, { torreIdsOrdem: [...ordem, v] }));
                e.target.value = "";
              }}
            >
              <option value="">+ Adicionar torre à fila…</option>
              {torres.filter((t) => !ordem.includes(t.id)).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Nutrição na fila</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.nutricao ?? "solucao"}
              onChange={(e) => onChange(patch(p, { nutricao: e.target.value as NutricaoTipo }))}
            >
              <option value="solucao">Solução</option>
              <option value="agua">Água</option>
            </select>
          </div>
        </div>
      );
    }

    case "bloco_sensores":
      return (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Nome do bloco</Label>
              <Input value={p.nomeBloco ?? ""} onChange={(e) => onChange(patch(p, { nomeBloco: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Intervalo mínimo entre execuções (min)</Label>
              <Input type="number" min={0} value={p.intervaloMinEntreExec ?? 45} onChange={(e) => onChange(patch(p, { intervaloMinEntreExec: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">Variável</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={p.sensorVar ?? "dpv"}
                onChange={(e) =>
                  onChange(
                    patch(p, { sensorVar: e.target.value as ProgramacaoVertical["sensorVar"] }),
                  )
                }
              >
                <option value="dpv">DPV (déficit de pressão de vapor)</option>
                <option value="umid_ar">Umidade do ar (%)</option>
                <option value="temp_ar">Temperatura do ar (°C)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Condição</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={p.operador ?? "lt"}
                onChange={(e) => onChange(patch(p, { operador: e.target.value as "lt" | "gt" }))}
              >
                <option value="lt">Menor que</option>
                <option value="gt">Maior que</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Valor alvo</Label>
              <Input type="number" step={0.01} value={p.valorAlvo ?? 0} onChange={(e) => onChange(patch(p, { valorAlvo: Number(e.target.value) }))} />
            </div>
          </div>
          <SeletorDias dias={p.diasSemana ?? []} onChange={(d) => onChange(patch(p, { diasSemana: d }))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Janela opcional início (ou vazio)</Label>
              <Input
                className="h-9 font-mono"
                placeholder="08:00"
                value={p.janelaInicioOpcional ?? ""}
                onChange={(e) => onChange(patch(p, { janelaInicioOpcional: e.target.value || null }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Janela opcional fim</Label>
              <Input
                className="h-9 font-mono"
                placeholder="18:00"
                value={p.janelaFimOpcional ?? ""}
                onChange={(e) => onChange(patch(p, { janelaFimOpcional: e.target.value || null }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Duração por torre na fila (min)</Label>
            <Input type="number" min={1} value={p.duracaoMinPorTorre ?? 8} onChange={(e) => onChange(patch(p, { duracaoMinPorTorre: Number(e.target.value) }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Fila de torres</Label>
            <div className="flex flex-wrap gap-2">
              {torres.map((t) => {
                const list = p.torreIdsOrdem ?? [];
                const on = list.includes(t.id);
                return (
                  <label key={t.id} className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={on}
                      onCheckedChange={(v) => {
                        if (Boolean(v)) onChange(patch(p, { torreIdsOrdem: [...list, t.id] }));
                        else onChange(patch(p, { torreIdsOrdem: list.filter((x) => x !== t.id) }));
                      }}
                    />
                    {t.nome}
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              A ordem segue a ordem de marcação — use “Bloco” com setas se precisar reordenar com precisão.
            </p>
          </div>
        </div>
      );

    case "sensores_inteligentes":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Torre</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.torreId ?? ""}
              onChange={(e) => onChange(patch(p, { torreId: e.target.value }))}
            >
              <option value="">Selecione…</option>
              {torres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Variável</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.sensorVar ?? "umid_ar"}
              onChange={(e) =>
                onChange(patch(p, { sensorVar: e.target.value as ProgramacaoVertical["sensorVar"] }))
              }
            >
              <option value="umid_ar">Umidade do ar</option>
              <option value="dpv">DPV</option>
              <option value="temp_ar">Temperatura do ar</option>
              <option value="ec_solucao">EC da solução (caixa)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Condição</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.operador ?? "lt"}
              onChange={(e) => onChange(patch(p, { operador: e.target.value as "lt" | "gt" }))}
            >
              <option value="lt">Menor que</option>
              <option value="gt">Maior que</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Valor alvo</Label>
            <Input type="number" step={0.1} value={p.valorAlvo ?? 0} onChange={(e) => onChange(patch(p, { valorAlvo: Number(e.target.value) }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Duração acionamento (min)</Label>
            <Input type="number" min={1} value={p.duracaoMin ?? 4} onChange={(e) => onChange(patch(p, { duracaoMin: Number(e.target.value) }))} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Intervalo sem acionar / histerese (min)</Label>
            <Input type="number" min={0} value={p.intervaloSemAcionarMin ?? 25} onChange={(e) => onChange(patch(p, { intervaloSemAcionarMin: Number(e.target.value) }))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="text-xs">Acionamento fixo opcional (HH:mm ou vazio)</Label>
            <Input
              className="h-9 font-mono max-w-[120px]"
              placeholder="—"
              value={p.horarioFallback ?? ""}
              onChange={(e) => onChange(patch(p, { horarioFallback: e.target.value.trim() ? e.target.value : null }))}
            />
          </div>
        </div>
      );

    case "hidro_multicaixa":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Caixa / reservatório</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.caixaAguaId ?? ""}
              onChange={(e) => onChange(patch(p, { caixaAguaId: e.target.value }))}
            >
              <option value="">Selecione…</option>
              {caixasAgua.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <SeletorDias dias={p.diasSemana ?? []} onChange={(d) => onChange(patch(p, { diasSemana: d }))} />
          <CampoListaHorarios label="Horários de ciclo EC / leitura" valores={p.horarios ?? ["05:30"]} onChange={(h) => onChange(patch(p, { horarios: h.length ? h : ["05:30"] }))} />
          <div className="flex items-center gap-2">
            <Switch checked={p.ajustarEc !== false} onCheckedChange={(v) => onChange(patch(p, { ajustarEc: v }))} />
            <Label className="text-xs">Ajustar EC automaticamente nestes horários</Label>
          </div>
          {p.ajustarEc !== false && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs">EC alvo (mS/cm)</Label>
                <Input type="number" step={0.1} value={p.ecAlvo ?? 1.6} onChange={(e) => onChange(patch(p, { ecAlvo: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mistura (min)</Label>
                <Input type="number" min={0} value={p.misturaMin ?? 2} onChange={(e) => onChange(patch(p, { misturaMin: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Limpeza linha (min)</Label>
                <Input type="number" min={0} value={p.limpezaMin ?? 1} onChange={(e) => onChange(patch(p, { limpezaMin: Number(e.target.value) }))} />
              </div>
            </div>
          )}
          {p.ajustarEc === false && (
            <p className="text-[11px] text-muted-foreground">Apenas leitura / relatório de EC nestes horários (como verificação sem dosar).</p>
          )}
        </div>
      );

    case "pos_torre":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs">Após irrigação desta torre (origem)</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.torreOrigemId ?? ""}
              onChange={(e) => onChange(patch(p, { torreOrigemId: e.target.value }))}
            >
              <option value="">Selecione…</option>
              {torres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Ação na torre / circuito extra</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.torreAlvoExtra ?? ""}
              onChange={(e) => onChange(patch(p, { torreAlvoExtra: e.target.value }))}
            >
              <option value="">Selecione…</option>
              {torres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Tipo de ação extra</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.acaoPos ?? "dreno_linha"}
              onChange={(e) => onChange(patch(p, { acaoPos: e.target.value as ProgramacaoVertical["acaoPos"] }))}
            >
              <option value="dreno_linha">Dreno / purga de linha</option>
              <option value="exaustao">Exaustão rápida</option>
              <option value="nebulizacao">Nebulização</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Duração (min)</Label>
            <Input type="number" min={1} value={p.duracaoMin ?? 3} onChange={(e) => onChange(patch(p, { duracaoMin: Number(e.target.value) }))} />
          </div>
        </div>
      );

    case "alarme":
      return (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Torre de referência</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.torreId ?? ""}
              onChange={(e) => onChange(patch(p, { torreId: e.target.value }))}
            >
              <option value="">Selecione…</option>
              {torres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Canais (zona vertical)</Label>
            <div className="flex flex-col gap-2 text-sm">
              {(
                [
                  ["sem_red", "Perda de supervisor / rede"],
                  ["ec_fora", "EC fora da faixa prolongada"],
                  ["vazao_pressao", "Vazão ou pressão anormal"],
                ] as const
              ).map(([k, lab]) => (
                <label key={k} className="flex items-center gap-2">
                  <Checkbox
                    checked={(p.canaisAlarme ?? []).includes(k)}
                    onCheckedChange={(v) => {
                      const cur = new Set(p.canaisAlarme ?? []);
                      if (Boolean(v)) cur.add(k);
                      else cur.delete(k);
                      onChange(patch(p, { canaisAlarme: Array.from(cur) as ProgramacaoVertical["canaisAlarme"] }));
                    }}
                  />
                  {lab}
                </label>
              ))}
            </div>
          </div>
        </div>
      );

    case "desativado":
      return (
        <div className="space-y-2">
          <div className="space-y-2">
            <Label className="text-xs">Torre (porta em stand-by)</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={p.torreId ?? ""}
              onChange={(e) => onChange(patch(p, { torreId: e.target.value }))}
            >
              <option value="">Selecione…</option>
              {torres.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Nota</Label>
            <Input value={p.nota ?? ""} onChange={(e) => onChange(patch(p, { nota: e.target.value }))} placeholder="Motivo da reserva…" />
          </div>
        </div>
      );

    default:
      return null;
  }
}

export function PainelProgramacoesVertical({
  torres,
  caixasAgua,
  programacoes: lista,
  onProgramacoesChange,
  supervisorPausado,
  onToggleSupervisor,
  pushLog,
}: Props) {
  const [filtroTorre, setFiltroTorre] = useState<string>("todas");
  const [expandido, setExpandido] = useState<Record<string, boolean>>({});
  const [novoModo, setNovoModo] = useState<ModoProgramacaoPainel>("semanal");

  const primeiraTorre = torres[0]?.id;
  const primeiraCaixa = caixasAgua[0]?.id;

  const nomeTorre = (id: string) => torres.find((t) => t.id === id)?.nome ?? id;

  const filtrada = useMemo(() => {
    if (filtroTorre === "todas") return lista;
    return lista.filter((p) => {
      if (p.torreId === filtroTorre) return true;
      if (p.torreOrigemId === filtroTorre || p.torreAlvoExtra === filtroTorre) return true;
      if ((p.torreIdsOrdem ?? []).includes(filtroTorre)) return true;
      return false;
    });
  }, [lista, filtroTorre]);

  const setLista = (n: ProgramacaoVertical[]) => onProgramacoesChange(n);

  const atualizar = (id: string, next: ProgramacaoVertical) => {
    setLista(lista.map((x) => (x.id === id ? next : x)));
  };

  const remover = (id: string) => {
    setLista(lista.filter((x) => x.id !== id));
    pushLog("ok", "Programação removida.");
  };

  const duplicar = (p: ProgramacaoVertical) => {
    const clone = JSON.parse(JSON.stringify(p)) as ProgramacaoVertical;
    clone.id = criarProgramacaoVazia("semanal", {}).id;
    clone.nome = `${p.nome} (cópia)`;
    setLista([...lista, clone]);
    pushLog("ok", "Programação duplicada.");
  };

  const adicionar = () => {
    if (!torres.length && novoModo !== "hidro_multicaixa") {
      pushLog("warn", "Cadastre ao menos uma torre para usar este modo.");
      return;
    }
    if (novoModo === "hidro_multicaixa" && !caixasAgua.length) {
      pushLog("warn", "Cadastre uma caixa d'água para programação multicaixa.");
      return;
    }
    const base = criarProgramacaoVazia(novoModo, {
      torreIdPadrao: primeiraTorre,
      primeiraCaixaId: primeiraCaixa,
    });
    setLista([...lista, base]);
    setExpandido((e) => ({ ...e, [base.id]: true }));
    pushLog("ok", `Nova programação: ${ROTULO_MODO_PROGRAMACAO[novoModo]}.`);
  };

  const validarSalvarItem = (p: ProgramacaoVertical) => {
    const err = validarProgramacao(p);
    if (err) {
      pushLog("warn", err);
      return;
    }
    pushLog("ok", `Programação "${p.nome}" validada: ${resumoProgramacao(p, nomeTorre)}`);
  };

  const trocarModoItem = (p: ProgramacaoVertical, modo: ModoProgramacaoPainel) => {
    const nid = p.id;
    const n = criarProgramacaoVazia(modo, { torreIdPadrao: p.torreId ?? primeiraTorre, primeiraCaixaId: p.caixaAguaId ?? primeiraCaixa });
    n.id = nid;
    n.nome = p.nome;
    atualizar(nid, n);
  };

  return (
    <div className="space-y-4">
      <Card className="py-4 gap-3">
        <CardHeader className="px-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-primary" />
            Programações por torre e por modo
          </CardTitle>
          <CardDescription>
            Cada linha é uma programação independente — a mesma torre pode ter várias (ex.: vários horários semanais + um temporizador de névoa). Dados ficam salvos neste navegador por projeto até existir sincronização no servidor.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/25 p-3">
            <div className="space-y-1">
              <p className="text-sm font-semibold">Supervisor operacional</p>
              <p className="text-xs text-muted-foreground">
                Pausado = não dispara execução automática simulada; configurações continuam salvas.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant={supervisorPausado ? "default" : "outline"}
              className="h-9 shrink-0 gap-1.5"
              onClick={onToggleSupervisor}
            >
              {supervisorPausado ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              {supervisorPausado ? "Religar supervisor" : "Pausar supervisor"}
            </Button>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Filtrar por torre</Label>
              <select
                className="flex h-9 min-w-[180px] rounded-md border border-input bg-background px-2 text-sm"
                value={filtroTorre}
                onChange={(e) => setFiltroTorre(e.target.value)}
              >
                <option value="todas">Todas as torres</option>
                {torres.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Novo modo</Label>
              <select
                className="flex h-9 min-w-[220px] rounded-md border border-input bg-background px-2 text-sm"
                value={novoModo}
                onChange={(e) => setNovoModo(e.target.value as ModoProgramacaoPainel)}
              >
                {MODOS.map((m) => (
                  <option key={m} value={m}>
                    {ROTULO_MODO_PROGRAMACAO[m]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="button" size="sm" className="h-9 gap-1" onClick={adicionar} disabled={!torres.length && novoModo !== "hidro_multicaixa"}>
              <Plus className="w-4 h-4" />
              Adicionar programação
            </Button>
          </div>

          {filtrada.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
              {lista.length === 0
                ? "Nenhuma programação. Escolha o modo e clique em “Adicionar programação”."
                : "Nenhuma programação para este filtro."}
            </p>
          )}

          <div className="space-y-2">
            {filtrada.map((p) => {
              const aberto = expandido[p.id] ?? false;
              return (
                <div key={p.id} className="rounded-lg border border-border/70 bg-muted/15 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex flex-wrap items-center justify-between gap-2 p-3 text-left hover:bg-muted/30 transition"
                    onClick={() => setExpandido((e) => ({ ...e, [p.id]: !aberto }))}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm truncate">{p.nome}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {ROTULO_MODO_PROGRAMACAO[p.modo]}
                        </Badge>
                        {!p.ativo && (
                          <Badge variant="secondary" className="text-[10px]">
                            Inativa
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{resumoProgramacao(p, nomeTorre)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">Ativa</span>
                        <Switch
                          checked={p.ativo}
                          onCheckedChange={(v) => atualizar(p.id, patch(p, { ativo: v }))}
                        />
                      </div>
                    </div>
                  </button>
                  {aberto && (
                    <div className="border-t border-border/60 bg-background/80 px-3 pb-3 pt-2 space-y-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Nome</Label>
                          <Input value={p.nome} onChange={(e) => atualizar(p.id, patch(p, { nome: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Modo de programação</Label>
                          <select
                            className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                            value={p.modo}
                            onChange={(e) => trocarModoItem(p, e.target.value as ModoProgramacaoPainel)}
                          >
                            {MODOS.map((m) => (
                              <option key={m} value={m}>
                                {ROTULO_MODO_PROGRAMACAO[m]}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <Separator />
                      <FormPorModo p={p} onChange={(next) => atualizar(p.id, next)} torres={torres} caixasAgua={caixasAgua} />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => validarSalvarItem(p)}>
                          Validar resumo
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => duplicar(p)}>
                          <Copy className="w-3.5 h-3.5" />
                          Duplicar
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => remover(p.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
