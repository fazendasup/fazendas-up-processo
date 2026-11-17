import { useEffect, useState } from 'react';
import { setActiveProjetoId } from '@/lib/projeto-header';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Beaker, Loader2, Sprout, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import { homeForUserRole } from '@/lib/accessPolicy';
import { isPwaStandalone, publicPwaRecoveryHref } from '@/lib/pwa';

function normalizeLoginEmail(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F\u2060-\u206F\u3000\uFEFF\s]+/g, "")
    .replace(/[^A-Za-z0-9@._%+-]/g, "")
    .toLowerCase();
}

function loginErrorMessage(message: string | undefined) {
  const raw = message?.trim();
  if (!raw) return 'Erro ao fazer login';
  const lower = raw.toLowerCase();
  if (
    lower.includes('expected pattern') ||
    lower.includes('invalid email') ||
    lower.includes('invalid_string') ||
    lower.includes('invalid_format') ||
    lower.includes('zod')
  ) {
    return 'Email inválido. Confira se foi digitado corretamente.';
  }
  return raw;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [publicRecoveryHref] = useState(() => publicPwaRecoveryHref());

  // Ícone antigo da calculadora abria em `/` → login. Em standalone, volta ao link público.
  useEffect(() => {
    if (!isPwaStandalone() || !publicRecoveryHref) return;
    window.location.replace(publicRecoveryHref);
  }, [publicRecoveryHref]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      setActiveProjetoId(null);
      window.location.href = homeForUserRole(data.user.role, data.comercialPerfil);
    },
    onError: (err) => {
      setError(loginErrorMessage(err.message));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const emailNormalizado = normalizeLoginEmail(email);
    if (!emailNormalizado || !password.trim()) {
      setError('Preencha email e senha');
      return;
    }
    setEmail(emailNormalizado);
    loginMutation.mutate({ email: emailNormalizado, password });
  };

  if (isPwaStandalone() && publicRecoveryHref) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-sm space-y-3">
          <Beaker className="w-8 h-8 text-cyan-600 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Abrindo a calculadora pública (sem login)…
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={publicRecoveryHref}>Abrir agora</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-600 text-white mb-4">
            <Sprout className="w-8 h-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Fazendas Up
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistema Supervisório
          </p>
        </div>

        {publicRecoveryHref ? (
          <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50/80 p-3 text-sm text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950/30 dark:text-cyan-50">
            <p className="font-medium flex items-center gap-1.5">
              <Beaker className="w-4 h-4 shrink-0" />
              Instalou a Calculadora EC/pH?
            </p>
            <p className="text-xs mt-1 text-cyan-900/80 dark:text-cyan-100/80">
              Esse atalho é público e não precisa de login.
            </p>
            <Button asChild size="sm" className="mt-2 h-8" variant="secondary">
              <a href={publicRecoveryHref}>Abrir calculadora sem login</a>
            </Button>
          </div>
        ) : null}

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg">Entrar</CardTitle>
            <CardDescription>Acesse com seu email e senha</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(normalizeLoginEmail(e.target.value))}
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                  disabled={loginMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loginMutation.isPending}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6 space-y-2">
          <span className="block">Solicite seu acesso ao administrador do sistema</span>
          <Link
            href="/privacidade"
            className="block text-emerald-700 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-800"
          >
            Privacidade e dados pessoais
          </Link>
        </p>
      </div>
    </div>
  );
}
