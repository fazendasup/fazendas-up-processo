import { useCallback, useEffect, useState } from "react";
import Joyride, { type CallBackProps, STATUS, type Step } from "react-joyride";

const STEPS: Step[] = [
  {
    target: '[data-tour="dash-toolbar"]',
    content:
      "Aqui você filtra o período (hoje, semana ou mês), busca clientes e força sincronização com a Conta Azul.",
    disableBeacon: true,
  },
  {
    target: '[data-tour="dash-kpis"]',
    content: "KPIs principais: faturamento, ticket médio e clientes ativos — dados vindos dos pedidos sincronizados.",
  },
  {
    target: '[data-tour="dash-oportunidades"]',
    content: "Oportunidades abertas e potencial estimado. Use os atalhos para ir à lista ou gerar ações.",
  },
  {
    target: '[data-tour="dash-alertas"]',
    content: "Alertas: clientes em risco e mensagens aguardando aprovação no ManyChat. Aja com um clique.",
  },
  {
    target: '[data-tour="nav-carteira"]',
    content: "Na Carteira você analisa cada cliente em 360º. Explore filtros e scores.",
  },
];

const STORAGE_KEY = "fu_tour_dashboard_v2";

export function useDashboardTour() {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    const t = window.setTimeout(() => setRun(true), 600);
    return () => window.clearTimeout(t);
  }, []);

  const handleJoyride = useCallback((data: CallBackProps) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRun(false);
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, "1");
    }
  }, []);

  const Tour = (
    <Joyride
      steps={STEPS}
      run={run}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      disableScrolling={false}
      styles={{
        options: {
          primaryColor: "#10B981",
          textColor: "#111827",
          zIndex: 10000,
        },
        tooltip: { borderRadius: 8 },
        buttonNext: { backgroundColor: "#10B981" },
        buttonBack: { color: "#1E40AF" },
      }}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Concluir",
        next: "Próximo",
        skip: "Pular tour",
      }}
      callback={handleJoyride}
    />
  );

  return { Tour, startTour: () => setRun(true) };
}
