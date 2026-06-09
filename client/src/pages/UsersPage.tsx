// ============================================================
// UsersPage — Gestão de Usuários (Admin)
// Cadastro, alteração de role, reset de senha, exclusão
// ============================================================

import { useMemo, useState } from 'react';
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
  Users, ShieldCheck, User, Loader2, Clock, Plus, KeyRound, Trash2, AlertCircle, Layers, Briefcase, Eye, Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useRole } from '@/hooks/useRole';

type GlobalAppRole = 'user' | 'admin' | 'platform_admin' | 'comercial' | 'visitante';
type RoleOption = GlobalAppRole | 'promoter' | 'lider_colheita' | 'logistica';
type ProjetoRole = 'admin' | 'operador' | 'visualizador';
type UserProjectAccess = { id: number; nome: string; role: string };
type ManageableProject = {
  id: number;
  nome: string;
  tipo: string;
  status: string;
  criadoPorId?: number | null;
};

function appRoleFromOption(role: RoleOption): GlobalAppRole {
  return role === 'promoter' || role === 'lider_colheita' || role === 'logistica' ? 'comercial' : role;
}

function comercialPerfilFromOption(role: RoleOption): 'PROMOTER' | 'LIDER_COLHEITA' | 'LOGISTICA' | 'COMERCIAL' | undefined {
  if (role === 'promoter') return 'PROMOTER';
  if (role === 'lider_colheita') return 'LIDER_COLHEITA';
  if (role === 'logistica') return 'LOGISTICA';
  if (role === 'comercial') return 'COMERCIAL';
  return undefined;
}

function roleOptionForUser(user: { role: string; comercialPerfil?: string | null }): RoleOption {
  if (user.role === 'comercial' && user.comercialPerfil === 'PROMOTER') return 'promoter';
  if (user.role === 'comercial' && user.comercialPerfil === 'LIDER_COLHEITA') return 'lider_colheita';
  if (user.role === 'comercial' && user.comercialPerfil === 'LOGISTICA') return 'logistica';
  if (['user', 'admin', 'platform_admin', 'comercial', 'visitante'].includes(user.role)) {
    return user.role as GlobalAppRole;
  }
  return 'user';
}

function projetoRoleForUser(role: string): ProjetoRole {
  if (role === 'admin' || role === 'platform_admin') return 'admin';
  if (role === 'comercial' || role === 'visitante') return 'visualizador';
  return 'operador';
}

function labelProjetoRole(role: string): string {
  if (role === 'admin') return 'Admin';
  if (role === 'visualizador') return 'Visualizador';
  return 'Operador';
}

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <UsersContent />
    </ProtectedRoute>
  );
}

function UsersContent() {
  const { isPlatformAdmin } = useRole();
  const utils = trpc.useUtils();
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const { data: projetosRows } = trpc.projetos.gerenciaveis.useQuery();
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
  const addProjetoUser = trpc.projetos.addUser.useMutation({
    onSuccess: () => {
      refetch();
      utils.projetos.gerenciaveis.invalidate();
      toast.success('Projeto vinculado ao usuário!');
    },
    onError: (err) => { toast.error(`Erro: ${err.message}`); },
  });
  const removeProjetoUser = trpc.projetos.removeUser.useMutation({
    onSuccess: () => {
      refetch();
      utils.projetos.gerenciaveis.invalidate();
      toast.success('Vínculo removido!');
    },
    onError: (err) => { toast.error(`Erro: ${err.message}`); },
  });
  const setProjectOwner = trpc.projetos.setOwner.useMutation({
    onSuccess: () => {
      refetch();
      utils.projetos.gerenciaveis.invalidate();
      toast.success('Dono do projeto atualizado!');
    },
    onError: (err) => { toast.error(`Erro: ${err.message}`); },
  });

  // Estado do formulário de novo usuário
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<RoleOption>('user');
  const [newProjetoIds, setNewProjetoIds] = useState<number[]>([]);
  const [createError, setCreateError] = useState('');
  const [selectedProjetoByUser, setSelectedProjetoByUser] = useState<Record<number, string>>({});

  const projetosGerenciaveis = useMemo(
    () => (projetosRows ?? []).map((row) => row.projeto as ManageableProject),
    [projetosRows],
  );
  const projetosDisponiveis = useMemo(
    () => projetosGerenciaveis.filter((p) => p.status === 'ativo'),
    [projetosGerenciaveis],
  );
  const adminUsers = useMemo(
    () => (users ?? []).filter((u) => u.role === 'admin'),
    [users],
  );

  // Estado do dialog de reset de senha
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetError, setResetError] = useState('');

  const handleRoleChange = (userId: number, next: RoleOption) => {
    let msg: string;
    if (next === 'platform_admin') {
      msg =
        'Promover a Equipa da plataforma? Esta conta poderá gerir módulos contratados (estoque, automação, etc.) para todos os projetos.';
    } else if (next === 'admin') {
      msg = 'Promover este usuário a Administrador operacional? Terá acesso a configurações e gestão de usuários.';
    } else if (next === 'comercial') {
      msg = 'Alterar para Comercial? Terá acesso apenas às áreas comerciais dos projetos vinculados.';
    } else if (next === 'promoter') {
      msg = 'Alterar para Promoter? Terá acesso somente a Pedidos e Acompanhamento de avarias nos projetos vinculados.';
    } else if (next === 'lider_colheita') {
      msg = 'Alterar para Líder de colheita? Terá acesso somente a Pedidos e Acompanhamento de avarias, sem números de vendas.';
    } else if (next === 'logistica') {
      msg = 'Alterar para Logística? Terá acesso somente ao modo entregador das entregas.';
    } else if (next === 'visitante') {
      msg = 'Alterar para Visitante? Poderá visualizar o projeto vinculado e extrair relatórios, mas não editar nem acionar operações.';
    } else {
      msg = 'Rebaixar a Operador? Perderá acesso às áreas administrativas.';
    }
    if (!window.confirm(msg)) return;
    updateRole.mutate({ id: userId, role: appRoleFromOption(next), comercialPerfil: comercialPerfilFromOption(next) });
  };

  const handleCreate = () => {
    setCreateError('');
    if (!newName.trim()) { setCreateError('Nome é obrigatório'); return; }
    if (!newEmail.trim()) { setCreateError('Email é obrigatório'); return; }
    if (!newPassword || newPassword.length < 6) { setCreateError('Senha deve ter no mínimo 6 caracteres'); return; }
    const role = appRoleFromOption(newRole);
    if (role !== 'platform_admin' && newProjetoIds.length === 0) {
      setCreateError('Selecione ao menos um projeto para este usuário');
      return;
    }
    createUser.mutate(
      {
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role,
        comercialPerfil: comercialPerfilFromOption(newRole),
        projetoIds: newProjetoIds,
      },
      {
        onSuccess: () => {
          setShowCreateDialog(false);
          setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('user'); setNewProjetoIds([]);
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

  const handleAddProjetoToUser = (user: { id: number; name: string | null; role: string }) => {
    const rawProjetoId = selectedProjetoByUser[user.id];
    const projetoId = Number(rawProjetoId);
    if (!Number.isInteger(projetoId) || projetoId <= 0) {
      toast.error('Selecione um projeto para vincular.');
      return;
    }
    addProjetoUser.mutate(
      { projetoId, userId: user.id, role: projetoRoleForUser(user.role) },
      { onSuccess: () => setSelectedProjetoByUser((prev) => ({ ...prev, [user.id]: '' })) },
    );
  };

  const handleRemoveProjetoFromUser = (
    user: { id: number; name: string | null },
    projeto: UserProjectAccess,
  ) => {
    const nome = user.name || 'Sem nome';
    if (!window.confirm(`Remover ${nome} do projeto "${projeto.nome}"?`)) return;
    removeProjetoUser.mutate({ projetoId: projeto.id, userId: user.id });
  };

  const handleOwnerChange = (projeto: ManageableProject, value: string) => {
    const ownerUserId = value === 'none' ? null : Number(value);
    const msg = ownerUserId == null
      ? `Deixar "${projeto.nome}" sem dono operacional? Apenas a equipe da plataforma poderá gerir este projeto.`
      : `Definir o dono operacional de "${projeto.nome}"? O usuário será vinculado ao projeto como admin.`;
    if (!window.confirm(msg)) return;
    setProjectOwner.mutate({ projetoId: projeto.id, ownerUserId });
  };

  const formatDate = (d: Date | string | null) => {
    if (!d) return '-';
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const toggleNewProjeto = (projetoId: number) => {
    setNewProjetoIds((prev) =>
      prev.includes(projetoId) ? prev.filter((id) => id !== projetoId) : [...prev, projetoId],
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-6xl">
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
                  <Select
                    value={newRole}
                    onValueChange={(v) => setNewRole(v as RoleOption)}
                    disabled={createUser.isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Operador</SelectItem>
                      <SelectItem value="visitante">Visitante</SelectItem>
                      <SelectItem value="admin">Administrador operacional</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="promoter">Promoter</SelectItem>
                      <SelectItem value="lider_colheita">Líder de colheita</SelectItem>
                      <SelectItem value="logistica">Logística</SelectItem>
                      {isPlatformAdmin && (
                        <SelectItem value="platform_admin">Equipa da plataforma</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {appRoleFromOption(newRole) !== 'platform_admin' && (
                  <div className="space-y-2">
                    <Label>Projetos com acesso</Label>
                    <div className="max-h-40 overflow-auto rounded-lg border p-2 space-y-1">
                      {projetosDisponiveis.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-1 py-2">Nenhum projeto disponível para vincular.</p>
                      ) : (
                        projetosDisponiveis.map((projeto) => (
                          <label
                            key={projeto.id}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                          >
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={newProjetoIds.includes(projeto.id)}
                              onChange={() => toggleNewProjeto(projeto.id)}
                              disabled={createUser.isPending}
                            />
                            <span className="min-w-0 flex-1 truncate">{projeto.nome}</span>
                            <span className="text-[10px] uppercase text-muted-foreground">{projeto.tipo}</span>
                          </label>
                        ))
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      O perfil define o que ele pode ver; os projetos definem onde esse acesso vale.
                    </p>
                  </div>
                )}
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
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-card rounded-xl border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-xs font-semibold">Administrador operacional</p>
              <p className="text-[10px] text-muted-foreground">Config, variedades, ciclos, analytics, gestão de usuários</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-xs font-semibold">Operador</p>
              <p className="text-[10px] text-muted-foreground">Dashboard + operações (medições, plantio, colheita, etc.)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-600" />
            <div>
              <p className="text-xs font-semibold">Visitante</p>
              <p className="text-[10px] text-muted-foreground">Visualiza informações e extrai relatórios, sem editar nem acionar</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-600" />
            <div>
              <p className="text-xs font-semibold">Comercial</p>
              <p className="text-[10px] text-muted-foreground">Clientes, pedidos, oportunidades e mensagens comerciais</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-emerald-700" />
            <div>
              <p className="text-xs font-semibold">Promoter</p>
              <p className="text-[10px] text-muted-foreground">Pedidos e acompanhamento de avarias</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-teal-700" />
            <div>
              <p className="text-xs font-semibold">Logística</p>
              <p className="text-[10px] text-muted-foreground">Somente modo entregador das entregas</p>
            </div>
          </div>
          {isPlatformAdmin && (
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="text-xs font-semibold">Equipa da plataforma</p>
                <p className="text-[10px] text-muted-foreground">Contratação de módulos por projeto (além de permissões de admin operacional)</p>
              </div>
            </div>
          )}
        </div>

        {isPlatformAdmin && (
          <div className="mb-6 rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-start gap-2">
              <Layers className="mt-0.5 h-4 w-4 text-violet-600 dark:text-violet-400" />
              <div>
                <p className="text-sm font-semibold">Dono operacional dos projetos</p>
                <p className="text-xs text-muted-foreground">
                  A equipe define quais administradores podem gerir cada projeto. Projetos sem dono ficam sob gestão exclusiva da plataforma.
                </p>
              </div>
            </div>
            {projetosGerenciaveis.length === 0 ? (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Nenhum projeto disponível.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {projetosGerenciaveis.map((projeto) => {
                  const selectedOwner = adminUsers.some((u) => u.id === projeto.criadoPorId)
                    ? String(projeto.criadoPorId)
                    : 'none';
                  return (
                    <div key={projeto.id} className="rounded-lg border bg-background/60 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{projeto.nome}</p>
                          <p className="text-[10px] uppercase text-muted-foreground">
                            {projeto.tipo} · {projeto.status}
                          </p>
                        </div>
                      </div>
                      <Select
                        value={selectedOwner}
                        onValueChange={(value) => handleOwnerChange(projeto, value)}
                        disabled={setProjectOwner.isPending}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Sem dono operacional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem dono operacional</SelectItem>
                          {adminUsers.map((user) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.name || user.email || `Usuário #${user.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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
            {users.map((u) => {
              const userProjetos = Array.isArray((u as { projetos?: UserProjectAccess[] }).projetos)
                ? (u as { projetos: UserProjectAccess[] }).projetos
                : [];
              const linkedProjectIds = new Set(userProjetos.map((p) => p.id));
              const projetosParaAdicionar = projetosDisponiveis.filter((p) => !linkedProjectIds.has(p.id));
              const canManageProjectLinks = u.role !== 'platform_admin';

              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 rounded-xl border bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          u.role === 'platform_admin'
                            ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300'
                            : u.role === 'admin'
                              ? 'bg-amber-100 text-amber-700'
                              : u.role === 'comercial'
                                ? 'bg-emerald-100 text-emerald-700'
                                : u.role === 'visitante'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {u.role === 'platform_admin' ? (
                          <Layers className="h-5 w-5" />
                        ) : u.role === 'admin' ? (
                          <ShieldCheck className="h-5 w-5" />
                        ) : u.role === 'comercial' ? (
                          <Briefcase className="h-5 w-5" />
                        ) : u.role === 'visitante' ? (
                          <Eye className="h-5 w-5" />
                        ) : (
                          <User className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{u.name || 'Sem nome'}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email || 'Sem email'}</p>
                        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Último acesso: {formatDate(u.lastSignedIn)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                  {/* Role selector — conta plataforma só pode ser alterada por outro platform_admin */}
                  {!isPlatformAdmin && u.role === 'platform_admin' ? (
                    <span className="text-xs font-medium text-violet-700 dark:text-violet-300 px-2 py-1.5 rounded-md border border-violet-200 dark:border-violet-800 whitespace-nowrap">
                      Equipa da plataforma
                    </span>
                  ) : (
                    <Select
                      value={roleOptionForUser(u)}
                      onValueChange={(val) => handleRoleChange(u.id, val as RoleOption)}
                      disabled={updateRole.isPending}
                    >
                      <SelectTrigger className="w-[min(100%,11rem)] h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Operador</SelectItem>
                        <SelectItem value="visitante">Visitante</SelectItem>
                        <SelectItem value="admin">Administrador operacional</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="promoter">Promoter</SelectItem>
                        <SelectItem value="lider_colheita">Líder de colheita</SelectItem>
                        <SelectItem value="logistica">Logística</SelectItem>
                        {isPlatformAdmin && (
                          <SelectItem value="platform_admin">Equipa da plataforma</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}

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
                  </div>

                  <div className="rounded-lg border bg-background/60 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-semibold">Projetos vinculados</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {u.role === 'platform_admin' ? 'Acesso global' : `${userProjetos.length} vínculo(s)`}
                      </span>
                    </div>

                    {u.role === 'platform_admin' ? (
                      <p className="text-xs text-muted-foreground">
                        Contas da equipe da plataforma não dependem de vínculo por projeto.
                      </p>
                    ) : (
                      <>
                        {userProjetos.length === 0 ? (
                          <p className="mb-3 rounded-md bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground">
                            Este usuário ainda não está vinculado a nenhum projeto.
                          </p>
                        ) : (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {userProjetos.map((projeto) => (
                              <span
                                key={projeto.id}
                                className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-1 text-[11px]"
                              >
                                <span className="max-w-[14rem] truncate">{projeto.nome}</span>
                                <span className="text-muted-foreground">· {labelProjetoRole(projeto.role)}</span>
                                {canManageProjectLinks && (
                                  <button
                                    type="button"
                                    className="ml-1 text-muted-foreground hover:text-destructive"
                                    title="Remover vínculo"
                                    onClick={() => handleRemoveProjetoFromUser(u, projeto)}
                                    disabled={removeProjetoUser.isPending}
                                  >
                                    ×
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}

                        {canManageProjectLinks && (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Select
                              value={selectedProjetoByUser[u.id] || ''}
                              onValueChange={(value) => setSelectedProjetoByUser((prev) => ({ ...prev, [u.id]: value }))}
                              disabled={addProjetoUser.isPending || projetosParaAdicionar.length === 0}
                            >
                              <SelectTrigger className="h-9 text-xs sm:flex-1">
                                <SelectValue placeholder="Adicionar projeto..." />
                              </SelectTrigger>
                              <SelectContent>
                                {projetosParaAdicionar.map((projeto) => (
                                  <SelectItem key={projeto.id} value={String(projeto.id)}>
                                    {projeto.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => handleAddProjetoToUser(u)}
                              disabled={addProjetoUser.isPending || projetosParaAdicionar.length === 0}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Vincular
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
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
            <li>Defina o perfil: <strong>Visitante</strong> só visualiza, <strong>Operador</strong> executa operações e <strong>Administrador</strong> tem acesso total</li>
            <li>Use o ícone de chave para alterar a senha de um usuário</li>
            <li>Todas as atividades registram quem executou para rastreabilidade</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
