import { Link } from "wouter";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Privacidade e dados pessoais</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Informações sobre tratamento de dados ao utilizar o sistema Fazendas Up (LGPD — Brasil).
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Texto modelo — personalize contactos e detalhes conforme a sua organização.
        </p>

        <section className="space-y-3 text-sm leading-relaxed text-foreground">
          <h2 className="text-base font-semibold">1. Quem é responsável</h2>
          <p className="text-muted-foreground">
            O responsável pelo tratamento dos dados é a organização que disponibiliza esta instância do sistema
            (nome fantasia, CNPJ e contacto:{" "}
            <span className="font-medium text-foreground">[preencher pelo operador]</span>).
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-base font-semibold text-foreground">2. Que dados podemos tratar</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>Dados de conta (nome, email, identificação interna de utilizador).</li>
            <li>Dados operacionais inseridos na aplicação (produção, cultivo, equipas, etc.).</li>
            <li>Dados técnicos necessários ao funcionamento (sessão, logs operacionais limitados).</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-base font-semibold text-foreground">3. Finalidades</h2>
          <p className="text-muted-foreground">
            Prestação do serviço contratado, autenticação, suporte, melhoria da segurança e cumprimento de obrigações
            legais. <span className="font-medium text-foreground">[Detalhar conforme o seu caso.]</span>
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-base font-semibold text-foreground">4. Direitos dos titulares</h2>
          <p className="text-muted-foreground">
            Nos termos da LGPD, pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade,
            eliminação de dados desnecessários ou excessivos, informação sobre partilhas e revogação do consentimento,
            quando aplicável.
          </p>
          <p className="text-muted-foreground">
            Pedidos: <span className="font-medium text-foreground">[email ou canal definido pelo operador]</span>.
          </p>
        </section>

        <section className="space-y-3 text-sm leading-relaxed">
          <h2 className="text-base font-semibold text-foreground">5. Retenção</h2>
          <p className="text-muted-foreground">
            Os dados são mantidos pelo tempo necessário à finalidade e às obrigações legais.{" "}
            <span className="font-medium text-foreground">[Política de retenção do operador.]</span>
          </p>
        </section>

        <div className="pt-4 border-t border-border">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link href="/login">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
