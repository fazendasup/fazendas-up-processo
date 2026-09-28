import { useState, type ReactNode } from "react";
import { Ban, BookOpen, Clock, Droplet, FlaskConical, Layers, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  DIAS_DA_FASE,
  dosesDaVariante,
  faseDoProtocolo,
  protocoloFases14d as protocolo,
  rotulosNoDia,
  type FaseProtocoloId,
  type VarianteTanque,
} from "@/data/cicloFases14d";

const FASES: FaseProtocoloId[] = ["mudas", "vegetativa", "maturacao"];

/**
 * Consulta do protocolo preventivo. O operador tira dúvida aqui;
 * doses e janelas vêm do JSON, sem campo para alterar a dose.
 */
export default function ProtocoloFases14d() {
  const [aberto, setAberto] = useState(false);
  const [tanque, setTanque] = useState<VarianteTanque>("500");
  const [faseId, setFaseId] = useState<FaseProtocoloId>("mudas");
  const doses = dosesDaVariante(tanque);
  const fase = faseDoProtocolo(faseId);

  return (
    <section className="mb-8 rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-display font-bold">
          <BookOpen className="h-4 w-4 text-primary" />
          Protocolo das fases
        </span>
        <span className="text-xs text-muted-foreground">{aberto ? "Fechar" : "Consultar"}</span>
      </button>

      {aberto && (
        <div className="space-y-4 border-t px-4 py-4">
          <p className="text-sm text-muted-foreground">
            {protocolo.cultura}. {protocolo.sistema}, tanques de 310 L e 500 L. Ciclo de {protocolo.cicloPlantaDias} dias,
            três fases de {protocolo.faseDias}. {protocolo.sistemico}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {(["310", "500"] as VarianteTanque[]).map((id) => (
              <Button key={id} type="button" size="sm" variant={tanque === id ? "default" : "outline"} onClick={() => setTanque(id)}>
                {id} L
              </Button>
            ))}
            <span className="mx-1 hidden h-4 w-px bg-border sm:inline" />
            {protocolo.pdfs.map((pdf) => (
              <a
                key={pdf.arquivo}
                href={`/protocolos/${pdf.arquivo}`}
                download={pdf.arquivo}
                className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              >
                {pdf.rotulo}
              </a>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DoseCard icon={<Droplet className="h-3.5 w-3.5" />} nome="H₂O₂" valor={doses.h2o2} nota={protocolo.h2o2.rotina} />
            <DoseCard icon={<FlaskConical className="h-3.5 w-3.5" />} nome="Infinito" valor={doses.infinito} nota="Máx. 1 por fase" />
            <DoseCard icon={<FlaskConical className="h-3.5 w-3.5" />} nome="Cercobin" valor={doses.cercobin} nota="Máx. 1 por fase" />
            <DoseCard icon={<Layers className="h-3.5 w-3.5" />} nome="Bio" valor={doses.bio} nota={protocolo.bioNota} />
          </div>
          <p className="text-xs text-muted-foreground">
            KOH estoque: {protocolo.koh.estoque}. {protocolo.koh.rotina} {protocolo.koh.aviso}
          </p>

          <div className="flex flex-wrap gap-2">
            {FASES.map((id) => (
              <Button key={id} type="button" size="sm" variant={faseId === id ? "default" : "outline"} onClick={() => setFaseId(id)}>
                {faseDoProtocolo(id).label}
              </Button>
            ))}
          </div>

          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            {fase.callout}
          </div>
          <p className="text-xs text-muted-foreground">{fase.label} · {fase.idade} · dias 0 a 13 nesta fase</p>

          <div className="grid grid-cols-7 gap-1">
            {DIAS_DA_FASE.map((dia) => {
              const rotulos = rotulosNoDia(faseId, dia);
              const bloqueio = rotulos.some((r) => r.startsWith("Sem sistêmico"));
              return (
                <div
                  key={dia}
                  title={rotulos.join(" · ") || "KOH"}
                  className={`rounded-md border px-1 py-1.5 text-center text-[10px] leading-tight ${
                    bloqueio
                      ? "border-amber-500/50 bg-amber-500/10"
                      : rotulos.length > 0
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-muted/40"
                  }`}
                >
                  <span className="font-semibold tabular-nums">D{dia}</span>
                  {rotulos.length > 0 && <span className="mt-0.5 block truncate">{rotulos[0]}</span>}
                </div>
              );
            })}
          </div>

          <ul className="space-y-1 text-sm">
            {fase.agenda.map((item) => (
              <li key={item} className="flex gap-2">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium">
            <Ban className="h-4 w-4 shrink-0" />
            {protocolo.pare}
          </p>

          <Accordion type="multiple" className="rounded-lg border px-3">
            <AccordionItem value="checklist">
              <AccordionTrigger>Antes de aplicar H₂O₂, Infinito ou Cercobin</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-1 text-sm">
                  {protocolo.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  <li className="text-muted-foreground">{protocolo.koh.esperaMinutos}.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="bloqueios">
              <AccordionTrigger>Quando não aplicar</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {protocolo.bloqueios.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="nao">
              <AccordionTrigger>Não faça</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {protocolo.naoFaca.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="compat">
              <AccordionTrigger>O que pode no mesmo dia</AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="py-1 pr-2 font-medium">Par</th>
                        <th className="py-1 pr-2 font-medium">Mesmo dia</th>
                        <th className="py-1 font-medium">Regra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {protocolo.compatibilidade.map((linha) => (
                        <tr key={linha.par} className="border-t">
                          <td className="py-1.5 pr-2">{linha.par}</td>
                          <td className="py-1.5 pr-2">{linha.mesmoDia}</td>
                          <td className="py-1.5">{linha.regra}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="encher">
              <AccordionTrigger>Encher ou repor a caixa</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal space-y-1 pl-4 text-sm">
                  {protocolo.fluxoEncherCaixa.map((passo) => (
                    <li key={passo}>{passo}</li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pythium">
              <AccordionTrigger>{protocolo.resgatePythium.titulo}</AccordionTrigger>
              <AccordionContent>
                <p className="mb-2 text-sm">{protocolo.resgatePythium.resumo}</p>
                <p className="text-sm">{protocolo.resgatePythium.passos.join(" → ")}</p>
                <p className="mt-2 flex items-start gap-2 text-sm">
                  <Thermometer className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {protocolo.resgatePythium.aviso}
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </section>
  );
}

function DoseCard({ icon, nome, valor, nota }: { icon: ReactNode; nome: string; valor: string; nota: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {nome}
      </p>
      <p className="font-display text-lg font-bold leading-tight">{valor}</p>
      <p className="text-[10px] text-muted-foreground">{nota}</p>
    </div>
  );
}
