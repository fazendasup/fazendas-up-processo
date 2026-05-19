import type { ReactNode } from "react";
import { isEmbeddedInErp } from "@/lib/comercial/embeddedErp";
import { fuEyebrow, fuTitleGradient } from "@/lib/comercial/fuBrand";

type Props = {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Rótulo opcional acima do título (ex.: módulo) */
  kicker?: string;
};

export function PageHeader(props: Props) {
  const embed = isEmbeddedInErp();
  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        {props.kicker ? <p className={`${fuEyebrow} mb-2`}>{props.kicker}</p> : null}
        <h1
          className={
            embed
              ? `font-display text-2xl font-semibold leading-tight tracking-tight md:text-3xl ${fuTitleGradient}`
              : `text-3xl font-bold leading-tight tracking-tight md:text-4xl ${fuTitleGradient}`
          }
        >
          {props.title}
        </h1>
        {props.subtitle ? (
          <div
            className={
              embed
                ? "mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground"
                : "mt-2 max-w-2xl text-base leading-relaxed text-slate-700 dark:text-slate-400"
            }
          >
            {props.subtitle}
          </div>
        ) : null}
      </div>
      {props.actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{props.actions}</div>
      ) : null}
    </header>
  );
}
