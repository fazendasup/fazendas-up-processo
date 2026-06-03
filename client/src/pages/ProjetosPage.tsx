import { useEffect, useMemo, useState } from "react";
import type { ProjetoListItem } from "@/contexts/ProjetoContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EMPTY_OPERATIONAL_COUNTS, useProjeto } from "@/contexts/ProjetoContext";
import { useRole } from "@/hooks/useRole";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { FolderKanban, Plus, RefreshCw, ArrowRightLeft, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NOME_PROJETO_FAZENDA_LEGADO } from "@shared/const";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { setActiveProjetoId } from "@/lib/projeto-header";
import { dashboardPathForUserRole } from "@/lib/accessPolicy";

export { NOME_PROJETO_FAZENDA_LEGADO };

/** Navega no tick seguinte para o estado `activeProjetoId` já estar aplicado (evita `ProjetoOnboardingRedirect` voltar a `/projetos`). */
function goHomeAfterProjetoAck(setLocation: (path: string, opts?: { replace?: boolean }) => void, role: string | null | undefined) {
  queueMicrotask(() => setLocation(dashboardPathForUserRole(role)));
}

function labelTipoProjeto(t: string) {
  if (t === "hidroponia") return "Hidroponia";
  if (t === "microverdes") return "Microverdes";
  return "Fazenda vertical";
}

const createProjetoSchema = z.object({
  nome: z.string().min(1, "Indique um nome"),
  tipo: z.enum(["fazenda_vertical", "hidroponia", "microverdes"]),
  descricao: z.string().optional(),
  endereco: z.string().optional(),
  /** Só aplicado quando `tipo` é microverdes. */
  usarCaixaAgua: z.boolean().optional(),
});

type CreateProjetoValues = z.infer<typeof createProjetoSchema>;

const editProjetoSchema = z.object({
  nome: z.string().min(1, "Indique um nome"),
});
type EditProjetoValues = z.infer<typeof editProjetoSchema>;

export default function ProjetosPage() {
  const { projetos, activeProjetoId, switchProjeto, isSwitching } = useProjeto();
  const { isAdmin, isPlatformAdmin, role } = useRole();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const form = useForm<CreateProjetoValues>({
    resolver: zodResolver(createProjetoSchema),
    defaultValues: {
      nome: "",
      tipo: "fazenda_vertical",
      descricao: "",
      endereco: "",
      usarCaixaAgua: false,
    },
  });

  const tipoNovoProjeto = form.watch("tipo");

  const [projetoParaEditar, setProjetoParaEditar] = useState<ProjetoListItem | null>(null);
  const [editUsarCaixaAgua, setEditUsarCaixaAgua] = useState(true);
  const editForm = useForm<EditProjetoValues>({
    resolver: zodResolver(editProjetoSchema),
    defaultValues: { nome: "" },
  });

  useEffect(() => {
    if (projetoParaEditar) {
      editForm.reset({ nome: projetoParaEditar.nome });
      setEditUsarCaixaAgua(projetoParaEditar.usarCaixaAgua);
    }
  }, [projetoParaEditar, editForm]);

  const projetoIds = useMemo(() => projetos.map((p) => p.id), [projetos]);
  const countsQuery = trpc.projetos.operationalCounts.useQuery(
    { projetoIds },
    { enabled: projetoIds.length > 0, staleTime: 30_000 },
  );
  const countsById = countsQuery.data ?? {};

  const projetosComContagens = useMemo(() => {
    return projetos.map((p) => ({
      ...p,
      operationalCounts: countsById[p.id] ?? EMPTY_OPERATIONAL_COUNTS,
    }));
  }, [projetos, countsById]);

  const resyncMutation = trpc.projetos.resyncBootstrap.useMutation({
    onSuccess: async (data) => {
      await utils.projetos.list.invalidate();
      await utils.projetos.operationalCounts.invalidate();
      if (data.ok) {
        toast.success("Vínculos atualizados. Se ainda não vir projetos, aplique a migração no banco.");
      } else {
        toast.error(data.message ?? "Não foi possível sincronizar.");
      }
    },
    onError: (err) => toast.error(err.message || "Erro ao sincronizar"),
  });

  const reassignMutation = trpc.projetos.reassignOperationalData.useMutation({
    onSuccess: async (_, vars) => {
      toast.success("Dados operacionais movidos para o projeto de destino.");
      await utils.projetos.list.invalidate();
      await utils.projetos.operationalCounts.invalidate();
      switchProjeto(vars.toProjetoId);
      goHomeAfterProjetoAck(setLocation, role);
    },
    onError: (err) => toast.error(err.message || "Não foi possível mover os dados"),
  });

  const updateProjetoMutation = trpc.projetos.update.useMutation({
    onSuccess: async () => {
      toast.success("Projeto atualizado");
      await utils.projetos.list.invalidate();
      await utils.projetos.operationalCounts.invalidate();
      await utils.fazenda.loadAll.invalidate();
      setProjetoParaEditar(null);
    },
    onError: (err) => toast.error(err.message || "Não foi possível atualizar"),
  });

  const createMutation = trpc.projetos.create.useMutation({
    onSuccess: async (data) => {
      toast.success("Projeto criado");
      await utils.projetos.list.invalidate();
      await utils.projetos.operationalCounts.invalidate();
      switchProjeto(data.id);
      form.reset({ nome: "", tipo: "fazenda_vertical", descricao: "", endereco: "", usarCaixaAgua: false });
      goHomeAfterProjetoAck(setLocation, role);
    },
    onError: (err) => {
      toast.error(err.message || "Não foi possível criar o projeto");
    },
  });

  const onSubmit = (values: CreateProjetoValues) => {
    createMutation.mutate({
      nome: values.nome.trim(),
      tipo: values.tipo,
      descricao: values.descricao?.trim() || undefined,
      endereco: values.endereco?.trim() || undefined,
      usarCaixaAgua: values.tipo === "microverdes" ? values.usarCaixaAgua ?? false : undefined,
    });
  };

  const sortProjetos = (a: (typeof projetosComContagens)[0], b: (typeof projetosComContagens)[0]) => {
    const legado = (n: string) => n === NOME_PROJETO_FAZENDA_LEGADO;
    if (legado(a.nome) && !legado(b.nome)) return -1;
    if (!legado(a.nome) && legado(b.nome)) return 1;
    return a.nome.localeCompare(b.nome, "pt");
  };

  const projetosOrdenados = useMemo(() => {
    return [...projetosComContagens].sort(sortProjetos);
  }, [projetosComContagens]);

  /** Corrigir dados / merge só entre projetos ativos. */
  const projetosOrdenadosAtivos = useMemo(() => {
    return projetosComContagens.filter((p) => p.status === "ativo").sort(sortProjetos);
  }, [projetosComContagens]);

  const [mergeFromId, setMergeFromId] = useState<string>("");
  const [mergeToId, setMergeToId] = useState<string>("");

  const [projetoArquivar, setProjetoArquivar] = useState<ProjetoListItem | null>(null);
  const [projetoEliminar, setProjetoEliminar] = useState<ProjetoListItem | null>(null);
  const [confirmEliminarNome, setConfirmEliminarNome] = useState("");

  const deactivateMutation = trpc.projetos.deactivate.useMutation({
    onSuccess: async (_, vars) => {
      toast.success("Projeto arquivado. Já não aparece para operadores até ser reativado.");
      await utils.projetos.list.invalidate();
      await utils.projetos.operationalCounts.invalidate();
      if (activeProjetoId === vars.id) {
        const list = await utils.projetos.list.fetch();
        const next = list?.find((r) => r.projeto.status === "ativo")?.projeto.id;
        if (next != null) switchProjeto(next);
        else setActiveProjetoId(null);
      }
      setProjetoArquivar(null);
    },
    onError: (err) => {
      toast.error(err.message || "Não foi possível arquivar");
      setProjetoArquivar(null);
    },
  });

  const reactivateMutation = trpc.projetos.reactivate.useMutation({
    onSuccess: async () => {
      toast.success("Projeto reativado.");
      await utils.projetos.list.invalidate();
      await utils.projetos.operationalCounts.invalidate();
    },
    onError: (err) => toast.error(err.message || "Não foi possível reativar"),
  });

  const deletePermanenteMutation = trpc.projetos.deletePermanente.useMutation({
    onSuccess: async (_, vars) => {
      toast.success("Projeto eliminado definitivamente.");
      await utils.projetos.list.invalidate();
      await utils.projetos.operationalCounts.invalidate();
      await utils.projetos.listagemModulosPlataforma.invalidate();
      if (activeProjetoId === vars.id) {
        const list = await utils.projetos.list.fetch();
        const next = list?.find((r) => r.projeto.status === "ativo")?.projeto.id;
        if (next != null) switchProjeto(next);
        else setActiveProjetoId(null);
      }
      setProjetoEliminar(null);
      setConfirmEliminarNome("");
    },
    onError: (err) => toast.error(err.message || "Não foi possível eliminar"),
  });

  useEffect(() => {
    if (projetosOrdenadosAtivos.length < 2) {
      setMergeFromId("");
      setMergeToId("");
      return;
    }
    setMergeFromId((prev) => {
      if (prev) return prev;
      const sortedByTorres = [...projetosOrdenadosAtivos].sort(
        (a, b) => b.operationalCounts.torres - a.operationalCounts.torres,
      );
      const richest = sortedByTorres[0];
      return richest ? String(richest.id) : "";
    });
    setMergeToId((prev) => {
      if (prev) return prev;
      const sortedByTorres = [...projetosOrdenadosAtivos].sort(
        (a, b) => a.operationalCounts.torres - b.operationalCounts.torres,
      );
      const poorest = sortedByTorres[0];
      return poorest ? String(poorest.id) : "";
    });
  }, [projetosOrdenadosAtivos]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-3xl py-8 space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Meus projetos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              O projeto <strong>{NOME_PROJETO_FAZENDA_LEGADO}</strong> é o que contém os dados que já existiam no sistema
              (após a migração). Em cada linha use <strong>Entrar no painel</strong> para ir ao início com esse projeto
              (se já for o ativo, o botão faz o mesmo). Administradores podem criar um projeto novo (fazenda vertical,
              microverdes ou hidroponia), que começa vazio.
            </p>
          </div>
        </div>

        {projetos.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-muted/20 p-5 text-sm space-y-3">
            <p className="font-medium">Nenhum projeto encontrado para o seu usuário.</p>
            <p className="text-muted-foreground">
              O servidor associa contas ao projeto <strong>Fazenda Vertical Principal</strong> ao arrancar. Se a lista
              continua vazia, tente <strong>sincronizar</strong> abaixo ou aplique a migração:{" "}
              <code className="rounded bg-background px-1.5 py-0.5 text-xs">pnpm db:migrate</code> e reinicie a API.
            </p>
            <div className="flex flex-wrap gap-2">
              {isAdmin ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={resyncMutation.isPending}
                  onClick={() => resyncMutation.mutate()}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${resyncMutation.isPending ? "animate-spin" : ""}`} />
                  Sincronizar vínculos no servidor
                </Button>
              ) : null}
              <Button variant="outline" size="sm" asChild>
                <Link href="/">Voltar ao painel</Link>
              </Button>
            </div>
            {isAdmin ? (
              <p className="text-muted-foreground pt-1 border-t border-border/60">
                Como administrador, pode criar um projeto novo abaixo (fazenda vertical, microverdes ou hidroponia); começa vazio até
                configurar torres ou bancadas — não substitui os dados antigos até migrar para esse projeto.
              </p>
            ) : (
              <p className="text-muted-foreground pt-1 border-t border-border/60">
                Peça a um administrador para o associar a um projeto ou para criar um projeto novo.
              </p>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {projetosOrdenados.map((p) => {
              const ativo = p.id === activeProjetoId && p.status === "ativo";
              const legado = p.nome === NOME_PROJETO_FAZENDA_LEGADO;
              const arquivado = p.status === "inativo";
              return (
                <li
                  key={p.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                    ativo ? "border-primary/50 bg-primary/5" : "border-border/70 bg-card/50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold truncate">{p.nome}</p>
                      {isAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                          aria-label="Editar nome do projeto"
                          onClick={() => setProjetoParaEditar(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {arquivado && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Arquivado
                        </span>
                      )}
                      {legado && (
                        <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
                          Dados originais
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {labelTipoProjeto(p.tipo)} · {p.role}
                      {ativo && <span className="ml-2 text-primary font-medium">· Ativo agora</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground/90 mt-1 font-mono tabular-nums">
                      {p.tipo === "hidroponia" ? (
                        <>
                          Bancadas {p.operationalCounts.bancadas} · Ciclos {p.operationalCounts.ciclos} · Variedades{" "}
                          {p.operationalCounts.variedades} · Planos {p.operationalCounts.planosPlantio}
                        </>
                      ) : (
                        <>
                          Torres {p.operationalCounts.torres} · Andares {p.operationalCounts.andares} · Ciclos{" "}
                          {p.operationalCounts.ciclos} · Caixas {p.operationalCounts.caixasAgua} · Variedades{" "}
                          {p.operationalCounts.variedades} · Planos {p.operationalCounts.planosPlantio}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0 items-center justify-end">
                    {isAdmin && !arquivado && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => setProjetoArquivar(p)}
                      >
                        <Archive className="h-3.5 w-3.5 mr-1.5" />
                        Arquivar
                      </Button>
                    )}
                    {isAdmin && arquivado && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={reactivateMutation.isPending}
                        onClick={() => reactivateMutation.mutate({ id: p.id })}
                      >
                        <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />
                        Reativar
                      </Button>
                    )}
                    {isPlatformAdmin && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="font-medium"
                        onClick={() => {
                          setConfirmEliminarNome("");
                          setProjetoEliminar(p);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Eliminar
                      </Button>
                    )}
                    {arquivado ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled
                        title="Reative o projeto (botão Reativar) para poder entrar no painel."
                      >
                        Arquivado
                      </Button>
                    ) : ativo ? (
                      <Button type="button" size="sm" onClick={() => goHomeAfterProjetoAck(setLocation, role)}>
                        Entrar no painel
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSwitching}
                        onClick={() => {
                          switchProjeto(p.id);
                          goHomeAfterProjetoAck(setLocation, role);
                        }}
                      >
                        Entrar no painel
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {isAdmin && projetosOrdenadosAtivos.length >= 2 && (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/5 p-5 space-y-3">
            <p className="flex items-center gap-2 font-medium text-sm">
              <ArrowRightLeft className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
              Corrigir dados noutro projeto (admin)
            </p>
            <p className="text-sm text-muted-foreground">
              Se o painel mostra <strong>0 torres</strong> mas os dados antigos existem na base, muitas vezes ficaram
              noutro ID de projeto. Confira as contagens acima: escolha <strong>origem</strong> = linha com torres/ciclos
              e <strong>destino</strong> = o projeto onde quer trabalhar (muitas vezes o vazio). Isto atualiza{" "}
              <code className="rounded bg-background px-1 text-xs">projetoId</code> em todas as tabelas operacionais.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-1.5 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground">Origem (de)</label>
                <Select value={mergeFromId} onValueChange={setMergeFromId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Projeto com dados" />
                  </SelectTrigger>
                  <SelectContent>
                    {projetosOrdenadosAtivos.map((p) => (
                      <SelectItem key={`from-${p.id}`} value={String(p.id)}>
                        {p.nome} ({p.operationalCounts.torres} torres)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-[200px]">
                <label className="text-xs font-medium text-muted-foreground">Destino (para)</label>
                <Select value={mergeToId} onValueChange={setMergeToId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Projeto alvo" />
                  </SelectTrigger>
                  <SelectContent>
                    {projetosOrdenadosAtivos.map((p) => (
                      <SelectItem key={`to-${p.id}`} value={String(p.id)}>
                        {p.nome} ({p.operationalCounts.torres} torres)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="border-amber-500/40"
                disabled={
                  reassignMutation.isPending ||
                  !mergeFromId ||
                  !mergeToId ||
                  mergeFromId === mergeToId
                }
                onClick={() => {
                  const fromProjetoId = Number(mergeFromId);
                  const toProjetoId = Number(mergeToId);
                  if (fromProjetoId === toProjetoId) return;
                  reassignMutation.mutate({ fromProjetoId, toProjetoId });
                }}
              >
                {reassignMutation.isPending ? "A mover…" : "Mover dados para o destino"}
              </Button>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="rounded-xl border border-dashed border-border/80 bg-muted/15 p-5 space-y-4">
            <p className="flex items-center gap-2 font-medium text-foreground text-sm">
              <Plus className="h-4 w-4 shrink-0" />
              Novo projeto
            </p>
            <p className="text-sm text-muted-foreground">
              Crie um espaço vazio para fazenda vertical, microverdes (torres até 6 andares, rega manual por padrão) ou
              hidroponia. O projeto herdado com os
              seus dados costuma chamar-se <strong>Fazenda Vertical Principal</strong> (criado na migração ou na inicialização
              do servidor).
            </p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do projeto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Unidade Centro" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col gap-2 sm:flex-row sm:gap-6"
                        >
                          <label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                            <RadioGroupItem value="fazenda_vertical" id="tipo-fv" />
                            <span>Fazenda vertical</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                            <RadioGroupItem value="hidroponia" id="tipo-h" />
                            <span>Hidroponia</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm font-normal cursor-pointer">
                            <RadioGroupItem value="microverdes" id="tipo-mv" />
                            <span>Microverdes</span>
                          </label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {tipoNovoProjeto === "microverdes" && (
                  <FormField
                    control={form.control}
                    name="usarCaixaAgua"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/70 px-3 py-2">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Módulo de caixa d&apos;água</FormLabel>
                          <p className="text-[11px] text-muted-foreground leading-snug">
                            Desligado por defeito (rega manual bandeja a bandeja). Ligue quando tiver rega automática e
                            quiser medições / ligação às torres como na fazenda vertical.
                          </p>
                        </div>
                        <FormControl>
                          <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição (opcional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Notas internas…" rows={2} className="resize-y min-h-[60px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endereco"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Morada ou localização" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "A criar…" : "Criar projeto"}
                </Button>
              </form>
            </Form>
          </div>
        )}

        <Dialog open={!!projetoParaEditar} onOpenChange={(open) => !open && setProjetoParaEditar(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {projetoParaEditar?.tipo === "microverdes" ? "Editar projeto (microverdes)" : "Editar nome do projeto"}
              </DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((vals) => {
                  if (!projetoParaEditar) return;
                  updateProjetoMutation.mutate({
                    id: projetoParaEditar.id,
                    nome: vals.nome.trim(),
                    ...(projetoParaEditar.tipo === "microverdes" ? { usarCaixaAgua: editUsarCaixaAgua } : {}),
                  });
                })}
                className="space-y-4"
              >
                <FormField
                  control={editForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input autoComplete="off" placeholder="Nome do projeto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {projetoParaEditar?.tipo === "microverdes" && (
                  <div className="flex flex-row items-center justify-between rounded-lg border border-border/70 px-3 py-2 gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium">Caixa d&apos;água nas torres</p>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        Quando desligado, o painel omite caixas e medições até voltar a ligar (útil com rega manual).
                      </p>
                    </div>
                    <Switch checked={editUsarCaixaAgua} onCheckedChange={setEditUsarCaixaAgua} />
                  </div>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setProjetoParaEditar(null)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateProjetoMutation.isPending}>
                    {updateProjetoMutation.isPending ? "A guardar…" : "Guardar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!projetoArquivar} onOpenChange={(open) => !open && setProjetoArquivar(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar «{projetoArquivar?.nome}»?</AlertDialogTitle>
              <AlertDialogDescription>
                Os operadores deixam de ver este projeto na lista. Os dados mantêm-se na base e pode reativar o projeto
                aqui quando precisar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
              <Button
                type="button"
                className="bg-amber-600 text-white hover:bg-amber-600/90"
                disabled={deactivateMutation.isPending}
                onClick={() => projetoArquivar && deactivateMutation.mutate({ id: projetoArquivar.id })}
              >
                {deactivateMutation.isPending ? "Arquivando…" : "Arquivar"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog
          open={!!projetoEliminar}
          onOpenChange={(open) => {
            if (!open) {
              setProjetoEliminar(null);
              setConfirmEliminarNome("");
            }
          }}
        >
          <DialogContent className="sm:max-w-md border-destructive/30">
            <DialogHeader>
              <DialogTitle className="text-destructive">Eliminar projeto definitivamente</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Isto apaga o projeto, vínculos de usuários, módulos contratados e <strong>todos</strong> os dados
              operacionais. Não pode ser desfeito. Só a equipa da plataforma pode executar esta ação.
            </p>
            <p className="text-sm">
              Escreva o nome exato do projeto para confirmar:{" "}
              <span className="font-semibold text-foreground">{projetoEliminar?.nome}</span>
            </p>
            <Input
              autoComplete="off"
              placeholder="Nome do projeto"
              value={confirmEliminarNome}
              onChange={(e) => setConfirmEliminarNome(e.target.value)}
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setProjetoEliminar(null);
                  setConfirmEliminarNome("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={
                  !projetoEliminar ||
                  confirmEliminarNome.trim() !== projetoEliminar.nome.trim() ||
                  deletePermanenteMutation.isPending
                }
                onClick={() => {
                  if (!projetoEliminar) return;
                  deletePermanenteMutation.mutate({
                    id: projetoEliminar.id,
                    confirmNome: confirmEliminarNome,
                  });
                }}
              >
                {deletePermanenteMutation.isPending ? "A eliminar…" : "Eliminar para sempre"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
