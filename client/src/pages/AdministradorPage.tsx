// AdministradorPage — Gerenciamento de Torres
// ============================================================

import Header from '@/components/Header';
import { useFazenda } from '@/contexts/FazendaContext';
import { FASES_CONFIG, type Fase } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Trash2, Power, Edit2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { motion } from 'framer-motion';

export default function AdministradorPage() {
  const { data, refetch } = useFazenda();
  const [showNewTorre, setShowNewTorre] = useState(false);
  const [editingTorre, setEditingTorre] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | number | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    fase: 'mudas' as Fase,
    numAndares: 10,
  });

  // Mutations
  const createTorre = trpc.torres.create.useMutation({
    onSuccess: () => {
      refetch();
      setShowNewTorre(false);
      setFormData({ nome: '', fase: 'mudas', numAndares: 10 });
      toast.success('Torre criada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const updateTorre = trpc.torres.update.useMutation({
    onSuccess: () => {
      refetch();
      setEditingTorre(null);
      toast.success('Torre atualizada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const toggleAtiva = trpc.torres.toggleAtiva.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Status da torre alterado!');
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const deleteTorre = trpc.torres.delete.useMutation({
    onSuccess: () => {
      refetch();
      setShowDeleteConfirm(null);
      toast.success('Torre deletada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const handleCreateTorre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome.trim()) {
      toast.error('Nome da torre é obrigatório');
      return;
    }
    createTorre.mutate({
      nome: formData.nome,
      fase: formData.fase,
      numAndares: formData.numAndares,
    });
  };

  const handleUpdateTorre = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTorre) return;
    updateTorre.mutate({
      id: editingTorre.id,
      nome: editingTorre.nome,
      fase: editingTorre.fase,
      numAndares: editingTorre.numAndares,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">Administrador</h1>
            <p className="text-muted-foreground mt-1">Gerenciar torres, fases e configurações</p>
          </div>
          <Dialog open={showNewTorre} onOpenChange={setShowNewTorre}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Torre
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Torre</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTorre} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome da Torre</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Torre Mudas 1"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fase">Fase</Label>
                  <Select value={formData.fase} onValueChange={(fase) => setFormData({ ...formData, fase: fase as Fase })}>
                    <SelectTrigger id="fase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mudas">🌱 Mudas</SelectItem>
                      <SelectItem value="vegetativa">🌿 Vegetativa</SelectItem>
                      <SelectItem value="maturacao">🌾 Maturação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="numAndares">Número de Andares</Label>
                  <Input
                    id="numAndares"
                    type="number"
                    min="1"
                    value={formData.numAndares}
                    onChange={(e) => setFormData({ ...formData, numAndares: parseInt(e.target.value) || 10 })}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createTorre.isPending}>
                    {createTorre.isPending ? 'Criando...' : 'Criar Torre'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Torres por Fase */}
        {(['mudas', 'vegetativa', 'maturacao'] as Fase[]).map((fase) => {
          const cfg = FASES_CONFIG[fase];
          const torresFase = data.torres.filter((t) => t.fase === fase);

          return (
            <motion.div
              key={fase}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">{cfg.icon}</span>
                <h2 className="font-display text-xl font-bold">{cfg.label}</h2>
                <span className="text-sm text-muted-foreground">({torresFase.length} torres)</span>
              </div>

              {torresFase.length === 0 ? (
                <div className="p-8 text-center rounded-lg border border-dashed">
                  <p className="text-muted-foreground">Nenhuma torre nesta fase</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {torresFase.map((torre) => (
                    <motion.div
                      key={torre.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`p-4 rounded-lg border ${
                        torre.ativa !== false
                          ? 'bg-card border-border'
                          : 'bg-muted/50 border-muted-foreground/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{torre.nome}</h3>
                          <p className="text-xs text-muted-foreground">
                            {torre.numAndares || torre.andares} andares
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${
                          torre.ativa !== false
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {torre.ativa !== false ? 'Ativa' : 'Inativa'}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Dialog open={editingTorre?.id === torre.id} onOpenChange={(open) => {
                          if (open) setEditingTorre({ ...torre });
                          else setEditingTorre(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="flex-1 gap-1">
                              <Edit2 className="w-3 h-3" />
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Torre</DialogTitle>
                            </DialogHeader>
                            {editingTorre && (
                              <form onSubmit={handleUpdateTorre} className="space-y-4">
                                <div>
                                  <Label>Nome</Label>
                                  <Input
                                    value={editingTorre.nome}
                                    onChange={(e) => setEditingTorre({ ...editingTorre, nome: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <Label>Fase</Label>
                                  <Select value={editingTorre.fase} onValueChange={(fase) => setEditingTorre({ ...editingTorre, fase })}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="mudas">🌱 Mudas</SelectItem>
                                      <SelectItem value="vegetativa">🌿 Vegetativa</SelectItem>
                                      <SelectItem value="maturacao">🌾 Maturação</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Número de Andares</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={editingTorre.numAndares || editingTorre.andares}
                                    onChange={(e) => setEditingTorre({ ...editingTorre, numAndares: parseInt(e.target.value) || 10 })}
                                  />
                                </div>
                                <DialogFooter>
                                  <Button type="submit" disabled={updateTorre.isPending}>
                                    {updateTorre.isPending ? 'Salvando...' : 'Salvar'}
                                  </Button>
                                </DialogFooter>
                              </form>
                            )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1"
                          onClick={() => toggleAtiva.mutate({ id: typeof torre.id === 'string' ? parseInt(torre.id) : torre.id })}
                          disabled={toggleAtiva.isPending}
                        >
                          <Power className="w-3 h-3" />
                          {torre.ativa !== false ? 'Desativar' : 'Ativar'}
                        </Button>

                        <Dialog open={showDeleteConfirm === torre.id} onOpenChange={(open) => {
                          if (!open) setShowDeleteConfirm(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1"
                              onClick={() => setShowDeleteConfirm(torre.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-red-600" />
                                Deletar Torre?
                              </DialogTitle>
                            </DialogHeader>
                            <p className="text-sm text-muted-foreground">
                              Tem certeza que deseja deletar <strong>{torre.nome}</strong>?
                              Esta ação não pode ser desfeita.
                            </p>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                                Cancelar
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => deleteTorre.mutate({ id: typeof torre.id === 'string' ? parseInt(torre.id) : torre.id })}
                                disabled={deleteTorre.isPending}
                              >
                                {deleteTorre.isPending ? 'Deletando...' : 'Deletar'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </main>
    </div>
  );
}
