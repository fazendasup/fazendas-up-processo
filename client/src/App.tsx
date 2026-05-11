import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
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

const LoginPage = lazy(() => import("./pages/LoginPage"));
const PrivacidadePage = lazy(() => import("./pages/PrivacidadePage"));
const Home = lazy(() => import("./pages/Home"));
const TorreDetail = lazy(() => import("./pages/TorreDetail"));
const BancadaDetail = lazy(() => import("./pages/BancadaDetail"));
const CiclosPage = lazy(() => import("./pages/CiclosPage"));
const ConfigPage = lazy(() => import("./pages/ConfigPage"));
const GerminacaoPage = lazy(() => import("./pages/GerminacaoPage"));
const ManutencaoPage = lazy(() => import("./pages/ManutencaoPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const ReceitasPage = lazy(() => import("./pages/ReceitasPage"));
const TarefasPage = lazy(() => import("./pages/TarefasPage"));
const PlanejamentoPage = lazy(() => import("./pages/PlanejamentoPage"));
const HojePage = lazy(() => import("./pages/HojePage"));
const CapacidadePage = lazy(() => import("./pages/CapacidadePage"));
const Inteligencia = lazy(() => import("./pages/Inteligencia"));
const VisaoPage = lazy(() => import("./pages/VisaoPage"));
const AdministradorPage = lazy(() => import("./pages/AdministradorPage"));
const EstoquePage = lazy(() => import("./pages/EstoquePage"));
const ProjetosPage = lazy(() => import("./pages/ProjetosPage"));
const AutomacaoPage = lazy(() => import("./pages/AutomacaoPage"));
const ModulosPlataformaPage = lazy(() => import("./pages/ModulosPlataformaPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
            {() => (
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            )}
          </Route>

          <Route path="/hoje">
            <ProtectedRoute>
              <HojePage />
            </ProtectedRoute>
          </Route>

          <Route path="/analytics">
            <ProtectedRoute requiredRole="admin">
              <AnalyticsPage />
            </ProtectedRoute>
          </Route>

          <Route path="/torre/:id">
            {() => (
              <ProtectedRoute>
                <TipoProjetoRouteGuard tiposTorre>
                  <TorreDetail />
                </TipoProjetoRouteGuard>
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/bancada/:id">
            {() => (
              <ProtectedRoute>
                <TipoProjetoRouteGuard tipo="hidroponia">
                  <BancadaDetail />
                </TipoProjetoRouteGuard>
              </ProtectedRoute>
            )}
          </Route>
          <Route path="/germinacao">
            <ProtectedRoute>
              <GerminacaoPage />
            </ProtectedRoute>
          </Route>
          <Route path="/manutencao">
            <ProtectedRoute>
              <ManutencaoPage />
            </ProtectedRoute>
          </Route>
          <Route path="/estoque">
            <ProtectedRoute>
              <ModuloProjetoRouteGuard modulo="estoque">
                <EstoquePage />
              </ModuloProjetoRouteGuard>
            </ProtectedRoute>
          </Route>

          <Route path="/ciclos">
            <ProtectedRoute requiredRole="admin">
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
            <ProtectedRoute>
              <PlanejamentoPage />
            </ProtectedRoute>
          </Route>
          <Route path="/capacidade">
            <ProtectedRoute requiredRole="admin">
              <CapacidadePage />
            </ProtectedRoute>
          </Route>
          <Route path="/receitas">
            <ProtectedRoute requiredRole="admin">
              <ReceitasPage />
            </ProtectedRoute>
          </Route>
          <Route path="/cadastros">
            <ProtectedRoute requiredRole="admin">
              <ReceitasPage />
            </ProtectedRoute>
          </Route>
          <Route path="/tarefas">
            <ProtectedRoute>
              <TarefasPage />
            </ProtectedRoute>
          </Route>
          <Route path="/inteligencia">
            <ProtectedRoute>
              <ModuloProjetoRouteGuard modulo="inteligencia">
                <Inteligencia />
              </ModuloProjetoRouteGuard>
            </ProtectedRoute>
          </Route>
          <Route path="/visao">
            <ProtectedRoute>
              <ModuloProjetoRouteGuard modulo="visao_cultivo">
                <VisaoPage />
              </ModuloProjetoRouteGuard>
            </ProtectedRoute>
          </Route>
          <Route path="/automacao">
            <ProtectedRoute>
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
