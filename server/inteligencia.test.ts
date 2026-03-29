import { describe, it, expect } from "vitest";
import { executarMotorInteligencia, type FazendaSnapshot, type AlertCandidate } from "./intelligence-engine";

// ---- Helper: base snapshot vazio ----
function emptySnapshot(): FazendaSnapshot {
  return {
    torres: [],
    andares: [],
    perfis: [],
    furos: [],
    variedades: [],
    caixasAgua: [],
    medicoesCaixa: [],
    aplicacoesCaixa: [],
    aplicacoesAndar: [],
    germinacao: [],
    transplantios: [],
    manutencoes: [],
    ciclos: [],
    tarefas: [],
    fasesConfig: [],
    receitas: [],
    registrosColheita: [],
    planosPlantio: [],
  };
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

describe("Motor de Inteligência Acionável", () => {
  it("retorna array vazio quando não há dados", () => {
    const resultado = executarMotorInteligencia(emptySnapshot());
    expect(resultado).toEqual([]);
  });

  describe("Regra 1: Risco de Atraso", () => {
    it("detecta perfil com transplantio atrasado", () => {
      const snap = emptySnapshot();
      snap.variedades = [{ id: 1, nome: "Alface Crespa", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 }];
      snap.torres = [{ id: 1, nome: "Torre Mudas 1", fase: "mudas" }];
      snap.andares = [{ id: 1, torreId: 1, numero: 1, dataEntrada: null }];
      // Perfil com data de entrada 20 dias atrás (14 dias de mudas → 6 dias atrasado)
      snap.perfis = [{
        id: 1, andarId: 1, perfilIndex: 0, ativo: true,
        variedadeId: 1, dataEntrada: daysAgo(20).toISOString(),
      }];

      const alertas = executarMotorInteligencia(snap);
      const atraso = alertas.filter(a => a.tipo === "risco_atraso");
      expect(atraso.length).toBeGreaterThanOrEqual(1);
      expect(atraso[0].titulo).toContain("Atraso de transplantio");
      expect(atraso[0].severidade).toBe("alta"); // 6 dias >= 3
      expect(atraso[0].gerarTarefa).toBe(true);
    });

    it("não gera alerta quando perfil está dentro do prazo", () => {
      const snap = emptySnapshot();
      snap.variedades = [{ id: 1, nome: "Alface Crespa", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 }];
      snap.torres = [{ id: 1, nome: "Torre Mudas 1", fase: "mudas" }];
      snap.andares = [{ id: 1, torreId: 1, numero: 1, dataEntrada: null }];
      snap.perfis = [{
        id: 1, andarId: 1, perfilIndex: 0, ativo: true,
        variedadeId: 1, dataEntrada: daysAgo(5).toISOString(), // 5 dias < 14 dias mudas
      }];

      const alertas = executarMotorInteligencia(snap);
      const atraso = alertas.filter(a => a.tipo === "risco_atraso" && a.entidadeTipo === "andar");
      expect(atraso.length).toBe(0);
    });

    it("detecta manutenção com prazo vencido", () => {
      const snap = emptySnapshot();
      snap.torres = [{ id: 1, nome: "Torre Mudas 1", fase: "mudas" }];
      snap.manutencoes = [{
        id: 1, torreId: 1, tipo: "Vazamento", descricao: "Tubo furado",
        status: "aberta", prazo: daysAgo(5).toISOString(),
      }];

      const alertas = executarMotorInteligencia(snap);
      const manut = alertas.filter(a => a.tipo === "risco_atraso" && a.entidadeTipo === "manutencao");
      expect(manut.length).toBe(1);
      expect(manut[0].titulo).toContain("Manutenção atrasada");
    });

    it("detecta ciclo não executado", () => {
      const snap = emptySnapshot();
      snap.ciclos = [{
        id: 1, nome: "Nutrição A", produto: "Solução A", ativo: true,
        frequencia: "diario", intervaloDias: null,
        ultimaExecucao: daysAgo(4).toISOString(), // 4 dias sem executar (tolerância 1 dia)
        fasesAplicaveis: ["mudas"],
      }];

      const alertas = executarMotorInteligencia(snap);
      const ciclo = alertas.filter(a => a.tipo === "risco_atraso" && a.entidadeTipo === "ciclo");
      expect(ciclo.length).toBe(1);
      expect(ciclo[0].titulo).toContain("Ciclo atrasado");
    });
  });

  describe("Regra 2: Torre Subutilizada", () => {
    it("detecta torre com ocupação abaixo de 30%", () => {
      const snap = emptySnapshot();
      snap.torres = [{ id: 1, nome: "Torre Mudas 1", fase: "mudas" }];
      snap.andares = [{ id: 1, torreId: 1, numero: 1 }];
      // 10 perfis, apenas 2 ativos = 20%
      snap.perfis = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1, andarId: 1, perfilIndex: i, ativo: i < 2, variedadeId: i < 2 ? 1 : null,
      }));

      const alertas = executarMotorInteligencia(snap);
      const sub = alertas.filter(a => a.tipo === "torre_subutilizada");
      expect(sub.length).toBe(1);
      expect(sub[0].titulo).toContain("20%");
      expect(sub[0].gerarTarefa).toBe(false);
    });

    it("não gera alerta quando torre está acima de 30%", () => {
      const snap = emptySnapshot();
      snap.torres = [{ id: 1, nome: "Torre Mudas 1", fase: "mudas" }];
      snap.andares = [{ id: 1, torreId: 1, numero: 1 }];
      // 10 perfis, 5 ativos = 50%
      snap.perfis = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1, andarId: 1, perfilIndex: i, ativo: i < 5, variedadeId: i < 5 ? 1 : null,
      }));

      const alertas = executarMotorInteligencia(snap);
      const sub = alertas.filter(a => a.tipo === "torre_subutilizada");
      expect(sub.length).toBe(0);
    });
  });

  describe("Regra 3: Lote Fora do Padrão", () => {
    it("detecta germinação com taxa abaixo de 70%", () => {
      const snap = emptySnapshot();
      snap.germinacao = [{
        id: 1, variedadeNome: "Rúcula", quantidade: 100,
        germinadas: 40, naoGerminadas: 60, status: "germinando",
      }];

      const alertas = executarMotorInteligencia(snap);
      const lote = alertas.filter(a => a.tipo === "lote_fora_padrao");
      expect(lote.length).toBe(1);
      expect(lote[0].titulo).toContain("40%");
    });
  });

  describe("Regra 4: Manutenção Crítica", () => {
    it("detecta manutenção crítica aberta (tipo crítico)", () => {
      const snap = emptySnapshot();
      snap.torres = [{ id: 1, nome: "Torre Mudas 1", fase: "mudas" }];
      snap.manutencoes = [{
        id: 1, torreId: 1, tipo: "Vazamento Tubo Injetor", descricao: "Tubo furado",
        status: "aberta", prazo: null, dataAbertura: daysAgo(2).toISOString(),
      }];

      const alertas = executarMotorInteligencia(snap);
      const manut = alertas.filter(a => a.tipo === "manutencao_critica");
      expect(manut.length).toBe(1);
      expect(manut[0].severidade).toBe("critica");
      expect(manut[0].gerarTarefa).toBe(true);
    });

    it("detecta manutenção aberta há mais de 5 dias (não crítica)", () => {
      const snap = emptySnapshot();
      snap.torres = [{ id: 1, nome: "Torre Mudas 1", fase: "mudas" }];
      snap.manutencoes = [{
        id: 1, torreId: 1, tipo: "Ajuste Geral", descricao: "Ajuste",
        status: "aberta", prazo: daysAgo(1).toISOString(), dataAbertura: daysAgo(7).toISOString(),
      }];

      const alertas = executarMotorInteligencia(snap);
      const manut = alertas.filter(a => a.tipo === "manutencao_critica");
      expect(manut.length).toBe(1);
      expect(manut[0].severidade).toBe("alta");
    });
  });

  describe("Regra 5: Capacidade Disponível", () => {
    it("detecta fase com mais de 50% de perfis livres", () => {
      const snap = emptySnapshot();
      snap.torres = [{ id: 1, nome: "Torre Mudas 1", fase: "mudas" }];
      snap.andares = [
        { id: 1, torreId: 1, numero: 1 },
        { id: 2, torreId: 1, numero: 2 },
      ];
      // 10 perfis, apenas 2 ativos = 80% livre (>50%)
      snap.perfis = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1, andarId: i < 5 ? 1 : 2, perfilIndex: i % 5,
        ativo: i < 2, variedadeId: i < 2 ? 1 : null,
      }));
      snap.germinacao = [{
        id: 1, variedadeNome: "Rúcula", quantidade: 50,
        germinadas: 40, naoGerminadas: 5, status: "pronto",
      }];

      const alertas = executarMotorInteligencia(snap);
      const cap = alertas.filter(a => a.tipo === "capacidade_disponivel");
      expect(cap.length).toBe(1);
      expect(cap[0].titulo).toContain("mudas");
    });
  });

  describe("Regra 9: Desvio EC/pH", () => {
    it("detecta medição de EC fora da faixa", () => {
      const snap = emptySnapshot();
      snap.torres = [{ id: 1, nome: "Torre Mudas 1", fase: "mudas" }];
      snap.caixasAgua = [{ id: 1, torreId: 1, nome: "Caixa 1", fase: "mudas" }];
      snap.fasesConfig = [{ fase: "mudas", ecMin: 1.0, ecMax: 1.2, phMin: 5.8, phMax: 6.2 }];
      snap.medicoesCaixa = [{
        id: 1, caixaAguaId: 1, ec: 2.5, ph: 6.0,
        dataHora: new Date().toISOString(),
      }];

      const alertas = executarMotorInteligencia(snap);
      const desvio = alertas.filter(a => a.tipo === "desvio_ec_ph");
      expect(desvio.length).toBeGreaterThanOrEqual(1);
      expect(desvio[0].titulo).toContain("Caixa 1");
    });
  });

  describe("Propriedades dos alertas", () => {
    it("todos os alertas têm hashUnico único", () => {
      const snap = emptySnapshot();
      snap.variedades = [{ id: 1, nome: "Alface", diasMudas: 14, diasVegetativa: 21, diasMaturacao: 28 }];
      snap.torres = [{ id: 1, nome: "Torre 1", fase: "mudas" }];
      snap.andares = [{ id: 1, torreId: 1, numero: 1 }];
      snap.perfis = [
        { id: 1, andarId: 1, perfilIndex: 0, ativo: true, variedadeId: 1, dataEntrada: daysAgo(20).toISOString() },
        { id: 2, andarId: 1, perfilIndex: 1, ativo: true, variedadeId: 1, dataEntrada: daysAgo(25).toISOString() },
      ];

      const alertas = executarMotorInteligencia(snap);
      const hashes = alertas.map(a => a.hashUnico);
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(hashes.length);
    });

    it("todos os alertas têm campos obrigatórios", () => {
      const snap = emptySnapshot();
      snap.torres = [{ id: 1, nome: "Torre 1", fase: "mudas" }];
      snap.manutencoes = [{
        id: 1, torreId: 1, tipo: "Bomba", descricao: "Teste",
        status: "aberta", prazo: daysAgo(5).toISOString(), criadoEm: daysAgo(10).toISOString(),
      }];

      const alertas = executarMotorInteligencia(snap);
      for (const alerta of alertas) {
        expect(alerta.tipo).toBeTruthy();
        expect(alerta.severidade).toMatch(/^(baixa|media|alta|critica)$/);
        expect(alerta.prioridade).toMatch(/^(baixa|media|alta|urgente)$/);
        expect(alerta.titulo).toBeTruthy();
        expect(alerta.descricao).toBeTruthy();
        expect(alerta.sugestaoAcao).toBeTruthy();
        expect(alerta.nivelConfianca).toMatch(/^(alta|media|baixa)$/);
        expect(typeof alerta.gerarTarefa).toBe("boolean");
        expect(alerta.hashUnico).toBeTruthy();
        expect(alerta.origem).toBe("motor_regras");
      }
    });
  });
});
