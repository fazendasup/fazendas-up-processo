import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, type ConfigEnv, type PluginOption } from "vite";

const pluginsForCommand = (command: ConfigEnv["command"]): PluginOption[] => {
  const base: PluginOption[] = [react(), tailwindcss()];
  /** Locators JSX só em dev — não entram no bundle de produção. */
  if (command === "serve") {
    base.push(jsxLocPlugin());
  }
  return base;
};

/**
 * Módulos de aplicação que lazy routes (ex. agenda) precisam mas o Rollup colocava no **entry** —
 * isso cria import do `index-*.js` a partir do chunk do modal e puxa shiki/streamdown para o arranque.
 */
function appManualChunks(id: string): string | undefined {
  const n = id.replace(/\\/g, "/");
  if (n.includes("/lib/trpc.ts") || n.includes("/lib/trpc.tsx")) return "lib-trpc";
  if (n.includes("FazendaContext")) return "ctx-fazenda";
  if (n.includes("ProjetoContext")) return "ctx-projeto";
  /** Se ficarem no entry, o chunk da agenda importa o index e volta o ciclo com shiki. */
  if (n.includes("/components/ui/button.tsx") || n.includes("/components/ui/button/")) {
    return "ui-button";
  }
  if (n.includes("/components/ui/tooltip.tsx") || n.includes("/components/ui/tooltip/")) {
    return "ui-tooltip";
  }
  return undefined;
}

/** Agrupa `node_modules` em chunks estáveis — cache do browser e builds mais silenciosos. */
function manualChunks(id: string): string | undefined {
  const n = id.replace(/\\/g, "/");
  const app = appManualChunks(id);
  if (app) return app;
  if (!id.includes("node_modules")) return undefined;

  if (n.includes("react-day-picker") || n.includes("date-fns")) return "vendor-calendar";
  if (n.includes("recharts")) return "vendor-recharts";
  if (n.includes("@radix-ui")) return "vendor-radix";
  /** query-core é pacote separado — se cair no vendor genérico, funde-se com outros deps (~12MB no chunk partilhado). */
  if (n.includes("@tanstack/query-core")) return "vendor-query";
  if (n.includes("@tanstack/react-query")) return "vendor-query";
  /** Radix/dialog drag — não misturar com o mega-vendor. */
  if (n.includes("react-remove-scroll")) return "vendor-radix";
  if (n.includes("@trpc")) return "vendor-trpc";
  if (n.includes("lucide-react")) return "vendor-icons";
  if (n.includes("framer-motion")) return "vendor-motion";
  if (n.includes("node_modules/react-dom") || n.includes("node_modules/scheduler")) {
    return "vendor-react";
  }
  if (n.includes("/node_modules/react/")) return "vendor-react";
  if (n.includes("wouter")) return "vendor-router";
  if (n.includes("node_modules/zod/") || n.includes("node_modules\\zod\\")) return "vendor-zod";
  if (n.includes("superjson")) return "vendor-serialize";
  /** Pacotes médios — evitar um único vendor gigante (timeouts / parse longo no primeiro load). */
  if (n.includes("/axios/")) return "vendor-net";
  if (n.includes("/jose/")) return "vendor-jose";
  if (n.includes("/cmdk/")) return "vendor-cmdk";
  if (n.includes("/openai/")) return "vendor-openai";
  if (n.includes("/date-fns/")) return "vendor-datefns";
  if (n.includes("react-hook-form")) return "vendor-forms";
  if (n.includes("@hookform/resolvers")) return "vendor-forms";
  if (n.includes("embla-carousel")) return "vendor-embla";
  if (n.includes("/next-themes/")) return "vendor-next-themes";
  if (n.includes("/sonner/")) return "vendor-sonner";
  if (n.includes("/vaul/")) return "vendor-vaul";
  if (n.includes("/input-otp/")) return "vendor-input-otp";
  if (n.includes("react-resizable-panels")) return "vendor-panels";
  if (n.includes("/nanoid/")) return "vendor-nanoid";
  if (n.includes("class-variance-authority")) return "vendor-cva";
  if (n.includes("/clsx/")) return "vendor-clsx";
  if (n.includes("tailwind-merge")) return "vendor-tailwind-merge";
  if (n.includes("@floating-ui")) return "vendor-floating-ui";
  /**
   * Não forçar chunks nomeados para Shiki/streamdown/micromark: há **ciclo** streamdown ↔ @shikijs e,
   * com `manualChunks` a separar os dois, o Rollup funde o `__vitePreload` no chunk do Shiki (~9MB) e o
   * **entry** passa a importar esse ficheiro só para o helper de preload — o site fica em "Carregando…".
   * Deixar o Rollup partir estes pacotes evita o critical path de multi‑MB no `index-*.js`.
   */

  /** Deixar o Rollup dividir o resto — um único `vendor` (~MB+) fundia preload/mermaid com streamdown no arranque. */
  return undefined;
}

export default defineConfig(({ command }) => ({
  plugins: pluginsForCommand(command),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  define: {
    "process.env.VITE_APP_ID": JSON.stringify(process.env.VITE_APP_ID || ""),
    "process.env.VITE_OAUTH_PORTAL_URL": JSON.stringify(
      process.env.VITE_OAUTH_PORTAL_URL || ""
    ),
    /** Opcional: Umami (ou compatível). Vazio = `main.tsx` não carrega script nem chama /umami. */
    "import.meta.env.VITE_ANALYTICS_ENDPOINT": JSON.stringify(
      process.env.VITE_ANALYTICS_ENDPOINT ?? ""
    ),
    "import.meta.env.VITE_ANALYTICS_WEBSITE_ID": JSON.stringify(
      process.env.VITE_ANALYTICS_WEBSITE_ID ?? ""
    ),
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    /** Evita pré-carregar chunks gigantes (markdown) antes do entry — melhora primeiro arranque em produção. */
    modulePreload: {
      resolveDependencies: (filename, deps) => {
        return deps.filter(
          (d) =>
            !d.includes("mermaid") &&
            !d.includes("shiki") &&
            !d.includes("streamdown"),
        );
      },
    },
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    host: true,
    /** true = celular/outro PC pelo IP na mesma rede (evita "host not allowed" do Vite). */
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
}));
