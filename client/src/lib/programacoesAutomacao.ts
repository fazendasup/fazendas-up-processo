/**
 * Programações tipo painel multissetor (ex. F16) adaptadas à fazenda vertical.
 * Persistência local até existir API dedicada.
 */

export type ModoProgramacaoPainel =
  | "semanal"
  | "temporizador"
  | "bloco"
  | "bloco_sensores"
  | "sensores_inteligentes"
  | "hidro_multicaixa"
  | "pos_torre"
  | "alarme"
  | "desativado";

export const ROTULO_MODO_PROGRAMACAO: Record<ModoProgramacaoPainel, string> = {
  semanal: "Semanal",
  temporizador: "Temporizador (cíclico)",
  bloco: "Bloco (fila de torres)",
  bloco_sensores: "Bloco por sensores",
  sensores_inteligentes: "Sensores inteligentes (por torre)",
  hidro_multicaixa: "Hidroponia multicaixa",
  pos_torre: "Acionamento pós-torre",
  alarme: "Alarme",
  desativado: "Desativado (reserva)",
};

/** 1 = seg … 7 = dom (padrão BR comum em painéis). */
export const DIAS_SEMANA: { id: number; short: string }[] = [
  { id: 1, short: "Seg" },
  { id: 2, short: "Ter" },
  { id: 3, short: "Qua" },
  { id: 4, short: "Qui" },
  { id: 5, short: "Sex" },
  { id: 6, short: "Sáb" },
  { id: 7, short: "Dom" },
];

export type NutricaoTipo = "agua" | "solucao";

/** Registro único; campos opcionais dependem de `modo`. */
export type ProgramacaoVertical = {
  id: string;
  modo: ModoProgramacaoPainel;
  ativo: boolean;
  nome: string;
  /** Modos centrados numa torre */
  torreId?: string;
  /** Semanal / multicaixa: vários disparos por dia */
  diasSemana?: number[];
  horarios?: string[];
  duracaoMin?: number;
  nutricao?: NutricaoTipo;
  /** Temporizador */
  janelaInicio?: string;
  janelaFim?: string;
  ligadoMin?: number;
  desligadoMin?: number;
  /** Bloco / bloco sensores */
  nomeBloco?: string;
  horariosDisparo?: string[];
  torreIdsOrdem?: string[];
  duracaoMinPorTorre?: number;
  /** Sensores */
  sensorVar?: "umid_ar" | "dpv" | "temp_ar" | "ec_solucao";
  operador?: "lt" | "gt";
  valorAlvo?: number;
  intervaloSemAcionarMin?: number;
  intervaloMinEntreExec?: number;
  horarioFallback?: string | null;
  janelaInicioOpcional?: string | null;
  janelaFimOpcional?: string | null;
  /** Multicaixa */
  caixaAguaId?: string;
  ajustarEc?: boolean;
  ecAlvo?: number;
  misturaMin?: number;
  limpezaMin?: number;
  /** Pós-torre */
  torreOrigemId?: string;
  torreAlvoExtra?: string;
  acaoPos?: "dreno_linha" | "exaustao" | "nebulizacao";
  /** Alarme */
  canaisAlarme?: ("sem_red" | "ec_fora" | "vazao_pressao")[];
  nota?: string;
};

export function novoId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `pv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function criarProgramacaoVazia(
  modo: ModoProgramacaoPainel,
  opts: { torreIdPadrao?: string; primeiraCaixaId?: string },
): ProgramacaoVertical {
  const tid = opts.torreIdPadrao ?? "";
  const base = { id: novoId(), modo, ativo: true, nome: ROTULO_MODO_PROGRAMACAO[modo] };

  switch (modo) {
    case "semanal":
      return {
        ...base,
        torreId: tid,
        diasSemana: [1, 2, 3, 4, 5],
        horarios: ["06:30"],
        duracaoMin: 12,
        nutricao: "solucao",
      };
    case "temporizador":
      return {
        ...base,
        torreId: tid,
        diasSemana: [1, 2, 3, 4, 5, 6, 7],
        janelaInicio: "07:00",
        janelaFim: "19:00",
        ligadoMin: 3,
        desligadoMin: 12,
        nutricao: "agua",
      };
    case "bloco":
      return {
        ...base,
        nomeBloco: "Bloco manhã",
        diasSemana: [1, 3, 5],
        horariosDisparo: ["06:00"],
        torreIdsOrdem: tid ? [tid] : [],
        duracaoMinPorTorre: 10,
        nutricao: "solucao",
      };
    case "bloco_sensores":
      return {
        ...base,
        nomeBloco: "DPV baixo — fila",
        sensorVar: "dpv",
        operador: "lt",
        valorAlvo: 0.45,
        diasSemana: [1, 2, 3, 4, 5, 6, 7],
        janelaInicioOpcional: "08:00",
        janelaFimOpcional: "18:00",
        intervaloMinEntreExec: 45,
        torreIdsOrdem: tid ? [tid] : [],
        duracaoMinPorTorre: 8,
      };
    case "sensores_inteligentes":
      return {
        ...base,
        torreId: tid,
        sensorVar: "umid_ar",
        operador: "lt",
        valorAlvo: 55,
        duracaoMin: 4,
        intervaloSemAcionarMin: 25,
        horarioFallback: null,
      };
    case "hidro_multicaixa":
      return {
        ...base,
        caixaAguaId: opts.primeiraCaixaId ?? "",
        diasSemana: [1, 2, 3, 4, 5, 6, 7],
        horarios: ["05:30", "17:30"],
        ajustarEc: true,
        ecAlvo: 1.6,
        misturaMin: 2,
        limpezaMin: 1,
      };
    case "pos_torre":
      return {
        ...base,
        torreOrigemId: tid,
        torreAlvoExtra: tid,
        acaoPos: "dreno_linha",
        duracaoMin: 3,
      };
    case "alarme":
      return {
        ...base,
        torreId: tid,
        canaisAlarme: ["sem_red"],
      };
    case "desativado":
      return {
        ...base,
        torreId: tid,
        nota: "Reservado — sem execução automática.",
      };
    default: {
      const _x: never = modo;
      return { ...base, torreId: tid, nota: String(_x) };
    }
  }
}

export function resumoProgramacao(p: ProgramacaoVertical, nomeTorre: (id: string) => string): string {
  switch (p.modo) {
    case "semanal": {
      const ds = (p.diasSemana ?? []).map((d) => DIAS_SEMANA.find((x) => x.id === d)?.short ?? d).join(", ");
      const hs = (p.horarios ?? []).join(", ");
      return `${nomeTorre(p.torreId ?? "")} · ${ds} às ${hs} · ${p.duracaoMin ?? 0} min · ${p.nutricao === "solucao" ? "solução" : "água"}`;
    }
    case "temporizador":
      return `${nomeTorre(p.torreId ?? "")} · ${p.janelaInicio}–${p.janelaFim} · ON ${p.ligadoMin}m / OFF ${p.desligadoMin}m`;
    case "bloco": {
      const ord = (p.torreIdsOrdem ?? []).map(nomeTorre).join(" → ");
      const hs = (p.horariosDisparo ?? []).join(", ");
      return `${p.nomeBloco ?? "Bloco"} · ${hs} · fila: ${ord || "—"}`;
    }
    case "bloco_sensores":
      return `${p.nomeBloco ?? "Bloco"} · sensor ${p.sensorVar} ${p.operador === "lt" ? "<" : ">"} ${p.valorAlvo}`;
    case "sensores_inteligentes":
      return `${nomeTorre(p.torreId ?? "")} · ${p.sensorVar} ${p.operador === "lt" ? "<" : ">"} ${p.valorAlvo} · ${p.duracaoMin} min`;
    case "hidro_multicaixa":
      return `${p.ajustarEc ? `EC→${p.ecAlvo}` : "só leitura"} · ${(p.horarios ?? []).join(", ")}`;
    case "pos_torre":
      return `Após ${nomeTorre(p.torreOrigemId ?? "")} · ${p.acaoPos} · ${p.duracaoMin} min`;
    case "alarme":
      return `${nomeTorre(p.torreId ?? "")} · ${(p.canaisAlarme ?? []).join(", ")}`;
    case "desativado":
      return nomeTorre(p.torreId ?? "") + " · desativado";
    default:
      return p.nome;
  }
}

export function storageKeyProgramacoes(projetoId: number | null): string {
  return `fazendas-up:programacoes-v2:${projetoId ?? "sem-projeto"}`;
}

export function carregarProgramacoes(projetoId: number | null): ProgramacaoVertical[] {
  try {
    const raw = localStorage.getItem(storageKeyProgramacoes(projetoId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x === "object" && typeof (x as ProgramacaoVertical).id === "string") as ProgramacaoVertical[];
  } catch {
    return [];
  }
}

export function salvarProgramacoes(projetoId: number | null, lista: ProgramacaoVertical[]): void {
  try {
    localStorage.setItem(storageKeyProgramacoes(projetoId), JSON.stringify(lista));
  } catch {
    /* ignore quota */
  }
}

/** Horário HH:mm */
export function parseHorario(v: string): boolean {
  return /^\d{2}:\d{2}$/.test(v.trim());
}

export function validarProgramacao(p: ProgramacaoVertical): string | null {
  switch (p.modo) {
    case "semanal":
      if (!p.torreId) return "Selecione a torre.";
      if (!(p.diasSemana && p.diasSemana.length)) return "Marque pelo menos um dia da semana.";
      if (!(p.horarios && p.horarios.length)) return "Informe pelo menos um horário.";
      if (!(p.horarios ?? []).every(parseHorario)) return "Horários devem estar no formato HH:mm.";
      if (!(p.duracaoMin && p.duracaoMin >= 1)) return "Duração inválida.";
      return null;
    case "temporizador":
      if (!p.torreId) return "Selecione a torre.";
      if (!(p.diasSemana && p.diasSemana.length)) return "Marque pelo menos um dia da semana.";
      if (!parseHorario(p.janelaInicio ?? "") || !parseHorario(p.janelaFim ?? "")) return "Janela horária inválida (use HH:mm).";
      if (!(p.ligadoMin && p.ligadoMin >= 1) || !(p.desligadoMin && p.desligadoMin >= 0)) return "Tempos de ciclo inválidos.";
      return null;
    case "bloco":
      if (!(p.horariosDisparo && p.horariosDisparo.length)) return "Informe ao menos um horário de disparo.";
      if (!(p.horariosDisparo ?? []).every(parseHorario)) return "Horários de disparo devem ser HH:mm.";
      if (!(p.torreIdsOrdem && p.torreIdsOrdem.length)) return "Monte a fila com pelo menos uma torre.";
      if (!(p.duracaoMinPorTorre && p.duracaoMinPorTorre >= 1)) return "Duração por torre inválida.";
      if (!(p.diasSemana && p.diasSemana.length)) return "Marque os dias da semana.";
      return null;
    case "bloco_sensores":
      if (!(p.torreIdsOrdem && p.torreIdsOrdem.length)) return "Inclua torres na fila.";
      if (p.valorAlvo === undefined || p.valorAlvo === null) return "Defina o valor alvo do sensor.";
      if (!(p.intervaloMinEntreExec && p.intervaloMinEntreExec >= 0)) return "Intervalo mínimo inválido.";
      if (!(p.duracaoMinPorTorre && p.duracaoMinPorTorre >= 1)) return "Duração por torre inválida.";
      return null;
    case "sensores_inteligentes":
      if (!p.torreId) return "Selecione a torre.";
      if (p.valorAlvo === undefined) return "Defina o valor alvo.";
      if (!(p.duracaoMin && p.duracaoMin >= 1)) return "Duração inválida.";
      if (!(p.intervaloSemAcionarMin !== undefined && p.intervaloSemAcionarMin >= 0)) return "Intervalo sem acionar inválido.";
      return null;
    case "hidro_multicaixa":
      if (!p.caixaAguaId) return "Selecione a caixa d'água / reservatório.";
      if (!(p.diasSemana && p.diasSemana.length)) return "Marque os dias.";
      if (!(p.horarios && p.horarios.length)) return "Informe horários.";
      if (!(p.horarios ?? []).every(parseHorario)) return "Horários HH:mm.";
      if (p.ajustarEc && (p.ecAlvo === undefined || p.ecAlvo < 0)) return "EC alvo inválido.";
      return null;
    case "pos_torre":
      if (!p.torreOrigemId || !p.torreAlvoExtra) return "Defina torre origem e torre/alvo da ação extra.";
      if (!(p.duracaoMin && p.duracaoMin >= 1)) return "Duração inválida.";
      return null;
    case "alarme":
      if (!p.torreId) return "Selecione a torre de referência.";
      if (!(p.canaisAlarme && p.canaisAlarme.length)) return "Escolha ao menos um canal de alarme.";
      return null;
    case "desativado":
      if (!p.torreId) return "Selecione a torre.";
      return null;
    default:
      return "Modo desconhecido.";
  }
}
