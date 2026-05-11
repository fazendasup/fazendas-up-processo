import { trpc } from "@/lib/trpc";
import { getActiveProjetoId } from "@/lib/projeto-header";
import { PROJETO_HEADER, UNAUTHED_ERR_MSG } from "@shared/const";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

/** Umami (ou compatível): só carrega com env real (sem placeholder / %VITE_*). */
function loadOptionalAnalytics() {
  const endpoint = String(
    import.meta.env.VITE_ANALYTICS_ENDPOINT ?? ""
  ).trim();
  const websiteId = String(
    import.meta.env.VITE_ANALYTICS_WEBSITE_ID ?? ""
  ).trim();
  if (
    !endpoint ||
    !websiteId ||
    endpoint.includes("%VITE_") ||
    websiteId.includes("%VITE_")
  ) {
    return;
  }
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "http:" && u.protocol !== "https:") return;
  } catch {
    return;
  }
  const base = endpoint.replace(/\/$/, "");
  const s = document.createElement("script");
  s.src = `${base}/umami`;
  s.defer = true;
  s.setAttribute("data-website-id", websiteId);
  document.body.appendChild(s);
}
loadOptionalAnalytics();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 30 * 60 * 1000,
      retry: (failureCount, err) => {
        if (err instanceof TRPCClientError && err.message === UNAUTHED_ERR_MSG) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: { retry: 0 },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = '/login';
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        const id = getActiveProjetoId();
        return id != null ? { [PROJETO_HEADER]: String(id) } : {};
      },
      fetch(input, init) {
        const timeoutMs = 25_000;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        const upstream = init?.signal;
        if (upstream) {
          if (upstream.aborted) ctrl.abort();
          else upstream.addEventListener("abort", () => ctrl.abort(), { once: true });
        }
        return globalThis
          .fetch(input, {
            ...(init ?? {}),
            credentials: "include",
            signal: ctrl.signal,
          })
          .finally(() => clearTimeout(t));
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
