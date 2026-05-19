import { useState, type ReactNode } from 'react';
import { useFazenda } from '@/contexts/FazendaContext';
import { useFazendaMutations } from '@/hooks/useFazendaMutations';
import { useDbIdResolver } from '@/hooks/useDbIdResolver';
import { VARIEDADES_PADRAO } from '@/lib/types';
import { variedadeEhBabyLeafFV } from '@shared/variedadesFase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Leaf, Plus, RotateCcw, Trash2 } from 'lucide-react';

type Props = {
  /** Texto extra sob o título (ex.: nota microverdes em Config). */
  notaTopo?: ReactNode;
};

export function VariedadesCadastroTable({ notaTopo }: Props) {
  const { data } = useFazenda();
  const mutations = useFazendaMutations();
  const resolver = useDbIdResolver();
  const [showAddVar, setShowAddVar] = useState(false);
  const [novaBabyLeaf, setNovaBabyLeaf] = useState(false);

  const handleAddVariedade = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nome = (fd.get('nome') as string)?.trim();
    if (!nome) {
      toast.error('Informe o nome da variedade');
      return;
    }
    mutations.createVariedade.mutate({ nome, babyLeaf: novaBabyLeaf });
    setShowAddVar(false);
    setNovaBabyLeaf(false);
    toast.success(`Variedade "${nome}" adicionada!`);
  };

  const handleToggleBabyLeaf = (varId: string, checked: boolean) => {
    const dbId = resolver.varSlugToId.get(varId);
    if (!dbId) return;
    mutations.updateVariedade.mutate({ id: dbId, babyLeaf: checked });
  };

  const handleDeleteVariedade = (varId: string) => {
    if (!window.confirm('Excluir esta variedade?')) return;
    const dbId = resolver.varSlugToId.get(varId);
    if (!dbId) return;
    mutations.deleteVariedade.mutate({ id: dbId });
    toast.success('Variedade excluída!');
  };

  const handleResetVariedades = () => {
    if (!window.confirm('Restaurar variedades padrão? Variedades personalizadas serão removidas.')) return;
    data.variedades.forEach((v) => {
      const dbId = resolver.varSlugToId.get(v.id);
      if (dbId) mutations.deleteVariedade.mutate({ id: dbId });
    });
    VARIEDADES_PADRAO.forEach((v) => {
      const babyLeaf = v.babyLeaf ?? variedadeEhBabyLeafFV(v.id, v.nome);
      mutations.createVariedade.mutate({ nome: v.nome, babyLeaf });
    });
    toast.success('Variedades restauradas!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold flex items-center gap-2">
            <Leaf className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Variedades
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastro da espécie/cultivar. Marque <strong>Baby leaf</strong> para torres 12×6 (2 células/furo em
            vegetativa e maturação). Prazos por fase ficam na <strong>receita</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={handleResetVariedades}>
            <RotateCcw className="w-3 h-3 mr-1" />
            Restaurar
          </Button>
          <Dialog
            open={showAddVar}
            onOpenChange={(open) => {
              setShowAddVar(open);
              if (!open) setNovaBabyLeaf(false);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Nova variedade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-display">Nova variedade</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddVariedade} className="space-y-4">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input name="nome" placeholder="Ex: Alface Mimosa" className="h-9 text-sm" required />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <Label htmlFor="nova-baby-leaf" className="text-xs font-medium cursor-pointer">
                      Baby leaf (torres 12×6)
                    </Label>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      2 células por furo em veg/mat; dobra sementes no planejamento contínuo.
                    </p>
                  </div>
                  <Switch id="nova-baby-leaf" checked={novaBabyLeaf} onCheckedChange={setNovaBabyLeaf} />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full">
                    Adicionar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {notaTopo}

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-semibold">Variedade</th>
                <th className="text-left p-3 font-semibold">Baby leaf</th>
                <th className="text-left p-3 font-semibold text-muted-foreground">Prazos no app</th>
                <th className="p-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {data.variedades.map((v) => {
                const ehBaby = variedadeEhBabyLeafFV(v.id, v.nome, v.babyLeaf);
                return (
                  <tr key={v.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      {v.nome}
                      {ehBaby && (
                        <Badge variant="secondary" className="ml-2 text-[10px] font-normal">
                          12×6
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <Switch
                        checked={ehBaby}
                        onCheckedChange={(checked) => handleToggleBabyLeaf(v.id, checked)}
                        aria-label={`Baby leaf: ${v.nome}`}
                      />
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      Definidos na receita (aba Receitas). Sem receita ativa, usam-se valores padrão.
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteVariedade(v.id)}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
