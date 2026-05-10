// AdministradorPage — Governança de acesso
// ============================================================

import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useRole } from '@/hooks/useRole';
import { ShieldCheck, Users, Settings, Layers } from 'lucide-react';
import { Link } from 'wouter';

export default function AdministradorPage() {
  const { isPlatformAdmin } = useRole();
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-amber-600 dark:text-amber-400" />
              Administração
            </h1>
            <p className="text-muted-foreground mt-1">Governança de acesso e segurança do sistema</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl border bg-card">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              Usuários e permissões
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Gerencie acessos, perfis e políticas de autorização do sistema.
            </p>
            <Link href="/usuarios">
              <Button>Ir para Usuários</Button>
            </Link>
          </div>
          <div className="p-5 rounded-xl border bg-card">
            <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-2">
              <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Configurações operacionais
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Parâmetros globais, cadastros-base e torres ficam em Configurações.
            </p>
            <Link href="/config">
              <Button variant="outline">Abrir Configurações</Button>
            </Link>
          </div>
          {isPlatformAdmin && (
            <div className="p-5 rounded-xl border bg-card md:col-span-2 lg:col-span-1">
              <h2 className="font-display font-semibold text-lg flex items-center gap-2 mb-2">
                <Layers className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                Módulos da plataforma
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Estoque, automação, inteligência e visão do cultivo por projeto (contratação).
              </p>
              <Link href="/plataforma/modulos">
                <Button variant="outline">Gerir módulos</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
