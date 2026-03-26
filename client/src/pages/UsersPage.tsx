// ============================================================
// UsersPage — Gestão de Usuários (Admin)
// Cadastro, alteração de role, reset de senha, exclusão
// ============================================================

import { useState } from 'react';
import Header from '@/components/Header';
import ProtectedRoute from '@/components/ProtectedRoute';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Users, ShieldCheck, User, Loader2, Clock, Plus, KeyRound, Trash2, AlertCircle,
} from 'lucide-react';
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
    onSuccess: () => { refetch(); toast.success('Permissão atualizada!'); },
    onError: (err) => { toast.error(`Erro: ${err.message}`); },
  });
  const createUser = trpc.users.create.useMutation({
    onSuccess: () => { refetch(); toast.success('Usuário cadastrado com sucesso!'); },
    onError: (err) => { toast.error(`Erro: ${err.message}`); },
  });
  const resetPassword = trpc.users.resetPassword.useMutation({
    onSuccess: () => { toast.success('Senha alterada com sucesso!'); },
    onError: (err) => { toast.error(`Erro: ${err.message}`); },
  });
  const deleteUser = trpc.users.delete.useMutation({
    onSuccess: () => { refetch(); toast.success('Usuário excluído!'); },
    onError: (err) => { toast.error(`Erro: ${err.message}`); },
  });

  // Estado do formulário de novo usuário
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [createError, setCreateError] = useState('');

  // Estado do dialog de reset de senha
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetError, setResetError] = useState('');

  const handleRoleChange = (userId: number, newRole: 'user' | 'admin') => {
    if (!window.confirm(
      newRole === 'admin'
        ? 'Promover este usuário a Administrador? Ele terá acesso total ao sistema.'
        : 'Rebaixar este usuário a Operador? Ele perderá acesso às configurações.'
    )) return;
    updateRole.mutate({ id: userId, role: newRole });
  };

  const handleCreate = () => {
    setCreateError('');
    if (!newName.trim()) { setCreateError('Nome é obrigatório'); return; }
    if (!newEmail.trim()) { setCreateError('Email é obrigatório'); return; }
    if (!newPassword || newPassword.length < 6) { setCreateError('Senha deve ter no mínimo 6 caracteres'); return; }
    createUser.mutate(
      { name: newName.trim(), email: newEmail.trim(), password: newPassword, role: newRole },
      {
        onSuccess: () => {
          setShowCreateDialog(false);
          setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('user');
        },
      }
    );
  };

  const handleResetPassword = () => {
    setResetError('');
    if (!resetNewPassword || resetNewPassword.length < 6) {
      setResetError('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (resetUserId === null) return;
    resetPassword.mutate(
      { id: resetUserId, newPassword: resetNewPassword },
      {
        onSuccess: () => {
          setResetUserId(null);
          setResetNewPassword('');
        },
      }
    );
  };

  const handleDelete = (userId: number, userName: string | null) => {
    if (!window.confirm(`Excluir o usuário "${userName || 'Sem nome'}"? Esta ação não pode ser desfeita.`)) return;
    deleteUser.mutate({ id: userId });
  };

  const formatDate = (d: Date | string | null) => {
    if (!d) return '-';
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
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
              Cadastre e gerencie os usuários do sistema
            </p>
          </div>

          {/* Botão Novo Usuário */}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
                <Plus className="w-4 h-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo acesso ao sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Nome</Label>
                  <Input
                    id="new-name"
                    placeholder="Nome completo"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    disabled={createUser.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={createUser.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">Senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={createUser.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as 'user' | 'admin')} disabled={createUser.isPending}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Operador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {createError && (
                  <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={createUser.isPending}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={createUser.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                  {createUser.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Cadastrando...</>
                  ) : (
                    'Cadastrar'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Legenda de roles */}
        <div className="flex gap-4 mb-6 p-4 bg-card rounded-xl border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <div>
              <p className="text-xs font-semibold">Administrador</p>
              <p className="text-[10px] text-muted-foreground">Acesso total: config, variedades, ciclos, analytics, gestão de usuários</p>
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
            <p className="text-xs text-muted-foreground mt-1">Clique em "Novo Usuário" para cadastrar o primeiro.</p>
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

                <div className="flex items-center gap-2 shrink-0">
                  {/* Role selector */}
                  <Select
                    value={u.role}
                    onValueChange={(val) => handleRoleChange(u.id, val as 'user' | 'admin')}
                    disabled={updateRole.isPending}
                  >
                    <SelectTrigger className="w-[130px] h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Operador</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Reset password */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    title="Alterar senha"
                    onClick={() => { setResetUserId(u.id); setResetNewPassword(''); setResetError(''); }}
                  >
                    <KeyRound className="w-4 h-4" />
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    title="Excluir usuário"
                    onClick={() => handleDelete(u.id, u.name)}
                    disabled={deleteUser.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Dialog de Reset de Senha */}
        <Dialog open={resetUserId !== null} onOpenChange={(open) => { if (!open) setResetUserId(null); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Alterar Senha</DialogTitle>
              <DialogDescription>
                {resetUserId !== null && users?.find(u => u.id === resetUserId)
                  ? `Definir nova senha para ${users.find(u => u.id === resetUserId)?.name || users.find(u => u.id === resetUserId)?.email}`
                  : 'Definir nova senha'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="reset-password">Nova Senha</Label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  disabled={resetPassword.isPending}
                  autoFocus
                />
              </div>
              {resetError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetUserId(null)} disabled={resetPassword.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleResetPassword} disabled={resetPassword.isPending}>
                {resetPassword.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  'Salvar Senha'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mt-6 p-4 bg-muted/50 rounded-xl text-xs text-muted-foreground">
          <p className="font-semibold mb-1">Como funciona:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Cadastre novos usuários com email e senha clicando em <strong>"Novo Usuário"</strong></li>
            <li>Defina o perfil: <strong>Operador</strong> (acesso operacional) ou <strong>Administrador</strong> (acesso total)</li>
            <li>Use o ícone de chave para alterar a senha de um usuário</li>
            <li>Todas as atividades registram quem executou para rastreabilidade</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
