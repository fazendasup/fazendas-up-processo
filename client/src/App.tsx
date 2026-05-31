import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ProjetoProvider } from "./contexts/ProjetoContext";
import { FazendaProvider } from "./contexts/FazendaContext";
import { AgendaModalProvider } from "./contexts/AgendaModalContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ProjetoOnboardingRedirect } from "./components/ProjetoOnboardingRedirect";
import { TipoProjetoRouteGuard } from "./components/TipoProjetoRouteGuard";
import { ModuloProjetoRouteGuard } from "./components/ModuloProjetoRouteGuard";
import { SyncDocumentTitle } from "./components/SyncDocumentTitle";
import { RoutePageFallback } from "./components/RoutePageFallback";
import { useAuth } from "./_core/hooks/useAuth";
import { canAccessCommercialPath, homeForCommercialPerfil, homeForUserRole } from "./lib/accessPolicy";
import { trpc } from "./lib/trpc";

const LoginPage = lazy(() => import(/* @vite-ignore */"./pages/LoginPage"));
const PrivacidadePage = lazy(() => import(/* @vite-ignore */"./pages/PrivacidadePage"));
const Home = lazy(() => import(/* @vite-ignore */"./pages/Home"));
const TorreDetail = lazy(() => import(/* @vite-ignore */"./pages/TorreDetail"));
const BancadaDetail = lazy(() => import(/* @vite-ignore */"./pages/BancadaDetail"));
const CiclosPage = lazy(() => import(/* @vite-ignore */"./pages/CiclosPage"));
const ConfigPage = lazy(() => import(/* @vite-ignore */"./pages/ConfigPage"));
const GerminacaoPage = lazy(() => import(/* @vite-ignore */"./pages/GerminacaoPage"));
const ManutencaoPage = lazy(() => import(/* @vite-ignore */"./pages/ManutencaoPage"));
const UsersPage = lazy(() => import(/* @vite-ignore */"./pages/UsersPage"));
const AnalyticsPage = lazy(() => import(/* @vite-ignore */"./pages/AnalyticsPage"));
const ReceitasPage = lazy(() => import(/* @vite-ignore */"./pages/ReceitasPage"));
const TarefasPage = lazy(() => import(/* @vite-ignore */"./pages/TarefasPage"));
const PlanejamentoPage = lazy(() => import(/* @vite-ignore */"./pages/PlanejamentoPage"));
const HojePage = lazy(() => import(/* @vite-ignore */"./pages/HojePage"));
const CapacidadePage = lazy(() => import(/* @vite-ignore */"./pages/CapacidadePage"));
const CustosProducaoPage = lazy(() => import(/* @vite-ignore */"./pages/CustosProducaoPage"));
const Inteligencia = lazy(() => import(/* @vite-ignore */"./pages/Inteligencia"));
const VisaoPage = lazy(() => import(/* @vite-ignore */"./pages/VisaoPage"));
const AdministradorPage = lazy(() => import(/* @vite-ignore */"./pages/AdministradorPage"));
const EstoquePage = lazy(() => import(/* @vite-ignore */"./pages/EstoquePage"));
const ProjetosPage = lazy(() => import(/* @vite-ignore */"./pages/ProjetosPage"));
const AutomacaoPage = lazy(() => import(/* @vite-ignore */"./pages/AutomacaoPage"));
const ModulosPlataformaPage = lazy(() => import(/* @vite-ignore */"./pages/ModulosPlataformaPage"));
const ComercialRoutes = lazy(() => import(/* @vite-ignore */"./pages/ComercialRoutes"));
const NotFound = lazy(() => import(/* @vite-ignore */"./pages/NotFound"));

function RoleRootRoute() {
  const { user } = useAuth();
  const home = homeForUserRole(user?.role);
  if (home !== "/") return <Redirect to={home} />;
  return (
    <ProtectedRoute requiredRole="processo">
      <Home />
    </ProtectedRoute>
  );
}

function ComercialPerfilRouteGuard({ path, children }: { path: string; children: React.ReactNode }) {
  const { user } = useAuth();
  const me = trpc.comercial.pedidos.me.useQuery(undefined, {
    enabled: user?.role === "comercial",
    staleTime: 60_000,
  });
  if (user?.role !== "comercial") return <>{children}</>;
  if (!me.data) return <RoutePageFallback />;
  if (!canAccessCommercialPath(path, me.data.perfil)) {
    return <Redirect to={homeForCommercialPerfil(me.data.perfil)} />;
  }
  return <>{children}</>;
}

function Router() {
  return (
    <>
      <SyncDocumentTitle />
      <Suspense fallback={<RoutePageFallback />}>
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route path="/login/" component={LoginPage} />
          <Route path="/privacidade" component={PrivacidadePage} />
          <Route path="/privacidade/" component={PrivacidadePage} />

          <Route path="/">
            {() => <RoleRootRoute />}
          </Route>

          <Route path="/hoje">
            <ProtectedRoute requiredRole="processo">
              <HojePage />
            </ProtectedRoute>
          </Route>

          <Route path="/analytics">
            <ProtectedRoute requiredRole="processo">
              <AnalyticsPage />
            </ProtectedRoute>
          </Route>

          <Route path="/torre/:id">
            {() => (
              <ProtectedRoute requiredRole="processo">
                <TipoProjetoRouteGuard tiposTorre>
                  <TorreDetail />
                </TipoProjetoRouteGuard>
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/bancada/:id">
            {() => (
              <ProtectedRoute requiredRole="processo">
                <TipoProjetoRouteGuard tipo="hidroponia">
                  <BancadaDetail />
                </TipoProjetoRouteGuard>
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/germinacao">
            <ProtectedRoute requiredRole="processo">
              <GerminacaoPage />
            </ProtectedRoute>
          </Route>
          <Route path="/manutencao">
            <ProtectedRoute requiredRole="processo">
              <ManutencaoPage />
            </ProtectedRoute>
          </Route>
          <Route path="/estoque">
            <ProtectedRoute requiredRole="admin">
              <ModuloProjetoRouteGuard modulo="estoque">
                <EstoquePage />
              </ModuloProjetoRouteGuard>
            </ProtectedRoute>
          </Route>

          <Route path="/ciclos">
            <ProtectedRoute requiredRole="processo">
              <CiclosPage />
            </ProtectedRoute>
          </Route>
          <Route path="/config">
            <ProtectedRoute requiredRole="admin">
              <ConfigPage />
            </ProtectedRoute>
          </Route>
          <Route path="/administracao">
            <ProtectedRoute requiredRole="admin">
              <AdministradorPage />
            </ProtectedRoute>
          </Route>
          <Route path="/plataforma/modulos">
            <ProtectedRoute requiredRole="platform_admin">
              <ModulosPlataformaPage />
            </ProtectedRoute>
          </Route>
          <Route path="/planejamento">
            <ProtectedRoute requiredRole="processo">
              <PlanejamentoPage />
            </ProtectedRoute>
          </Route>
          <Route path="/capacidade">
            <ProtectedRoute requiredRole="admin">
              <CapacidadePage />
            </ProtectedRoute>
          </Route>
          <Route path="/custos-producao">
            <ProtectedRoute requiredRole="comercial">
              <ModuloProjetoRouteGuard modulo="custos_producao">
                <ComercialPerfilRouteGuard path="/custos-producao">
                  <CustosProducaoPage />
                </ComercialPerfilRouteGuard>
              </ModuloProjetoRouteGuard>
            </ProtectedRoute>
          </Route>
          <Route path="/comercial">
            <ProtectedRoute requiredRole="comercial">
              <ModuloProjetoRouteGuard modulo="comercial">
                <ComercialRoutes />
              </ModuloProjetoRouteGuard>
            </ProtectedRoute>
          </Route>
          <Route path="/comercial/">
            <ProtectedRoute requiredRole="comercial">
              <ModuloProjetoRouteGuard modulo="comercial">
                <ComercialRoutes />
              </ModuloProjetoRouteGuard>
            </ProtectedRoute>
          </Route>
          <Route path="/comercial/:rest+">
            <ProtectedRoute requiredRole="comercial">
              <ModuloProjetoRouteGuard modulo="comercial">
                <ComercialRoutes />
              </ModuloProjetoRouteGuard>
            </ProtectedRoute>
          </Route>
          <Route path="/receitas">
            <ProtectedRoute requiredRole="processo">
              <ReceitasPage />
            </ProtectedRoute>
          </Route>
          <Route path="/cadastros">
            <ProtectedRoute requiredRole="processo">
              <ReceitasPage />
            </ProtectedRoute>
          </Route>
          <Route path="/tarefas">
            <ProtectedRoute requiredRole="processo">
              <TarefasPage />
            </ProtectedRoute>
          </Route>
          <Route path="/inteligencia">
            <ProtectedRoute requiredRole="processo">
              <ModuloProjetoRouteGuard modulo="inteligencia">
                <Inteligencia />
              </ModuloProjetoRouteGuard>
            </ProtectedRoute>
          </Route>
          <Route path="/visao">
            <ProtectedRoute requiredRole="processo">
              <ModuloProjetoRouteGuard modulo="visao_cultivo">
                <VisaoPage />
              </ModuloProjetoRouteGuard>
            </ProtectedRoute>
          </Route>
          <Route path="/automacao">
            <ProtectedRoute requiredRole="processo">
              <ModuloProjetoRouteGuard modulo="automacao">
                <AutomacaoPage />
              </ModuloProjetoRouteGuard>
            </ProtectedRoute>
          </Route>
          <Route path="/usuarios">
            <ProtectedRoute requiredRole="admin">
              <UsersPage />
            </ProtectedRoute>
          </Route>

          <Route path="/projetos">
            <ProtectedRoute>
              <ProjetosPage />
            </ProtectedRoute>
          </Route>
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <ProjetoProvider>
          <FazendaProvider>
            <AgendaModalProvider>
              <TooltipProvider>
                <Toaster />
                <ProjetoOnboardingRedirect>
                  <Router />
                </ProjetoOnboardingRedirect>
              </TooltipProvider>
            </AgendaModalProvider>
          </FazendaProvider>
        </ProjetoProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
