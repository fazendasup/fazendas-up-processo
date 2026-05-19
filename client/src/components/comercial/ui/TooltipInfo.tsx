import { Info } from "lucide-react";

type Props = {
  text: string;
  id?: string;
};

export function TooltipInfo(props: Props) {
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <button
        type="button"
        className="rounded-full p-0.5 text-cyan-800 transition hover:bg-slate-200/90 hover:text-cyan-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/40 dark:text-cyan-400/80 dark:hover:bg-white/10 dark:hover:text-cyan-300 dark:focus-visible:ring-cyan-400/40"
        title={props.text}
        aria-label={props.text}
        id={props.id}
      >
        <Info className="h-4 w-4" strokeWidth={2} />
      </button>
    </span>
  );
}
