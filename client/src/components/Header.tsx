// ============================================================
// Header v4 — Com controle de acesso por role e login/logout
// ============================================================

import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useFazenda } from "@/contexts/FazendaContext";
import { useProjeto } from "@/contexts/ProjetoContext";
import { useFazendaMutations } from "@/hooks/useFazendaMutations";
import { useRole } from "@/hooks/useRole";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  RefreshCcw,
  Download,
  Settings,
  FileDown,
  Menu,
  Leaf,
  CalendarClock,
  Wrench,
  Users,
  Calendar as CalendarIcon,
  LayoutGrid,
  LogIn,
  LogOut,
  User,
  Sun,
  Moon,
  ShieldCheck,
  BarChart3,
  Coins,
  BookOpen,
  Package,
  FolderKanban,
  ChevronDown,
  LineChart,
  Settings2,
  Cpu,
  Camera,
  Brain,
  Sparkles,
  Briefcase,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { navPermitidoPorModulo } from "@/lib/projetoModulosNav";
import { canAccessCommercialPath, dashboardPathForUserRole, roleLabel as labelForRole } from "@/lib/accessPolicy";
const FarmAssistantSheet = lazy(() =>
  import(/* @vite-ignore */ "@/components/FarmAssistantSheet").then(m => ({
    default: m.FarmAssistantSheet,
  }))
);
type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: "admin" | "comercial";
  comercialPerfis?: Array<"VENDEDOR" | "PROMOTER" | "LIDER_COLHEITA" | "OPERACOES" | "COMERCIAL" | "GERENTE_COMERCIAL" | "LOGISTICA" | "ADMIN">;
  projetoTipo?: "fazenda_vertical" | "hidroponia";
};

const OPERACAO_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planejamento", label: "Plantio", icon: CalendarIcon },
  { href: "/automacao", label: "Automação", icon: Cpu },
  { href: "/manutencao", label: "Manutenção", icon: Wrench },
  {
    href: "/estoque",
    label: "Estoque",
    icon: Package,
    requiredRole: "comercial",
    comercialPerfis: ["OPERACOES", "COMERCIAL", "GERENTE_COMERCIAL", "ADMIN"],
  },
];

const ANALISE_ADMIN_PREFIX: NavItem[] = [
  {
    href: "/capacidade",
    label: "Capacidade",
    icon: LayoutGrid,
    requiredRole: "admin",
  },
];

const ANALISE_ANALYTICS: NavItem = {
  href: "/analytics",
  label: "Analytics",
  icon: BarChart3,
};

const ANALISE_CUSTOS: NavItem = {
  href: "/custos-producao",
  label: "Custos de produção",
  icon: Coins,
  requiredRole: "comercial",
  comercialPerfis: ["OPERACOES", "COMERCIAL", "GERENTE_COMERCIAL", "ADMIN"],
};

const ANALISE_TODOS: NavItem = {
  href: "/inteligencia",
  label: "Inteligência",
  icon: Brain,
};
const ANALISE_VISAO: NavItem = {
  href: "/visao",
  label: "Visão do cultivo",
  icon: Camera,
};

const COMERCIAL_ITEMS: NavItem[] = [
  {
    href: "/comercial/pedidos",
    label: "Pedidos",
    icon: CalendarClock,
    requiredRole: "comercial",
  },
  {
    href: "/comercial/entregas",
    label: "Entregas",
    icon: Truck,
    requiredRole: "comercial",
    comercialPerfis: ["OPERACOES", "COMERCIAL", "GERENTE_COMERCIAL", "LOGISTICA", "ADMIN"],
  },
  {
    href: "/comercial/entregador",
    label: "Modo entregador",
    icon: Truck,
    requiredRole: "comercial",
    comercialPerfis: ["LOGISTICA"],
  },
  {
    href: "/comercial/dashboard",
    label: "Painel comercial",
    icon: Briefcase,
    requiredRole: "comercial",
    comercialPerfis: ["OPERACOES", "COMERCIAL", "GERENTE_COMERCIAL", "ADMIN"],
  },
  {
    href: "/comercial/acompanhamento-avarias",
    label: "Acompanhamento avarias",
    icon: BarChart3,
    requiredRole: "comercial",
  },
];

const SISTEMA_EXTRAS_ADMIN: NavItem[] = [
  {
    href: "/config",
    label: "Configurações",
    icon: Settings,
    requiredRole: "admin",
  },
  {
    href: "/administracao",
    label: "Administração",
    icon: Users,
    requiredRole: "admin",
  },
];

const SISTEMA_PROCESSO_ITEMS: NavItem[] = [
  {
    href: "/receitas",
    label: "Receitas e cadastros",
    icon: BookOpen,
    comercialPerfis: ["OPERACOES", "COMERCIAL", "GERENTE_COMERCIAL", "ADMIN"],
  },
  {
    href: "/ciclos",
    label: "Ciclos",
    icon: CalendarClock,
    comercialPerfis: ["OPERACOES", "COMERCIAL", "GERENTE_COMERCIAL", "ADMIN"],
  },
];

const PROJETOS_ITEM: NavItem = {
  href: "/projetos",
  label: "Projetos",
  icon: FolderKanban,
};

function pathMatchesNav(location: string, href: string) {
  if (href === "/") return location === "/";
  return location === href || location.startsWith(`${href}/`);
}

function ThemeToggleBar() {
  const { theme, setTheme, switchable } = useTheme();
  if (!switchable || !setTheme) return null;
  return (
    <div
      className="flex items-center rounded-lg border border-border/70 bg-muted/35 p-0.5 shadow-inner"
      role="group"
      aria-label="Tema da interface"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
          theme === "light"
            ? "bg-background text-foreground shadow-sm ring-1 ring-border/80"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
        aria-pressed={theme === "light"}
      >
        <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hidden min-[400px]:inline">Claro</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors",
          theme === "dark"
            ? "bg-background text-foreground shadow-sm ring-1 ring-border/80"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )}
        aria-pressed={theme === "dark"}
      >
        <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="hidden min-[400px]:inline">Escuro</span>
      </button>
    </div>
  );
}

export default function Header() {
  const [farmAssistantOpen, setFarmAssistantOpen] = useState(false);
  const [location] = useLocation();
  const { exportCSV, backupJSON } = useFazenda();
  const mutations = useFazendaMutations();
  const { isAdmin, isComercial, canAccessComercial, canAccessProcesso, isLoggedIn } = useRole();
  const { user, logout } = useAuth();
  const {
    projetos,
    activeProjetoId,
    activeProjeto,
    switchProjeto,
    isSwitching,
    modulosAtivos,
  } = useProjeto();
  const { data: alertResumo } = trpc.inteligencia.resumo.useQuery(undefined, {
    enabled: Boolean(
      isLoggedIn && activeProjetoId && modulosAtivos?.inteligencia
    ),
    refetchInterval: 60000,
  });
  const comercialMe = trpc.comercial.pedidos.me.useQuery(undefined, {
    enabled: Boolean(isLoggedIn && activeProjetoId && isComercial && modulosAtivos?.comercial),
    staleTime: 60_000,
  });
  const comercialPerfil = isAdmin ? "ADMIN" : (comercialMe.data?.perfil ?? null);

  const operacaoItems = useMemo(() => {
    if (!isLoggedIn || activeProjetoId == null || (!canAccessProcesso && !canAccessComercial)) return [] as NavItem[];
    return OPERACAO_ITEMS.filter(item => {
      if (!canAccessProcesso && item.requiredRole !== "comercial") return false;
      if (item.requiredRole === "admin" && !isAdmin) return false;
      if (item.requiredRole === "comercial" && !canAccessComercial)
        return false;
      if (item.comercialPerfis && !isAdmin && (!comercialPerfil || !item.comercialPerfis.includes(comercialPerfil as any))) return false;
      if (item.projetoTipo != null) {
        if (!activeProjeto || activeProjeto.tipo !== item.projetoTipo)
          return false;
      }
      if (!navPermitidoPorModulo(item.href, modulosAtivos)) return false;
      return true;
    });
  }, [
    canAccessComercial,
    canAccessProcesso,
    comercialPerfil,
    isAdmin,
    isLoggedIn,
    activeProjeto?.tipo,
    activeProjetoId,
    modulosAtivos,
  ]);

  const analiseItems = useMemo(() => {
    if (!isLoggedIn || activeProjetoId == null || (!canAccessProcesso && !canAccessComercial)) return [] as NavItem[];
    const list: NavItem[] = [];
    if (isAdmin) list.push(...ANALISE_ADMIN_PREFIX);
    if (canAccessProcesso) list.push(ANALISE_ANALYTICS);
    if (!isComercial && canAccessProcesso) {
      list.push(ANALISE_TODOS);
      list.push(ANALISE_VISAO);
    }
    if (canAccessComercial) list.push(ANALISE_CUSTOS);
    return list.filter(item => {
      if (item.requiredRole === "admin" && !isAdmin) return false;
      if (item.requiredRole === "comercial" && !canAccessComercial)
        return false;
      if (item.comercialPerfis && !isAdmin && (!comercialPerfil || !item.comercialPerfis.includes(comercialPerfil as any))) return false;
      if (item.requiredRole === "comercial" && !canAccessCommercialPath(item.href, comercialPerfil)) return false;
      if (!navPermitidoPorModulo(item.href, modulosAtivos)) return false;
      return true;
    });
  }, [
    canAccessComercial,
    canAccessProcesso,
    comercialPerfil,
    isAdmin,
    isComercial,
    isLoggedIn,
    activeProjetoId,
    modulosAtivos,
  ]);

  const comercialItems = useMemo(() => {
    if (!isLoggedIn || activeProjetoId == null || !canAccessComercial)
      return [] as NavItem[];
    return COMERCIAL_ITEMS.filter(item => {
      if (item.comercialPerfis && !isAdmin && (!comercialPerfil || !item.comercialPerfis.includes(comercialPerfil as any))) return false;
      if (!canAccessCommercialPath(item.href, comercialPerfil)) return false;
      return navPermitidoPorModulo(item.href, modulosAtivos);
    });
  }, [activeProjetoId, canAccessComercial, comercialPerfil, isAdmin, isLoggedIn, modulosAtivos]);

  const sistemaItems = useMemo(() => {
    if (!isLoggedIn) return [] as NavItem[];
    const list: NavItem[] = isAdmin ? [PROJETOS_ITEM] : [];
    if (activeProjetoId == null) return list;
    if (canAccessProcesso || canAccessComercial) list.push(...SISTEMA_PROCESSO_ITEMS);
    if (isAdmin) list.push(...SISTEMA_EXTRAS_ADMIN);
    return list.filter(item => {
      if (item.requiredRole === "admin" && !isAdmin) return false;
      if (item.comercialPerfis && isComercial && (!comercialPerfil || !item.comercialPerfis.includes(comercialPerfil as any))) return false;
      if (isComercial && !canAccessCommercialPath(item.href, comercialPerfil)) return false;
      if (item.projetoTipo != null) {
        if (!activeProjeto || activeProjeto.tipo !== item.projetoTipo)
          return false;
      }
      return true;
    });
  }, [canAccessComercial, canAccessProcesso, comercialPerfil, isAdmin, isComercial, isLoggedIn, activeProjeto?.tipo, activeProjetoId]);

  const analiseGroupActive = useMemo(
    () => analiseItems.some(item => pathMatchesNav(location, item.href)),
    [location, analiseItems]
  );
  const comercialGroupActive = useMemo(
    () => comercialItems.some(item => pathMatchesNav(location, item.href)),
    [location, comercialItems]
  );
  const sistemaGroupActive = useMemo(
    () => sistemaItems.some(item => pathMatchesNav(location, item.href)),
    [location, sistemaItems]
  );

  const handleReset = () => {
    if (
      window.confirm(
        "Tem certeza que deseja resetar todos os dados? Esta ação não pode ser desfeita."
      )
    ) {
      mutations.reset.mutate(undefined, {
        onSuccess: () => {
          toast.success("Dados resetados! Recriando estrutura...");
          setTimeout(() => mutations.seed.mutate(), 500);
        },
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logout realizado!");
    window.location.href = "/login";
  };

  const roleLabel = labelForRole(user?.role, comercialPerfil);
  const displayName = user?.name?.trim() || "Usuário";
  /** Evita "Administrador" em cima e "ADMINISTRADOR" embaixo quando o nome já é o papel */
  const showRoleLine = displayName.toLowerCase() !== roleLabel.toLowerCase();

  return (
    <header className="app-header-shell">
      <div className="app-header-toolbar flex h-[3.25rem] w-full min-w-0 max-w-full flex-nowrap items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:thin]">
        {/* Logo */}
        <Link
          href={activeProjetoId != null ? dashboardPathForUserRole(user?.role) : "/projetos"}
          className="flex items-center gap-2 no-underline shrink-0 group"
        >
          <div className="app-logo-mark w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.03]">
            <Leaf className="w-[18px] h-[18px] text-white drop-shadow-sm" />
          </div>
          <div className="hidden sm:flex flex-col min-w-max">
            <span className="font-display text-xs font-bold leading-tight text-foreground">
              Fazendas Up
            </span>
            <span className="text-[7px] font-medium text-muted-foreground leading-none tracking-wider uppercase">
              Sistema Supervisório
            </span>
          </div>
        </Link>

        {isLoggedIn && activeProjetoId != null && activeProjeto && (
          <div className="hidden sm:flex shrink-0 items-center gap-2 min-w-0 max-w-[min(28vw,9.5rem)] md:max-w-[min(36vw,12rem)] 2xl:max-w-[min(40vw,14rem)]">
            {projetos.length > 1 ? (
              <Select
                value={String(activeProjetoId)}
                onValueChange={v => switchProjeto(Number(v))}
                disabled={isSwitching}
              >
                <SelectTrigger
                  size="sm"
                  className="h-8 w-[min(10rem,40vw)] shrink-0"
                  aria-label="Trocar projeto"
                >
                  <SelectValue placeholder="Trocar" />
                </SelectTrigger>
                <SelectContent>
                  {projetos.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span
                className="h-8 max-w-[min(11rem,42vw)] truncate rounded-md border border-border/70 bg-muted/25 px-2.5 text-xs font-medium leading-8 text-foreground"
                title={activeProjeto.nome}
              >
                {activeProjeto.nome}
              </span>
            )}
          </div>
        )}

        {/* Nav em linha só a partir de 2xl: iPad Pro paisagem (~1366px) fica abaixo de 1536px e esmagava a barra; menu ☰ até lá. */}
        <nav className="hidden 2xl:flex max-w-full min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto overflow-y-visible py-0.5 [scrollbar-width:thin]">
          {operacaoItems.map(item => {
            const isActive = pathMatchesNav(location, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "app-nav-pill no-underline inline-flex items-center",
                  isActive
                    ? "app-nav-pill-active"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                )}
              >
                <item.icon className="w-3 h-3" />
                <span className="hidden 2xl:inline">{item.label}</span>
              </Link>
            );
          })}

          {comercialItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "app-nav-pill",
                    comercialGroupActive
                      ? "app-nav-pill-active"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  )}
                  aria-haspopup="menu"
                >
                  <Briefcase className="w-3 h-3" />
                  <span className="hidden 2xl:inline">Comercial</span>
                  <ChevronDown className="w-2.5 h-2.5 hidden 2xl:inline opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {comercialItems.map(item => {
                  const sub = pathMatchesNav(location, item.href);
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex w-full items-center gap-2 cursor-pointer",
                          sub && "bg-accent/40"
                        )}
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {analiseItems.length > 0 &&
            (analiseItems.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "app-nav-pill",
                      analiseGroupActive
                        ? "app-nav-pill-active"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                    aria-haspopup="menu"
                  >
                    <LineChart className="w-3 h-3" />
                    <span className="hidden 2xl:inline">Análise</span>
                    <ChevronDown className="w-2.5 h-2.5 hidden 2xl:inline opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {analiseItems.map(item => {
                    const sub = pathMatchesNav(location, item.href);
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex w-full items-center gap-2 cursor-pointer",
                            sub && "bg-accent/40"
                          )}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.href === "/inteligencia" &&
                            alertResumo &&
                            alertResumo.total > 0 && (
                              <span
                                className={`ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white ${
                                  alertResumo.criticos > 0
                                    ? "bg-red-500 animate-pulse"
                                    : alertResumo.altos > 0
                                      ? "bg-amber-500"
                                      : "bg-blue-500"
                                }`}
                              >
                                {alertResumo.total}
                              </span>
                            )}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              (() => {
                const a0 = analiseItems[0];
                const AIcon = a0.icon;
                return (
                  <Link
                    key={a0.href}
                    href={a0.href}
                    className={cn(
                      "app-nav-pill no-underline inline-flex items-center",
                      pathMatchesNav(location, a0.href)
                        ? "app-nav-pill-active"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    <AIcon className="w-3 h-3" />
                    <span className="hidden 2xl:inline">{a0.label}</span>
                    {a0.href === "/inteligencia" &&
                      alertResumo &&
                      alertResumo.total > 0 && (
                        <span
                          className={`ml-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white ${
                            alertResumo.criticos > 0
                              ? "bg-red-500 animate-pulse"
                              : alertResumo.altos > 0
                                ? "bg-amber-500"
                                : "bg-blue-500"
                          }`}
                        >
                          {alertResumo.total}
                        </span>
                      )}
                  </Link>
                );
              })()
            ))}

          {sistemaItems.length > 0 &&
            (sistemaItems.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "app-nav-pill",
                      sistemaGroupActive
                        ? "app-nav-pill-active"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                    aria-haspopup="menu"
                  >
                    <Settings2 className="w-3 h-3" />
                    <span className="hidden 2xl:inline">Sistema</span>
                    <ChevronDown className="w-2.5 h-2.5 hidden 2xl:inline opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {sistemaItems.map(item => {
                    const sub = pathMatchesNav(location, item.href);
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex w-full items-center gap-2 cursor-pointer",
                            sub && "bg-accent/40"
                          )}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              (() => {
                const s0 = sistemaItems[0];
                const SIcon = s0.icon;
                return (
                  <Link
                    key={s0.href}
                    href={s0.href}
                    className={cn(
                      "app-nav-pill no-underline inline-flex items-center",
                      pathMatchesNav(location, s0.href)
                        ? "app-nav-pill-active"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    <SIcon className="w-3 h-3" />
                    <span className="hidden 2xl:inline">{s0.label}</span>
                  </Link>
                );
              })()
            ))}
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Perfil + tipo de usuário + tema */}
          {isLoggedIn ? (
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-2.5 py-1.5 max-w-[min(100vw,220px)]">
                {isAdmin ? (
                  <ShieldCheck
                    className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden
                  />
                ) : (
                  <User className="w-4 h-4 shrink-0 text-primary" aria-hidden />
                )}
                <div className="min-w-0 flex flex-col leading-tight">
                  <span className="truncate text-xs font-medium text-foreground">
                    {displayName}
                  </span>
                  {showRoleLine && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {roleLabel}
                    </span>
                  )}
                </div>
              </div>
              <ThemeToggleBar />
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <ThemeToggleBar />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-9"
                asChild
              >
                <a href="/login">
                  <LogIn className="w-3.5 h-3.5" />
                  Entrar
                </a>
              </Button>
            </div>
          )}

          {isLoggedIn && activeProjetoId != null && canAccessProcesso && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden 2xl:flex gap-1.5 text-xs h-9"
              onClick={() => setFarmAssistantOpen(true)}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Assistente
            </Button>
          )}

          {canAccessProcesso && (
            <Button
              variant="outline"
              size="sm"
              className="hidden 2xl:flex gap-1.5 text-xs h-9"
              onClick={exportCSV}
            >
              <FileDown className="w-3.5 h-3.5" />
              CSV
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10 sm:h-8 sm:w-8"
              >
                <Menu className="w-5 h-5 sm:w-4 sm:h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {/* Tema + perfil (mobile) */}
              <div className="px-2 py-2 sm:hidden space-y-2">
                <div className="flex justify-center">
                  <ThemeToggleBar />
                </div>
                {isLoggedIn && (
                  <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/25 px-2 py-2">
                    {isAdmin ? (
                      <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <User className="w-4 h-4 shrink-0 text-primary" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {displayName}
                      </p>
                      {showRoleLine && (
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {roleLabel}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Até 2xl: navegação principal no ☰ (tablets e laptops estreitos). */}
              <div className="2xl:hidden">
                {isLoggedIn && (
                  <>
                    {activeProjetoId != null && canAccessProcesso && (
                      <DropdownMenuItem
                        className="flex items-center gap-2 py-2.5"
                        onClick={() => setFarmAssistantOpen(true)}
                      >
                        <Sparkles className="w-4 h-4" />
                        Assistente IA
                      </DropdownMenuItem>
                    )}
                    {operacaoItems.map(item => {
                      const PIcon = item.icon;
                      return (
                        <DropdownMenuItem
                          key={item.href}
                          asChild
                          className="py-2.5"
                        >
                          <Link
                            href={item.href}
                            className="flex items-center gap-2 text-sm"
                          >
                            <PIcon className="w-4 h-4" />
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                    {comercialItems.length > 0 && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="py-2.5">
                          <Briefcase className="w-4 h-4" />
                          <span>Comercial</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {comercialItems.map(item => {
                            const CIcon = item.icon;
                            return (
                              <DropdownMenuItem key={item.href} asChild>
                                <Link
                                  href={item.href}
                                  className="flex w-full items-center gap-2 text-sm"
                                >
                                  <CIcon className="w-4 h-4 shrink-0" />
                                  <span className="flex-1">{item.label}</span>
                                </Link>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}
                    {analiseItems.length > 1 && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="py-2.5">
                          <LineChart className="w-4 h-4" />
                          <span>Análise</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {analiseItems.map(item => {
                            const SIcon = item.icon;
                            return (
                              <DropdownMenuItem key={item.href} asChild>
                                <Link
                                  href={item.href}
                                  className="flex w-full items-center gap-2 text-sm"
                                >
                                  <SIcon className="w-4 h-4 shrink-0" />
                                  <span className="flex-1">{item.label}</span>
                                  {item.href === "/inteligencia" &&
                                    alertResumo &&
                                    alertResumo.total > 0 && (
                                      <span
                                        className={`ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white ${
                                          alertResumo.criticos > 0
                                            ? "bg-red-500"
                                            : alertResumo.altos > 0
                                              ? "bg-amber-500"
                                              : "bg-blue-500"
                                        }`}
                                      >
                                        {alertResumo.total}
                                      </span>
                                    )}
                                </Link>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}
                    {analiseItems.length === 1 &&
                      (() => {
                        const a = analiseItems[0];
                        const Ic = a.icon;
                        return (
                          <DropdownMenuItem
                            key={a.href}
                            asChild
                            className="py-2.5"
                          >
                            <Link
                              href={a.href}
                              className="flex items-center gap-2 text-sm"
                            >
                              <Ic className="w-4 h-4" />
                              {a.label}
                              {a.href === "/inteligencia" &&
                                alertResumo &&
                                alertResumo.total > 0 && (
                                  <span
                                    className={`ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white ${
                                      alertResumo.criticos > 0
                                        ? "bg-red-500"
                                        : alertResumo.altos > 0
                                          ? "bg-amber-500"
                                          : "bg-blue-500"
                                    }`}
                                  >
                                    {alertResumo.total}
                                  </span>
                                )}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })()}
                    {sistemaItems.length > 1 && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="py-2.5">
                          <Settings2 className="w-4 h-4" />
                          <span>Sistema</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {sistemaItems.map(item => {
                            const SIcon = item.icon;
                            return (
                              <DropdownMenuItem key={item.href} asChild>
                                <Link
                                  href={item.href}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <SIcon className="w-4 h-4" />
                                  {item.label}
                                </Link>
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}
                    {sistemaItems.length === 1 &&
                      (() => {
                        const s = sistemaItems[0];
                        const SsIcon = s.icon;
                        return (
                          <DropdownMenuItem
                            key={s.href}
                            asChild
                            className="py-2.5"
                          >
                            <Link
                              href={s.href}
                              className="flex items-center gap-2 text-sm"
                            >
                              <SsIcon className="w-4 h-4" />
                              {s.label}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })()}
                    <DropdownMenuSeparator />
                  </>
                )}
              </div>

              {canAccessProcesso && (
                <>
                  <DropdownMenuItem
                    onClick={exportCSV}
                    className="flex items-center gap-2 2xl:hidden"
                  >
                    <FileDown className="w-4 h-4" />
                    Exportar CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={backupJSON}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Backup JSON
                  </DropdownMenuItem>
                </>
              )}

              {/* Admin-only actions */}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleReset}
                    className="flex items-center gap-2 text-destructive"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Resetar Dados
                  </DropdownMenuItem>
                </>
              )}

              {/* Login/Logout */}
              <DropdownMenuSeparator />
              {isLoggedIn ? (
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="flex items-center gap-2"
                >
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

      {isLoggedIn && activeProjetoId != null && (
        <Suspense fallback={null}>
          <FarmAssistantSheet
            open={farmAssistantOpen}
            onOpenChange={setFarmAssistantOpen}
          />
        </Suspense>
      )}
    </header>
  );
}
