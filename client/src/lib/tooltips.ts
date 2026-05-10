export const TOOLTIPS = {
  TAREFAS: {
    ciclo: {
      titulo: "Ciclo (Aplicação)",
      descricao: "Aplicar um produto seguindo a rotina (diário/semanal/intervalo).",
      dicas: [
        "Evite registrar duas vezes no mesmo dia.",
        "Se precisar repetir, registre observação do motivo.",
      ],
    },
    medicao: {
      titulo: "Medição (EC/pH)",
      descricao: "Registrar medições da água para manter a receita dentro do ideal.",
      dicas: ["Medir pelo menos a cada 2 dias.", "Usar equipamento calibrado."],
    },
    colheita: {
      titulo: "Colheita",
      descricao: "Colher perfis prontos para venda/uso.",
      dicas: ["Não atrasar: qualidade pode cair com o tempo."],
    },
    manutencao: {
      titulo: "Manutenção",
      descricao: "Registrar execução de manutenção preventiva/corretiva.",
      dicas: ["Manutenções vencidas viram alerta prioritário."],
    },
    lavagem: {
      titulo: "Lavagem",
      descricao: "Lavagem do andar/perfis após colheita total para liberar novo ciclo.",
      dicas: ["Faça antes de receber novo plantio."],
    },
    transplantio: {
      titulo: "Transplantio",
      descricao:
        "Mover perfis para a próxima fase. No geral: mudas → vegetativa → maturação. Algumas variedades (ex.: manjericão, Baby Leaf / Beterraba) vão direto de mudas para maturação.",
      dicas: ["Confirme perfis prontos (dias concluídos)."],
    },
  } as const,
  PRIORIDADE: {
    urgente: "Precisa ser feito agora (risco de perder produção/qualidade).",
    alta: "Priorizar hoje.",
    media: "Fazer assim que possível.",
    baixa: "Pode aguardar.",
  } as const,
  STATUS_ALERTA: {
    novo: "O motor detectou agora. Clique para marcar como lido e ver detalhes.",
    lido: "Já foi visto, mas ainda não resolvido.",
    em_andamento: "Já começou a ser tratado.",
    resolvido: "Condição resolvida.",
    ignorado: "Ignorado com justificativa.",
  } as const,
};

