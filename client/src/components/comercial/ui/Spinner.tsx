import { Loader2 } from "lucide-react";

export function Spinner(props: { className?: string; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${props.className ?? ""}`}>
      <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" aria-hidden />
      {props.label ? <span className="text-sm text-slate-300">{props.label}</span> : null}
    </span>
  );
}
