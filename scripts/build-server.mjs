import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "server/_core/index.ts");
const outdir = path.join(root, "dist");

/** Import único resolvido a partir de `dist/index.js` em produção. */
const COMERCIAL_PRISMA_ENTRY = "../server/comercial/generated/prisma/index.js";

await esbuild.build({
  entryPoints: [entry],
  platform: "node",
  packages: "external",
  bundle: true,
  format: "esm",
  outdir,
  external: ["./vite-dev.js"],
  plugins: [
    {
      name: "external-comercial-prisma",
      setup(build) {
        build.onResolve({ filter: /generated[/\\]prisma/ }, () => ({
          path: COMERCIAL_PRISMA_ENTRY,
          external: true,
        }));
      },
    },
  ],
});

console.log("[build-server] dist/index.js OK (Prisma comercial externalizado)");
