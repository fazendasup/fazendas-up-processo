import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  PUSH_CATEGORIA_DESCRICAO,
  PUSH_CATEGORIA_LABEL,
  type PushCategoria,
} from "@shared/pushNotificacoes";
import {
  criarPushSubscription,
  obterSubscriptionAtual,
  pushSuportadoNoBrowser,
  removerPushSubscription,
  subscriptionToPayload,
} from "@/lib/pushClient";
import { isIosSafari, isPwaStandalone } from "@/lib/pwa";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function PushNotificacoesDialog({ open, onOpenChange }: Props) {
  const utils = trpc.useUtils();
  const statusQ = trpc.push.status.useQuery(undefined, { enabled: open });
  const subscribeMut = trpc.push.subscribe.useMutation();
  const unsubscribeMut = trpc.push.unsubscribe.useMutation();
  const prefsMut = trpc.push.salvarPreferencias.useMutation({
    onSuccess: () => void utils.push.status.invalidate(),
  });
  const testMut = trpc.push.testar.useMutation();

  const [localAtivo, setLocalAtivo] = useState(true);
  const [localCats, setLocalCats] = useState<
    Partial<Record<PushCategoria, boolean>>
  >({});
  const [deviceOn, setDeviceOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!statusQ.data) return;
    setLocalAtivo(statusQ.data.preferencias.ativo);
    setLocalCats(statusQ.data.preferencias.categorias ?? {});
  }, [statusQ.data]);

  useEffect(() => {
    if (!open) return;
    void obterSubscriptionAtual().then((s) => setDeviceOn(Boolean(s)));
  }, [open]);

  const permitidas = statusQ.data?.categoriasPermitidas ?? [];
  const browserOk = pushSuportadoNoBrowser();
  const iosHint = isIosSafari() && !isPwaStandalone();

  const podeAtivar = useMemo(() => {
    return (
      browserOk &&
      Boolean(statusQ.data?.servidorHabilitado) &&
      permitidas.length > 0
    );
  }, [browserOk, statusQ.data?.servidorHabilitado, permitidas.length]);

  async function salvarPrefs() {
    try {
      await prefsMut.mutateAsync({
        ativo: localAtivo,
        categorias: localCats as Record<string, boolean>,
      });
      toast.success("Preferências salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    }
  }

  async function ativarNesteAparelho() {
    if (!statusQ.data?.vapidPublicKey) {
      toast.error("Servidor sem chaves VAPID configuradas.");
      return;
    }
    setBusy(true);
    try {
      const sub = await criarPushSubscription(statusQ.data.vapidPublicKey);
      await subscribeMut.mutateAsync(subscriptionToPayload(sub));
      setDeviceOn(true);
      toast.success("Notificações ativadas neste aparelho");
      void utils.push.status.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ativar");
    } finally {
      setBusy(false);
    }
  }

  async function desativarNesteAparelho() {
    setBusy(true);
    try {
      const endpoint = await removerPushSubscription();
      if (endpoint) {
        await unsubscribeMut.mutateAsync({ endpoint });
      }
      setDeviceOn(false);
      toast.success("Notificações desativadas neste aparelho");
      void utils.push.status.invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao desativar");
    } finally {
      setBusy(false);
    }
  }

  async function enviarTeste() {
    try {
      const r = await testMut.mutateAsync({});
      if (r.enviados > 0) toast.success("Teste enviado");
      else toast.message("Nenhum dispositivo recebeu (ative neste aparelho)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no teste");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações no celular
          </DialogTitle>
          <DialogDescription>
            Só categorias do seu perfil aparecem. Você escolhe o que quer receber.
          </DialogDescription>
        </DialogHeader>

        {statusQ.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {!statusQ.data?.servidorHabilitado && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Web Push ainda não está configurado no servidor (VAPID). Peça ao
                admin para definir as chaves.
              </p>
            )}

            {iosHint && (
              <p className="text-sm text-muted-foreground">
                No iPhone: adicione o app à Tela de Início (Safari → Compartilhar)
                e abra pelo ícone para receber push.
              </p>
            )}

            {!browserOk && (
              <p className="text-sm text-destructive">
                Este navegador não suporta Web Push.
              </p>
            )}

            {permitidas.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Seu perfil não recebe notificações push.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label htmlFor="push-ativo">Receber notificações</Label>
                    <p className="text-xs text-muted-foreground">
                      Liga/desliga todas as categorias do seu perfil
                    </p>
                  </div>
                  <Switch
                    id="push-ativo"
                    checked={localAtivo}
                    onCheckedChange={setLocalAtivo}
                  />
                </div>

                <div className="space-y-3 border rounded-md p-3">
                  {permitidas.map((c) => (
                    <div
                      key={c}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {PUSH_CATEGORIA_LABEL[c]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {PUSH_CATEGORIA_DESCRICAO[c]}
                        </p>
                      </div>
                      <Switch
                        checked={localCats[c] !== false}
                        disabled={!localAtivo}
                        onCheckedChange={(v) =>
                          setLocalCats((prev) => ({ ...prev, [c]: v }))
                        }
                      />
                    </div>
                  ))}
                </div>

                <Button
                  variant="secondary"
                  className="w-full"
                  disabled={prefsMut.isPending}
                  onClick={() => void salvarPrefs()}
                >
                  {prefsMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Salvar preferências
                </Button>
              </>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {deviceOn ? (
                <Button
                  variant="outline"
                  disabled={busy || !podeAtivar}
                  onClick={() => void desativarNesteAparelho()}
                >
                  <BellOff className="h-4 w-4 mr-2" />
                  Desativar neste aparelho
                </Button>
              ) : (
                <Button
                  disabled={busy || !podeAtivar}
                  onClick={() => void ativarNesteAparelho()}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  Ativar neste aparelho
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={!deviceOn || testMut.isPending || permitidas.length === 0}
                onClick={() => void enviarTeste()}
              >
                Enviar notificação de teste
              </Button>
              {statusQ.data && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Dispositivos registrados: {statusQ.data.dispositivos}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
