// ============================================================
// Header v4 — Com controle de acesso por role e login/logout
// ============================================================

import { Link, useLocation } from 'wouter';
import { useFazenda } from '@/contexts/FazendaContext';
import { useFazendaMutations } from '@/hooks/useFazendaMutations';
import { useRole } from '@/hooks/useRole';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  RefreshCcw,
  Download,
  Settings,
  FileDown,
  Menu,
  Leaf,
  CalendarClock,
  Sprout,
  Wrench,
  Users,
  Calendar as CalendarIcon,
  LayoutGrid,
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  BarChart3,
  ClipboardList,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/_core/hooks/useAuth';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: 'admin';
};

export default function Header() {
  const [location] = useLocation();
  const { exportCSV, backupJSON } = useFazenda();
  const mutations = useFazendaMutations();
  const { isAdmin, isLoggedIn } = useRole();
  const { user, logout } = useAuth();

  // Nav items com controle de visibilidade por role
  const allNavItems: NavItem[] = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/germinacao', label: 'Germinação', icon: Sprout },
    { href: '/manutencao', label: 'Manutenção', icon: Wrench },
    { href: '/tarefas', label: 'Tarefas', icon: ClipboardList },
    { href: '/receitas', label: 'Receitas', icon: BookOpen, requiredRole: 'admin' },
    { href: '/planejamento', label: 'Planejamento', icon: CalendarIcon, requiredRole: 'admin' },
    { href: '/capacidade', label: 'Capacidade', icon: LayoutGrid, requiredRole: 'admin' },
    { href: '/analytics', label: 'Analytics', icon: BarChart3, requiredRole: 'admin' },
    { href: '/ciclos', label: 'Ciclos', icon: CalendarClock, requiredRole: 'admin' },
    { href: '/config', label: 'Config', icon: Settings, requiredRole: 'admin' },
    { href: '/usuarios', label: 'Usuários', icon: Users, requiredRole: 'admin' },
  ];

  // Filtrar itens visíveis baseado no role
  const navItems = allNavItems.filter((item) => {
    if (item.requiredRole === 'admin') return isAdmin;
    // Itens operacionais (Germinação, Manutenção, Tarefas) requerem login
    if (item.href !== '/') return isLoggedIn;
    return true; // Dashboard sempre visível
  });

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja resetar todos os dados? Esta ação não pode ser desfeita.')) {
      mutations.reset.mutate(undefined, {
        onSuccess: () => {
          toast.success('Dados resetados! Recriando estrutura...');
          setTimeout(() => mutations.seed.mutate(), 500);
        },
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logout realizado!');
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="container flex items-center justify-between h-14">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, oklch(0.65 0.19 160), oklch(0.55 0.14 220))' }}>
            <Leaf className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-base font-bold leading-tight tracking-tight text-foreground">
              Fazendas Up
            </span>
            <span className="text-[9px] font-medium text-muted-foreground leading-none tracking-wider uppercase">
              Sistema Supervisório
            </span>
          </div>
        </Link>

        {/* Nav Desktop */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* User info / Login */}
          {isLoggedIn ? (
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <User className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span className="max-w-[100px] truncate">{user?.name || 'Usuário'}</span>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex gap-1.5 text-xs h-9"
              asChild
            >
              <a href="/login">
                <LogIn className="w-3.5 h-3.5" />
                Entrar
              </a>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex gap-1.5 text-xs h-9"
            onClick={exportCSV}
          >
            <FileDown className="w-3.5 h-3.5" />
            CSV
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 sm:h-8 sm:w-8">
                <Menu className="w-5 h-5 sm:w-4 sm:h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {/* User info mobile */}
              {isLoggedIn && (
                <>
                  <div className="px-2 py-2 sm:hidden">
                    <div className="flex items-center gap-2">
                      {isAdmin ? (
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                      ) : (
                        <User className="w-4 h-4 text-blue-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{user?.name || 'Usuário'}</p>
                        <p className="text-[10px] text-muted-foreground">{isAdmin ? 'Administrador' : 'Operador'}</p>
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="sm:hidden" />
                </>
              )}

              {/* Mobile nav */}
              <div className="lg:hidden">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild className="py-2.5">
                    <Link href={item.href} className="flex items-center gap-2 text-sm">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </div>

              <DropdownMenuItem onClick={exportCSV} className="flex items-center gap-2 sm:hidden">
                <FileDown className="w-4 h-4" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={backupJSON} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Backup JSON
              </DropdownMenuItem>

              {/* Admin-only actions */}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleReset} className="flex items-center gap-2 text-destructive">
                    <RefreshCcw className="w-4 h-4" />
                    Resetar Dados
                  </DropdownMenuItem>
                </>
              )}

              {/* Login/Logout */}
              <DropdownMenuSeparator />
              {isLoggedIn ? (
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Sair
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <a href="/login" className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
