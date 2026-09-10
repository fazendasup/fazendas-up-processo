import { useLocation } from "wouter";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pedidos } from "./Pedidos";
import { Mixes } from "./Mixes";

/**
 * Estoque vivo: compras do dia + receitas de mixes (calculadora de produção).
 */
export function EstoqueVivo() {
  const [location, setLocation] = useLocation();
  const aba = location.includes("/mixes") ? "mixes" : "compras";

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="Comercial"
        title="Estoque vivo"
        subtitle="Compras do dia a partir dos pedidos e receitas de mixes para calcular kg a processar."
      />

      <Tabs
        value={aba}
        onValueChange={value =>
          setLocation(
            value === "mixes" ? "/comercial/estoque-vivo/mixes" : "/comercial/estoque-vivo",
          )
        }
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="compras">Compras do dia</TabsTrigger>
          <TabsTrigger value="mixes">Receitas / Mixes</TabsTrigger>
        </TabsList>

        <TabsContent value="compras" className="mt-0">
          <Pedidos abaInicial="compras" somenteCompras />
        </TabsContent>

        <TabsContent value="mixes" className="mt-0">
          <Mixes embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
