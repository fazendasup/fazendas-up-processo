import { useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { PageHeader } from "@/components/comercial/ui/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pedidos } from "./Pedidos";
import { Mixes } from "./Mixes";

function hojeIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Estoque vivo: produção por receitas/mixes (principal) + compras do dia.
 * Query `?dia=YYYY-MM-DD` alinha com o dashboard operacional de pedidos.
 */
export function EstoqueVivo() {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const diaParam = params.get("dia");
  const dia =
    diaParam && /^\d{4}-\d{2}-\d{2}$/.test(diaParam) ? diaParam : hojeIsoLocal();

  const aba = location.includes("/compras") ? "compras" : "mixes";

  function ir(abaNova: "mixes" | "compras", diaNovo = dia) {
    const base =
      abaNova === "compras"
        ? "/comercial/estoque-vivo/compras"
        : "/comercial/estoque-vivo";
    setLocation(`${base}?dia=${diaNovo}`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        kicker="Comercial"
        title="Kg a processar"
        subtitle="Receitas de mixes ligadas aos pedidos do dia — volume por ingrediente."
      />

      <Tabs
        value={aba}
        onValueChange={value => ir(value === "compras" ? "compras" : "mixes")}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="mixes">Produção / Mixes</TabsTrigger>
          <TabsTrigger value="compras">Compras do dia</TabsTrigger>
        </TabsList>

        <TabsContent value="mixes" className="mt-0">
          <Mixes embedded dia={dia} onDiaChange={novo => ir("mixes", novo)} />
        </TabsContent>

        <TabsContent value="compras" className="mt-0">
          <Pedidos abaInicial="compras" somenteCompras diaInicial={dia} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
