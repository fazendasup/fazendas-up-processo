import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FazendaProvider } from "./contexts/FazendaContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import TorreDetail from "./pages/TorreDetail";
import CiclosPage from "./pages/CiclosPage";
import ConfigPage from "./pages/ConfigPage";
import GerminacaoPage from "./pages/GerminacaoPage";
import ManutencaoPage from "./pages/ManutencaoPage";
import UsersPage from "./pages/UsersPage";
import AnalyticsPage from "./pages/AnalyticsPage";

function Router() {
  return (
    <Switch>
      {/* Dashboard — público (leitura) */}
      <Route path="/" component={Home} />

      {/* Analytics — admin */}
      <Route path="/analytics">
        <ProtectedRoute requiredRole="admin">
          <AnalyticsPage />
        </ProtectedRoute>
      </Route>

      {/* Páginas operacionais — requerem login (operador + admin) */}
      <Route path="/torre/:id">
        {(params) => (
          <ProtectedRoute>
            <TorreDetail />
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

      {/* Páginas administrativas — requerem admin */}
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
      <Route path="/usuarios">
        <UsersPage />
      </Route>

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <FazendaProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </FazendaProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
