import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProntosColheitaPorVariedadePanel } from '@/components/ProntosColheitaPorVariedadeResumo';
import type { ProntoColheitaVariedadeItem } from '@/lib/utils-farm';

const TRIGGER_AMBER =
  'surface-panel p-3.5 w-full min-h-0 min-w-0 h-full text-left bg-amber-500/[0.08] dark:bg-amber-500/15 ring-offset-background transition-shadow hover:ring-2 hover:ring-amber-500/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer';

type Props = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  rows: ProntoColheitaVariedadeItem[];
  unidade: string;
  dialogTitle?: string;
  dialogDescription?: string;
};

/**
 * KPI “Prontas colheita” que abre um diálogo com o detalhe por variedade ao clicar.
 */
export default function ProntasColheitaKpiDialog({
  icon,
  label,
  value,
  rows,
  unidade,
  dialogTitle = 'Prontas para colheita por variedade',
  dialogDescription,
}: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={TRIGGER_AMBER}
          title="Clique para ver o detalhe por variedade"
          aria-label={`${label}: ${value}. Abre o detalhe por variedade.`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            {icon}
            <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
          </div>
          <p className="font-display font-bold text-xl tabular-nums">{value}</p>
        </motion.button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription ?? 'Quantidades prontas para colheita, agrupadas por variedade.'}
          </DialogDescription>
        </DialogHeader>
        <ProntosColheitaPorVariedadePanel rows={rows} unidade={unidade} />
      </DialogContent>
    </Dialog>
  );
}
