import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FazendaProvider } from "./contexts/FazendaContext";
import Home from "./pages/Home";
import TorreDetail from "./pages/TorreDetail";
import CiclosPage from "./pages/CiclosPage";
import ConfigPage from "./pages/ConfigPage";
import GerminacaoPage from "./pages/GerminacaoPage";
import ManutencaoPage from "./pages/ManutencaoPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/torre/:id" component={TorreDetail} />
      <Route path="/ciclos" component={CiclosPage} />
      <Route path="/config" component={ConfigPage} />
      <Route path="/germinacao" component={GerminacaoPage} />
      <Route path="/manutencao" component={ManutencaoPage} />
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
