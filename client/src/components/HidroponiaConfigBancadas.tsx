import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import {
  Building2,
  Droplets,
  Edit2,
  Plus,
  Power,
  RotateCcw,
  Save,
  Settings,
  Share2,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { FASES_CONFIG, type Fase } from "@/lib/types";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { useFazenda } from "@/contexts/FazendaContext";
import { useFazendaMutations } from "@/hooks/useFazendaMutations";

type BancadaRow = inferRouterOutputs<AppRouter>["bancadas"]["list"][number];

const formSchema = z.object({
  nome: z.string().min(1, "Indique um nome"),
  fase: z.enum(["mudas", "vegetativa", "maturacao"]),
  codigo: z.string().optional(),
  quantidadeCaixas: z
    .string()
    .min(1)
    .refine((s) => Number.isFinite(Number(s)) && parseInt(s, 10) >= 1, "Mínimo 1"),
  tipoCultivo: z.string().optional(),
  comprimentoMetros: z.string().optional(),
  compartilhada: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const fases: Fase[] = ["mudas", "vegetativa", "maturacao"];

const defaultForm: FormValues = {
  nome: "",
  fase: "vegetativa",
  codigo: "",
  quantidadeCaixas: "1",
  tipoCultivo: "",
  comprimentoMetros: "",
  compartilhada: false,
};

export default function HidroponiaConfigBancadas() {
  const { data } = useFazenda();
  const mutations = useFazendaMutations();
  const utils = trpc.useUtils();
  const listQuery = trpc.bancadas.list.useQuery();
  const [configVersion, setConfigVersion] = useState(0);
  const [showNewBancada, setShowNewBancada] = useState(false);
  const [editing, setEditing] = useState<BancadaRow | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const createForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultForm,
  });

  useEffect(() => {
    if (showNewBancada) {
      createForm.reset(defaultForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset só ao abrir o diálogo
  }, [showNewBancada]);

  const createMutation = trpc.bancadas.create.useMutation({
    onSuccess: async () => {
      toast.success("Bancada criada");
      await utils.bancadas.list.invalidate();
      setShowNewBancada(false);
      createForm.reset(defaultForm);
    },
    onError: (e) => toast.error(e.message || "Erro ao criar"),
  });

  const updateMutation = trpc.bancadas.update.useMutation({
    onSuccess: async () => {
      toast.success("Bancada atualizada");
      await utils.bancadas.list.invalidate();
      setEditing(null);
    },
    onError: (e) => toast.error(e.message || "Erro ao atualizar"),
  });

  const deleteMutation = trpc.bancadas.delete.useMutation({
    onSuccess: async () => {
      toast.success("Bancada removida");
      await utils.bancadas.list.invalidate();
      setShowDeleteConfirm(null);
    },
    onError: (e) => toast.error(e.message || "Erro ao remover"),
  });

  const updateQtdMutation = trpc.bancadas.updateQuantidadeCaixas.useMutation({
    onSuccess: async () => {
      toast.success("Quantidade atualizada");
      await utils.bancadas.list.invalidate();
    },
    onError: (e) => toast.error(e.message || "Erro"),
  });

  const handleSaveConfig = (fase: Fase, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ecMin = parseFloat(fd.get("ecMin") as string);
    const ecMax = parseFloat(fd.get("ecMax") as string);
    const phMin = parseFloat(fd.get("phMin") as string);
    const phMax = parseFloat(fd.get("phMax") as string);

    if (isNaN(ecMin) || isNaN(ecMax) || isNaN(phMin) || isNaN(phMax)) {
      toast.error("Preencha todos os campos corretamente");
      return;
    }

    const cfg = FASES_CONFIG[fase];
    mutations.upsertFaseConfig.mutate({
      fase,
      label: cfg.label,
      ecMin,
      ecMax,
      phMin,
      phMax,
      cor: cfg.cor,
      corLight: cfg.corLight,
      icon: cfg.icon,
    });
    setConfigVersion((v) => v + 1);
    toast.success(`Configurações de ${FASES_CONFIG[fase].label} salvas!`);
  };

  const handleResetConfig = () => {
    if (!window.confirm("Restaurar parâmetros EC/pH ao padrão?")) return;
    fases.forEach((fase) => {
      const cfg = FASES_CONFIG[fase];
      mutations.upsertFaseConfig.mutate({
        fase,
        label: cfg.label,
        ecMin: cfg.ecMin,
        ecMax: cfg.ecMax,
        phMin: cfg.phMin,
        phMax: cfg.phMax,
        cor: cfg.cor,
        corLight: cfg.corLight,
        icon: cfg.icon,
      });
    });
    setConfigVersion((v) => v + 1);
    toast.success("Parâmetros restaurados.");
  };

  const badgeClass = (fase: Fase) =>
    fase === "mudas" ? "badge-mudas" : fase === "vegetativa" ? "badge-vegetativa" : "badge-maturacao";
  const cardClass = (fase: Fase) =>
    fase === "mudas" ? "card-mudas" : fase === "vegetativa" ? "card-vegetativa" : "card-maturacao";

  const onCreateSubmit = (v: FormValues) => {
    createMutation.mutate({
      nome: v.nome.trim(),
      fase: v.fase,
      codigo: v.codigo?.trim() || undefined,
      quantidadeCaixas: parseInt(v.quantidadeCaixas, 10),
      tipoCultivo: v.tipoCultivo?.trim() || undefined,
      comprimentoMetros: v.comprimentoMetros?.trim() || undefined,
      compartilhada: v.compartilhada,
    });
  };

  const rows = listQuery.data ?? [];

  return (
    <main className="container py-6 max-w-4xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-600 shrink-0" />
            Hidroponia — parâmetros EC/pH por fase e cadastro de bancadas (equivalente às torres na fazenda vertical).
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0" onClick={handleResetConfig}>
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar padrão (EC/pH)
        </Button>
      </div>

      <div className="space-y-4 mb-8">
        {fases.map((fase, i) => {
          const config = data.fasesConfig?.[fase] || FASES_CONFIG[fase];
          return (
            <motion.div
              key={`${fase}-${configVersion}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-card rounded-xl shadow-sm border overflow-hidden ${cardClass(fase)}`}
            >
              <div className="p-3 border-b flex items-center gap-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badgeClass(fase)}`}>
                  {FASES_CONFIG[fase].icon} {FASES_CONFIG[fase].label}
                </span>
                <span className="text-[10px] text-muted-foreground">Parâmetros de referência EC/pH</span>
              </div>
              <form onSubmit={(e) => handleSaveConfig(fase, e)} className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <Label className="text-xs">EC Mín</Label>
                    <Input
                      name="ecMin"
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      defaultValue={config.ecMin}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">EC Máx</Label>
                    <Input
                      name="ecMax"
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      defaultValue={config.ecMax}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">pH Mín</Label>
                    <Input
                      name="phMin"
                      type="number"
                      step="0.1"
                      min="0"
                      max="14"
                      defaultValue={config.phMin}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs">pH Máx</Label>
                    <Input
                      name="phMax"
                      type="number"
                      step="0.1"
                      min="0"
                      max="14"
                      defaultValue={config.phMax}
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" size="sm" className="gap-1.5 text-xs">
                  <Save className="w-3.5 h-3.5" />
                  Salvar
                </Button>
              </form>
            </motion.div>
          );
        })}
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-600" />
              Bancadas
            </h2>
            <p className="text-xs text-muted-foreground">Cadastro e ativação de bancadas do sistema.</p>
          </div>
          <Dialog open={showNewBancada} onOpenChange={setShowNewBancada}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 text-xs">
                <Plus className="w-3.5 h-3.5" />
                Nova bancada
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar bancada</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex.: Linha A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="fase"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fase</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {fases.map((f) => (
                              <SelectItem key={f} value={f}>
                                {FASES_CONFIG[f].label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={createForm.control}
                      name="codigo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código (opcional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="quantidadeCaixas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>N.º de caixas</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={createForm.control}
                    name="tipoCultivo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de cultivo (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="comprimentoMetros"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comprimento (m) (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="compartilhada"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-lg border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                        </FormControl>
                        <div className="space-y-1 leading-snug">
                          <FormLabel className="font-normal cursor-pointer">Bancada compartilhada</FormLabel>
                          <p className="text-[11px] text-muted-foreground">
                            Uma linha ou circuito comum alimenta várias caixas (nutriente compartilhado entre elas).
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowNewBancada(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "A criar…" : "Criar bancada"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {listQuery.isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-4 rounded-lg border ${
                b.ativa ? "bg-card border-border" : "bg-muted/50 border-muted-foreground/20 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{b.nome}</h3>
                  <p className="text-xs text-muted-foreground">
                    {FASES_CONFIG[b.fase as Fase]?.label ?? b.fase}
                    {b.codigo && <span className="font-mono ml-1">{b.codigo}</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{b.slug}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Boolean(b.compartilhada) && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-400">
                        <Share2 className="w-3 h-3" />
                        Compartilhada
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                    b.ativa ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                  }`}
                >
                  {b.ativa ? "Ativa" : "Inativa"}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Caixas:{" "}
                <Input
                  type="number"
                  min={1}
                  className="inline-flex w-16 h-7 text-xs mx-1"
                  defaultValue={b.quantidadeCaixas}
                  key={`q-${b.id}-${b.quantidadeCaixas}`}
                  disabled={updateQtdMutation.isPending}
                  onBlur={(e) => {
                    const n = parseInt(e.target.value, 10);
                    if (!Number.isFinite(n) || n < 1 || n === b.quantidadeCaixas) return;
                    updateQtdMutation.mutate({ id: b.id, quantidadeCaixas: n });
                  }}
                />
              </p>
              <div className="flex gap-2 flex-wrap">
                <Dialog
                  open={editing?.id === b.id}
                  onOpenChange={(open) => {
                    if (open) setEditing(b);
                    else setEditing(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 min-w-[5rem]">
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Editar bancada</DialogTitle>
                    </DialogHeader>
                    {editing?.id === b.id && (
                      <EditBancadaForm
                        key={editing.id}
                        b={editing}
                        onCancel={() => setEditing(null)}
                        onSave={(vals) => {
                          updateMutation.mutate({
                            id: editing.id,
                            nome: vals.nome.trim(),
                            fase: vals.fase,
                            codigo: vals.codigo?.trim() || null,
                            quantidadeCaixas: parseInt(vals.quantidadeCaixas, 10),
                            tipoCultivo: vals.tipoCultivo?.trim() || null,
                            comprimentoMetros: vals.comprimentoMetros?.trim() || null,
                            compartilhada: vals.compartilhada,
                            ativa: editing.ativa,
                            status: editing.status,
                          });
                        }}
                        pending={updateMutation.isPending}
                      />
                    )}
                  </DialogContent>
                </Dialog>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1 min-w-[5rem]"
                  onClick={() => updateMutation.mutate({ id: b.id, ativa: !b.ativa })}
                  disabled={updateMutation.isPending}
                >
                  <Power className="w-3 h-3" />
                  {b.ativa ? "Desativar" : "Ativar"}
                </Button>
                <Dialog
                  open={showDeleteConfirm === b.id}
                  onOpenChange={(open) => {
                    if (!open) setShowDeleteConfirm(null);
                  }}
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => setShowDeleteConfirm(b.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        Remover bancada?
                      </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                      Tem a certeza que deseja remover <strong>{b.nome}</strong>?
                    </p>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                        Cancelar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => deleteMutation.mutate({ id: b.id })}
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? "A remover…" : "Remover"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}

function EditBancadaForm({
  b,
  onCancel,
  onSave,
  pending,
}: {
  b: BancadaRow;
  onCancel: () => void;
  onSave: (v: FormValues) => void;
  pending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: b.nome,
      fase: b.fase as FormValues["fase"],
      codigo: b.codigo ?? "",
      quantidadeCaixas: String(b.quantidadeCaixas),
      tipoCultivo: b.tipoCultivo ?? "",
      comprimentoMetros: b.comprimentoMetros != null ? String(b.comprimentoMetros) : "",
      compartilhada: Boolean(b.compartilhada),
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fase"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fase</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fases.map((f) => (
                    <SelectItem key={f} value={f}>
                      {FASES_CONFIG[f].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="codigo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantidadeCaixas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Caixas</FormLabel>
                <FormControl>
                  <Input type="number" min={1} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="tipoCultivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de cultivo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="comprimentoMetros"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comprimento (m)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="compartilhada"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-lg border p-3">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
              </FormControl>
              <div className="space-y-1 leading-snug">
                <FormLabel className="font-normal cursor-pointer">Bancada compartilhada</FormLabel>
                <p className="text-[11px] text-muted-foreground">
                  Uma linha ou circuito comum alimenta várias caixas.
                </p>
              </div>
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "A guardar…" : "Guardar"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
