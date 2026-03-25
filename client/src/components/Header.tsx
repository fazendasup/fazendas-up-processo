// ============================================================
// Header — Agronomic Dashboard
// Barra superior com logo, navegação e ações rápidas
// ============================================================

import { Link, useLocation } from 'wouter';
import { useFazenda } from '@/contexts/FazendaContext';
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
  Upload,
  Settings,
  FileDown,
  Menu,
  Leaf,
  CalendarClock,
} from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';

export default function Header() {
  const [location] = useLocation();
  const { exportCSV, backupJSON, importJSON, resetData } = useFazenda();
  const fileRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/ciclos', label: 'Ciclos', icon: CalendarClock },
    { href: '/config', label: 'Configurações', icon: Settings },
  ];

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importJSON(file);
      toast.success('Dados importados com sucesso!');
    }
  };

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja resetar todos os dados? Esta ação não pode ser desfeita.')) {
      resetData();
      toast.success('Dados resetados com sucesso!');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, oklch(0.65 0.19 160), oklch(0.55 0.14 220))' }}>
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-bold leading-tight tracking-tight text-foreground">
              Fazendas Up
            </span>
            <span className="text-[10px] font-medium text-muted-foreground leading-none tracking-wider uppercase">
              Sistema Supervisório
            </span>
          </div>
        </Link>

        {/* Nav Desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex gap-1.5 text-xs"
            onClick={exportCSV}
          >
            <FileDown className="w-3.5 h-3.5" />
            Exportar CSV
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Menu className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Mobile nav */}
              <div className="md:hidden">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className="flex items-center gap-2">
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
              <DropdownMenuItem onClick={() => fileRef.current?.click()} className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Importar Backup
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleReset} className="flex items-center gap-2 text-destructive">
                <RefreshCcw className="w-4 h-4" />
                Resetar Dados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            ref={fileRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </div>
    </header>
  );
}
