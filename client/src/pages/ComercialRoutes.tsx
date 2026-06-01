import { lazy, Suspense } from "react";
import { Redirect, Route, Switch, useLocation } from "wouter";
import { ComercialLayout } from "@/components/comercial/ComercialLayout";
import { RoutePageFallback } from "@/components/RoutePageFallback";
import { trpc } from "@/lib/trpc";
import { canAccessCommercialPath, homeForCommercialPerfil } from "@/lib/accessPolicy";

const Dashboard = lazy(() =>
  import("./comercial/Dashboard").then(m => ({ default: m.Dashboard }))
);
const Clientes = lazy(() =>
  import("./comercial/Clientes").then(m => ({ default: m.Clientes }))
);
const Cliente360 = lazy(() =>
  import("./comercial/Cliente360").then(m => ({ default: m.Cliente360 }))
);
const Oportunidades = lazy(() =>
  import("./comercial/Oportunidades").then(m => ({ default: m.Oportunidades }))
);
const Mensagens = lazy(() =>
  import("./comercial/Mensagens").then(m => ({ default: m.Mensagens }))
);
const Kpis = lazy(() =>
  import("./comercial/Kpis").then(m => ({ default: m.Kpis }))
);
const Relatorios = lazy(() =>
  import("./comercial/Relatorios").then(m => ({ default: m.Relatorios }))
);
const AcompanhamentoAvarias = lazy(() =>
  import("./comercial/VarejoSupermercado").then(m => ({
    default: m.AcompanhamentoAvarias,
  }))
);
const Pedidos = lazy(() =>
  import("./comercial/Pedidos").then(m => ({ default: m.Pedidos }))
);
const PedidosHistorico = lazy(() =>
  import("./comercial/PedidosHistorico").then(m => ({
    default: m.PedidosHistorico,
  }))
);
const Execucoes = lazy(() =>
  import("./comercial/Execucoes").then(m => ({ default: m.Execucoes }))
);
const Configuracoes = lazy(() =>
  import("./comercial/Configuracoes").then(m => ({ default: m.Configuracoes }))
);

export default function ComercialRoutes() {
  const [location] = useLocation();
  const me = trpc.comercial.pedidos.me.useQuery(undefined, { staleTime: 60_000 });
  if (!me.data) return <RoutePageFallback />;
  if (location === "/comercial" || location === "/comercial/") {
    return <Redirect to={homeForCommercialPerfil(me.data.perfil)} />;
  }
  if (!canAccessCommercialPath(location, me.data.perfil)) {
    return <Redirect to={homeForCommercialPerfil(me.data.perfil)} />;
  }
  return (
    <ComercialLayout>
      <Suspense fallback={<RoutePageFallback />}>
        <Switch>
          <Route path="/comercial/dashboard" component={Dashboard} />
          <Route path="/comercial/clientes" component={Clientes} />
          <Route path="/comercial/clientes/:id" component={Cliente360} />
          <Route path="/comercial/oportunidades" component={Oportunidades} />
          <Route path="/comercial/mensagens" component={Mensagens} />
          <Route path="/comercial/kpis" component={Kpis} />
          <Route path="/comercial/relatorios" component={Relatorios} />
          <Route path="/comercial/acompanhamento-avarias" component={AcompanhamentoAvarias} />
          <Route path="/comercial/varejo">
            <Redirect to="/comercial/acompanhamento-avarias" />
          </Route>
          <Route
            path="/comercial/pedidos-historico"
            component={PedidosHistorico}
          />
          <Route path="/comercial/estoque-vivo">
            <Pedidos abaInicial="compras" />
          </Route>
          <Route path="/comercial/pedidos">
            <Pedidos />
          </Route>
          <Route path="/comercial/execucoes" component={Execucoes} />
          <Route path="/comercial/configuracoes" component={Configuracoes} />
        </Switch>
      </Suspense>
    </ComercialLayout>
  );
}
