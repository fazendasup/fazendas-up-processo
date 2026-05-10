import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background to-muted/40">
      <Card className="w-full max-w-lg mx-4 shadow-lg border border-border bg-card/90 backdrop-blur-sm">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/15 rounded-full animate-pulse" />
              <AlertCircle className="relative h-16 w-16 text-destructive" aria-hidden />
            </div>
          </div>

          <h1 className="text-4xl font-bold font-display text-foreground mb-2">404</h1>

          <h2 className="text-xl font-semibold text-foreground mb-4">
            Página não encontrada
          </h2>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            O endereço não existe ou foi alterado.
            <br />
            Verifique o link ou volte ao início.
          </p>

          <div
            id="not-found-button-group"
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button
              type="button"
              onClick={handleGoHome}
              className="px-6 py-2.5 shadow-md"
            >
              <Home className="w-4 h-4 mr-2" aria-hidden />
              Ir ao início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
