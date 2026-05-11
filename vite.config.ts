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

/** Agrupa `node_modules` em chunks estáveis — cache do browser e builds mais silenciosos. */
function manualChunks(id: string): string | undefined {
  if (!id.includes("node_modules")) return undefined;
  const n = id.replace(/\\/g, "/");

  if (n.includes("react-day-picker") || n.includes("date-fns")) return "vendor-calendar";
  if (n.includes("recharts")) return "vendor-recharts";
  if (n.includes("@radix-ui")) return "vendor-radix";
  if (n.includes("@tanstack/react-query")) return "vendor-query";
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
  /** streamdown + KaTeX são pesados — chunk à parte para não monopolizar o vendor genérico. */
  if (n.includes("streamdown") || n.includes("katex")) return "vendor-streamdown";

  return "vendor";
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
