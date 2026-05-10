import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HojeAgendaPanel } from "@/components/HojeAgendaPanel";
import { agendaModalHint, agendaModalTitle, type AgendaFocus } from "@/lib/agendaFocus";
import { CalendarCheck } from "lucide-react";

export function AgendaDoDiaModal({
  open,
  focus,
  onOpenChange,
}: {
  open: boolean;
  focus: AgendaFocus;
  onOpenChange: (v: boolean) => void;
}) {
  const tituloData = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const titulo = agendaModalTitle(focus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100vw-1.5rem)] max-h-[min(90vh,920px)] overflow-y-auto p-4 sm:p-6 gap-3">
        <DialogHeader className="text-left space-y-1 pr-8">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-primary shrink-0" />
            {titulo}
          </DialogTitle>
          <DialogDescription className="capitalize text-sm">{tituloData}</DialogDescription>
          <p className="text-xs text-muted-foreground pt-1">{agendaModalHint(focus)}</p>
        </DialogHeader>
        <div className="border-t border-border/60 pt-4">
          <HojeAgendaPanel focus={focus} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
