import { isEmbeddedInErp } from "./embeddedErp";

/** UI premium — vidro e bordas; em modo ERP usa tokens Aurora do supervisório. */

const standalone = {
  glass:
    "rounded-2xl border border-slate-300/90 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_20px_50px_-20px_rgba(0,0,0,0.55)]",
  glassSm:
    "rounded-xl border border-slate-200 bg-white shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]",
  glassHover:
    "transition duration-300 hover:border-slate-400 hover:bg-slate-50 hover:shadow-[0_12px_40px_-16px_rgba(15,23,42,0.14)] dark:hover:border-cyan-400/25 dark:hover:bg-white/[0.06] dark:hover:shadow-[0_0_48px_-12px_rgba(34,211,238,0.12)]",
  toolbar:
    "relative z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/75 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]",
  titleGradient:
    "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent dark:from-white dark:via-slate-100 dark:to-slate-500",
  eyebrow: "text-[10px] font-semibold uppercase tracking-[0.35em] text-cyan-900 dark:text-cyan-400/70",
  stat: "font-mono tabular-nums tracking-tight",
  textStrong: "text-slate-900 dark:text-white",
  textSecondary: "text-slate-800 dark:text-slate-200",
  textMuted: "text-slate-600 dark:text-slate-500",
} as const;

const embedded = {
  glass:
    "rounded-xl border border-border/80 bg-card/90 shadow-sm backdrop-blur-md dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset,0_24px_56px_-28px_rgba(0,0,0,0.55)]",
  glassSm: "rounded-lg border border-border/80 bg-card/85 shadow-sm",
  glassHover: "transition duration-200 hover:border-border hover:bg-muted/30",
  toolbar: "relative z-20 border-b border-border/60 bg-background/90 backdrop-blur-xl",
  titleGradient: "text-foreground font-display tracking-tight",
  eyebrow: "text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
  stat: "font-mono tabular-nums tracking-tight",
  textStrong: "text-foreground",
  textSecondary: "text-foreground/90",
  textMuted: "text-muted-foreground",
} as const;

function pack() {
  return isEmbeddedInErp() ? embedded : standalone;
}

function bind<K extends keyof typeof standalone>(key: K): string {
  return isEmbeddedInErp() ? embedded[key] : standalone[key];
}

export const fuGlass = bind("glass");
export const fuGlassSm = bind("glassSm");
export const fuGlassHover = bind("glassHover");
export const fuToolbar = bind("toolbar");
export const fuTitleGradient = bind("titleGradient");
export const fuEyebrow = bind("eyebrow");
export const fuStat = bind("stat");
export const fuTextStrong = bind("textStrong");
export const fuTextSecondary = bind("textSecondary");
export const fuTextMuted = bind("textMuted");

/** Classes alinhadas ao modo atual (standalone vs ERP). Preferir em componentes novos. */
export function useFuBrand() {
  return pack();
}
