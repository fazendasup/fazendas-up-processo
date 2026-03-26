// ============================================================
// UsersPage — Gestão de Usuários (Admin)
// ============================================================

import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Users, ShieldCheck, User, Loader2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <UsersContent />
    </ProtectedRoute>
  );
}

function UsersContent() {
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      refetch();
      toast.success('Permissão atualizada!');
    },
    onError: (err) => {
      toast.error(`Erro: ${err.message}`);
    },
  });

  const handleRoleChange = (userId: number, newRole: 'user' | 'admin') => {
    if (!window.confirm(
      newRole === 'admin'
        ? 'Promover este usuário a Administrador? Ele terá acesso total ao sistema.'
        : 'Rebaixar este usuário a Operador? Ele perderá acesso às configurações.'
    )) return;
    updateRole.mutate({ id: userId, role: newRole });
  };

  const formatDate = (d: Date | string | null) => {
    if (!d) return '-';
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6" />
              Gestão de Usuários
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie permissões dos usuários do sistema
            </p>
          </div>
        </div>

        {/* Legenda de roles */}
        <div className="flex gap-4 mb-6 p-4 bg-card rounded-xl border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-xs font-semibold">Administrador</p>
              <p className="text-[10px] text-muted-foreground">Acesso total: config, variedades, ciclos, exclusões, seed/reset, gestão de usuários</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs font-semibold">Operador</p>
              <p className="text-[10px] text-muted-foreground">Dashboard + registrar medições, plantio, colheita, manutenção, germinação</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Carregando usuários...</p>
          </div>
        ) : !users || users.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-card rounded-xl border flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {u.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{u.name || 'Sem nome'}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email || 'Sem email'}</p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>Último acesso: {formatDate(u.lastSignedIn)}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <Select
                    value={u.role}
                    onValueChange={(val) => handleRoleChange(u.id, val as 'user' | 'admin')}
                    disabled={updateRole.isPending}
                  >
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Operador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-xl text-xs text-muted-foreground">
          <p className="font-semibold mb-1">Como funciona:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Novos usuários são cadastrados automaticamente ao fazer login pela primeira vez</li>
            <li>Por padrão, todos entram como <strong>Operador</strong></li>
            <li>Apenas administradores podem alterar permissões</li>
            <li>O dono do sistema (quem criou o projeto) é automaticamente administrador</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
