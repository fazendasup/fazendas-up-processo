import type { Express, NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import * as db from "../db";
import { getComercialPrisma } from "../comercial/db";
import type { PrismaClient } from "../comercial/generated/prisma/index.js";
import { detalheInadimplenciaCliente, extratoReceberClienteCa } from "../comercial/lib/cliente-inadimplencia-ca";
import { hashPassword, verifyPassword } from "../comercial/lib/password";
import {
  addCalendarDays,
  earliestDeliveryYmd,
  entregaPermitida,
  MIN_ORDER_REAIS,
  todayYmd,
  upcomingDeliveryDates,
} from "./portalCalendario";
import { fichaDoProduto } from "./vitrineCopy";
import { alinharFotosDeEstoque, bytesDaFoto, cnpjValido, formatarCnpj, jpegValido, LojaErro, preencherFichasDaVitrine, produtoVisivelNaLoja, reenviarCadastro, registrarEmpresa } from "./portalLoja";
import { baixarDocumentoCliente, DocumentoErro, lembrarTitulosDoCliente } from "./portalDocumentos";
import {
  emitirSessaoCliente,
  emitirSessaoEquipe,
  encerrarSessao,
  hashConvite,
  lerSessaoCliente,
  lerSessaoEquipe,
  novoConviteToken,
  origemPermitida,
  portalConfigurado,
  urlPublicaSite,
} from "./portalSession";

const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Muitas tentativas. Espere alguns minutos e tente de novo." },
});

const documentoLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Muitos downloads. Espere alguns minutos e tente de novo." },
});

const cadastroLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Muitos cadastros em seguida. Espere alguns minutos." },
});

const conviteLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: { error: "Muitas tentativas de convite. Espere alguns minutos." },
});

const senhaSchema = z.string().min(10, "A senha precisa ter pelo menos 10 caracteres.").max(72);
const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());

function dataLocal(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function falha(res: Response, status: number, error: string) {
  res.status(status).json({ error });
}

function dinheiro(valor: unknown): number | null {
  if (valor == null) return null;
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function podeEditarLoja(role: string | null | undefined) {
  return role === "comercial" || role === "admin" || role === "platform_admin";
}

function imagemValida(valor: string): boolean {
  if (valor.length > 500) return false;
  if (valor.startsWith("https://")) return true;
  return valor.startsWith("/produtos/") || valor.startsWith("/uploads/");
}

function estoqueNumero(valor: unknown): number | null {
  if (valor == null) return null;
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 1000) / 1000;
}

function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function senhaInicialDoCnpj(cnpj: string): string {
  return cnpj.slice(0, 5);
}

async function senhaDoPortalConfere(senhaHash: string | null, cnpj: string, senha: string): Promise<boolean> {
  if (!senhaHash) return senha === senhaInicialDoCnpj(cnpj);
  return verifyPassword(senha, senhaHash);
}

async function buscarClientePorCnpj(prisma: PrismaClient, cnpj: string) {
  const ids = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM clientes
    WHERE cnpj_cpf IS NOT NULL
      AND REPLACE(REPLACE(REPLACE(REPLACE(cnpj_cpf, '.', ''), '/', ''), '-', ''), ' ', '') = ${cnpj}
  `;
  if (ids.length === 0) return null;
  const clientes = await prisma.cliente.findMany({
    where: { id: { in: ids.map((row) => row.id) } },
    include: { portalAcesso: true },
  });
  return (
    clientes.find((cliente) => cliente.externalId && cliente.portalAcesso) ??
    clientes.find((cliente) => cliente.externalId) ??
    clientes[0] ??
    null
  );
}

async function criarAcessoPortal(
  prisma: PrismaClient,
  cliente: { id: string; emailPrincipal: string | null },
  cnpj: string,
) {
  const informado = cliente.emailPrincipal?.trim().toLowerCase() ?? "";
  let email = informado.includes("@") ? informado : `${cnpj}@cnpj.fazendasup.com.br`;
  const ocupado = await prisma.portalAcesso.findUnique({ where: { email } });
  if (ocupado && ocupado.clienteId !== cliente.id) email = `${cnpj}@cnpj.fazendasup.com.br`;
  return prisma.portalAcesso.create({
    data: { clienteId: cliente.id, email, ativo: true },
  });
}

async function clienteDaSessao(req: Request) {
  const sessao = await lerSessaoCliente(req);
  if (!sessao) return null;
  const prisma = getComercialPrisma();
  const acesso = await prisma.portalAcesso.findUnique({
    where: { id: sessao.acessoId },
    include: { cliente: true },
  });
  if (!acesso || !acesso.ativo) return null;
  if (acesso.clienteId !== sessao.clienteId) return null;
  return acesso;
}

async function equipeDaSessao(req: Request) {
  const sessao = await lerSessaoEquipe(req);
  if (!sessao) return null;
  const user = await db.getUserById(sessao.userId);
  if (!user || !podeEditarLoja(user.role)) return null;
  return user;
}

function dadosCliente(acesso: {
  email: string;
  cliente: { nome: string; cnpjCpf: string | null; externalId: string | null };
}) {
  return {
    nome: acesso.cliente.nome,
    email: acesso.email,
    cnpj: acesso.cliente.cnpjCpf,
    vinculado: Boolean(acesso.cliente.externalId),
  };
}

async function precosDoCliente(contaAzulCustomerId: string | null) {
  if (!contaAzulCustomerId) return new Map<string, number>();
  const prisma = getComercialPrisma();
  const regra = await prisma.regraComercialCliente.findUnique({
    where: { contaAzulCustomerId },
    include: { precosEspeciais: true },
  });
  const mapa = new Map<string, number>();
  for (const item of regra?.precosEspeciais ?? []) {
    const preco = dinheiro(item.preco);
    if (preco != null) mapa.set(item.produtoId, preco);
  }
  return mapa;
}

export function registerPortalRoutes(app: Express): void {
  app.use("/api/portal", (req, res, next) => {
    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    if (origin && !origemPermitida(origin)) {
      falha(res, 403, "Origem não permitida.");
      return;
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Portal-Request");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    }
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    if (req.method !== "GET" && req.get("x-portal-request") !== "1") {
      falha(res, 403, "Pedido recusado.");
      return;
    }
    next();
  });

  app.get("/api/portal/regras", (_req, res) => {
    const agora = new Date();
    res.json({
      minimoReais: MIN_ORDER_REAIS,
      antecedenciaDiasUteis: 2,
      primeiraData: earliestDeliveryYmd(agora),
      datas: upcomingDeliveryDates(agora),
    });
  });

  app.get("/api/portal/vitrine", async (req, res) => {
    try {
      const prisma = getComercialPrisma();
      await preencherFichasDaVitrine(prisma);
      await alinharFotosDeEstoque(prisma);
      const acesso = await clienteDaSessao(req);
      const especiais = await precosDoCliente(acesso?.cliente.externalId ?? null);
      const produtos = await prisma.produtoComercial.findMany({
        where: {
          ativo: true,
          visivelPortal: true,
          importadoOperacao: true,
          contaAzulProdutoId: { not: null },
        },
        orderBy: { nome: "asc" },
      });
      const agora = new Date();
      res.json({
        minimoReais: MIN_ORDER_REAIS,
        datas: upcomingDeliveryDates(agora),
        itens: produtos.flatMap((produto) => {
          const logado = Boolean(acesso);
          const especial = especiais.get(produto.id);
          if (
            !produtoVisivelNaLoja({
              visivel: produto.visivelPortal,
              exclusivo: produto.exclusivoPortal,
              temPrecoEspecial: especial != null,
              logado,
            })
          ) {
            return [];
          }
          const base = dinheiro(produto.precoBase);
          const preco = especial ?? base;
          if (preco == null || preco <= 0) return [];
          const ficha = fichaDoProduto(produto.nome);
          return [
            {
              id: produto.id,
              nome: produto.nome,
              grupo: ficha.grupo,
              descricao: produto.descricaoLoja || ficha.descricao,
              aplicacao: produto.aplicacaoLoja || ficha.aplicacao,
              preco: logado ? preco : null,
              precoEspecial: logado && especial != null,
              imagemUrl: produto.imagemUrl || ficha.foto,
              unidade: produto.modoCompra === "KG" ? "kg" : "un",
              estoque: estoqueNumero(produto.estoqueLoja),
            },
          ];
        }),
      });
    } catch (error) {
      console.error("[portal] vitrine", error);
      falha(res, 503, "Não foi possível carregar os produtos.");
    }
  });

  app.post("/api/portal/cadastro", cadastroLimit, async (req, res) => {
    const parsed = z
      .object({
        nome: z.string().trim().min(2).max(160),
        nomeFantasia: z.string().trim().max(160).optional(),
        cnpj: z.string().trim().max(20),
        email: emailSchema,
        telefone: z.string().trim().min(10).max(20),
        contato: z.string().trim().min(2).max(120),
        cep: z.string().trim().max(12),
        logradouro: z.string().trim().min(2).max(160),
        numero: z.string().trim().min(1).max(20),
        complemento: z.string().trim().max(120).optional(),
        bairro: z.string().trim().min(2).max(80),
        cidade: z.string().trim().min(2).max(80),
        estado: z.string().trim().length(2),
        inscricaoEstadual: z.string().trim().max(20).optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      falha(res, 400, "Confira os dados da empresa. CNPJ, endereço e contato são necessários.");
      return;
    }
    const cnpj = parsed.data.cnpj.replace(/\D/g, "");
    const cep = parsed.data.cep.replace(/\D/g, "");
    const telefone = parsed.data.telefone.replace(/\D/g, "");
    if (!cnpjValido(cnpj) || cep.length !== 8 || telefone.length < 10) {
      falha(res, 400, "Confira o CNPJ, o CEP e o telefone.");
      return;
    }
    try {
      const resultado = await registrarEmpresa({
        nome: parsed.data.nome,
        nomeFantasia: parsed.data.nomeFantasia?.trim() || null,
        cnpj,
        email: parsed.data.email,
        telefone,
        contato: parsed.data.contato,
        cep,
        logradouro: parsed.data.logradouro,
        numero: parsed.data.numero,
        complemento: parsed.data.complemento?.trim() || null,
        bairro: parsed.data.bairro,
        cidade: parsed.data.cidade,
        estado: parsed.data.estado.toUpperCase(),
        inscricaoEstadual: parsed.data.inscricaoEstadual?.trim() || null,
      });
      res.status(resultado.pendente ? 202 : 201).json(resultado);
    } catch (error) {
      if (error instanceof LojaErro) {
        falha(res, error.status, error.message);
        return;
      }
      console.error("[portal] cadastro", error);
      falha(res, 503, "Não foi possível cadastrar a empresa agora.");
    }
  });

  app.get("/api/portal/foto/:id", async (req, res) => {
    try {
      const prisma = getComercialPrisma();
      const foto = await prisma.portalFoto.findUnique({ where: { produtoId: req.params.id } });
      if (!foto) {
        res.status(404).end();
        return;
      }
      const bytes = bytesDaFoto(foto.conteudo);
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Content-Length", String(bytes.length));
      res.setHeader("Cache-Control", "public, max-age=300");
      res.end(bytes);
    } catch (error) {
      console.error("[portal] foto", error);
      res.status(404).end();
    }
  });

  app.get("/api/portal/sessao", async (req, res) => {
    try {
      const acesso = await clienteDaSessao(req);
      const equipe = await equipeDaSessao(req);
      res.json({
        cliente: acesso ? dadosCliente(acesso) : null,
        equipe: equipe
          ? { nome: equipe.name?.trim() || equipe.email || "Equipe", email: equipe.email }
          : null,
      });
    } catch (error) {
      console.error("[portal] sessao", error);
      falha(res, 503, "A loja não conseguiu consultar a sessão.");
    }
  });

  app.post("/api/portal/convite/ativar", conviteLimit, async (req, res) => {
    if (!portalConfigurado()) {
      falha(res, 503, "O portal ainda não tem segredo de sessão configurado.");
      return;
    }
    const parsed = z.object({ token: z.string().trim().min(20).max(200), senha: senhaSchema }).safeParse(req.body);
    if (!parsed.success) {
      falha(res, 400, parsed.error.issues[0]?.message ?? "Dados do convite inválidos.");
      return;
    }
    try {
      const prisma = getComercialPrisma();
      const acesso = await prisma.portalAcesso.findFirst({
        where: { conviteHash: hashConvite(parsed.data.token) },
        include: { cliente: true },
      });
      if (!acesso || !acesso.ativo || !acesso.conviteExpiraEm || acesso.conviteExpiraEm.getTime() < Date.now()) {
        falha(res, 400, "Convite inválido ou vencido. Peça um novo acesso à fazenda.");
        return;
      }
      if (acesso.senhaHash) {
        falha(res, 400, "Esta conta já tem senha. Entre com o CNPJ.");
        return;
      }
      const senhaHash = await hashPassword(parsed.data.senha);
      await prisma.portalAcesso.update({
        where: { id: acesso.id },
        data: { senhaHash, conviteHash: null, conviteExpiraEm: null },
      });
      await emitirSessaoCliente(req, res, acesso.id, acesso.clienteId);
      res.json({ cliente: dadosCliente(acesso) });
    } catch (error) {
      console.error("[portal] ativar", error);
      falha(res, 503, "Não foi possível criar a senha agora.");
    }
  });

  app.post("/api/portal/entrar", loginLimit, async (req, res) => {
    if (!portalConfigurado()) {
      falha(res, 503, "O portal ainda não tem segredo de sessão configurado.");
      return;
    }
    const parsed = z
      .object({
        cnpj: z.string().trim().min(14).max(20),
        senha: z.string().min(1).max(72),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      falha(res, 401, "CNPJ ou senha não conferem.");
      return;
    }
    const cnpj = somenteDigitos(parsed.data.cnpj);
    if (cnpj.length !== 14) {
      falha(res, 401, "CNPJ ou senha não conferem.");
      return;
    }
    try {
      const prisma = getComercialPrisma();
      const cliente = await buscarClientePorCnpj(prisma, cnpj);
      if (!cliente) {
        falha(res, 401, "CNPJ ou senha não conferem.");
        return;
      }
      const acessoExistente = cliente.portalAcesso;
      const confere = await senhaDoPortalConfere(acessoExistente?.senhaHash ?? null, cnpj, parsed.data.senha);
      if (!confere || acessoExistente?.ativo === false) {
        falha(res, 401, "CNPJ ou senha não conferem.");
        return;
      }
      const acesso = acessoExistente ?? (await criarAcessoPortal(prisma, cliente, cnpj));
      const completo = await prisma.portalAcesso.findUnique({
        where: { id: acesso.id },
        include: { cliente: true },
      });
      if (!completo) {
        falha(res, 503, "Não foi possível entrar agora.");
        return;
      }
      await emitirSessaoCliente(req, res, completo.id, completo.clienteId);
      res.json({ cliente: dadosCliente(completo), senhaInicial: !completo.senhaHash });
    } catch (error) {
      console.error("[portal] entrar", error);
      falha(res, 503, "Não foi possível entrar agora.");
    }
  });

  app.post("/api/portal/sair", async (req, res) => {
    encerrarSessao(req, res, "cliente");
    res.json({ ok: true });
  });

  app.post("/api/portal/senha", async (req, res) => {
    const acesso = await clienteDaSessao(req);
    if (!acesso) {
      falha(res, 401, "Entre para alterar a senha.");
      return;
    }
    const parsed = z
      .object({
        senhaAtual: z.string().min(1).max(72),
        senhaNova: z.string().min(6, "A nova senha precisa ter pelo menos 6 caracteres.").max(72),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      falha(res, 400, parsed.error.issues[0]?.message ?? "Confira a senha atual e a nova.");
      return;
    }
    const cnpj = somenteDigitos(acesso.cliente.cnpjCpf ?? "");
    if (cnpj.length !== 14) {
      falha(res, 400, "Este cadastro não tem CNPJ para trocar a senha.");
      return;
    }
    const confere = await senhaDoPortalConfere(acesso.senhaHash, cnpj, parsed.data.senhaAtual);
    if (!confere) {
      falha(res, 401, "A senha atual não confere.");
      return;
    }
    if (parsed.data.senhaNova === senhaInicialDoCnpj(cnpj)) {
      falha(res, 400, "Escolha uma senha diferente dos 5 primeiros dígitos do CNPJ.");
      return;
    }
    try {
      const prisma = getComercialPrisma();
      await prisma.portalAcesso.update({
        where: { id: acesso.id },
        data: { senhaHash: await hashPassword(parsed.data.senhaNova) },
      });
      res.json({ ok: true });
    } catch (error) {
      console.error("[portal] senha", error);
      falha(res, 503, "Não foi possível alterar a senha agora.");
    }
  });

  app.get("/api/portal/catalogo", async (req, res) => {
    const acesso = await clienteDaSessao(req);
    if (!acesso) {
      falha(res, 401, "Entre para ver os produtos.");
      return;
    }
    try {
      const prisma = getComercialPrisma();
      const produtos = await prisma.produtoComercial.findMany({
        where: {
          ativo: true,
          visivelPortal: true,
          importadoOperacao: true,
          contaAzulProdutoId: { not: null },
          ocultoListaCompra: false,
        },
        orderBy: [{ categoria: "asc" }, { nome: "asc" }],
      });
      const especiais = await precosDoCliente(acesso.cliente.externalId);
      const itens = produtos.flatMap((produto) => {
        const especial = especiais.get(produto.id);
        if (
          !produtoVisivelNaLoja({
            visivel: produto.visivelPortal,
            exclusivo: produto.exclusivoPortal,
            temPrecoEspecial: especial != null,
            logado: true,
          })
        ) {
          return [];
        }
        const base = dinheiro(produto.precoBase);
        const preco = especial ?? base;
        if (preco == null || preco <= 0) return [];
        return [
          {
            id: produto.id,
            nome: produto.nome,
            categoria: produto.categoria,
            preco,
            precoEspecial: especial != null,
            imagemUrl: produto.imagemUrl,
            unidade: produto.modoCompra === "KG" ? "kg" : "un",
          },
        ];
      });
      res.json({ itens });
    } catch (error) {
      console.error("[portal] catalogo", error);
      falha(res, 503, "Não foi possível carregar os produtos.");
    }
  });

  app.get("/api/portal/pedidos", async (req, res) => {
    const acesso = await clienteDaSessao(req);
    if (!acesso) {
      falha(res, 401, "Entre para ver os pedidos.");
      return;
    }
    try {
      const prisma = getComercialPrisma();
      const hoje = todayYmd();
      const contaAzulId = acesso.cliente.externalId?.trim();
      const pedidos = await prisma.pedidoOperacional.findMany({
        where: {
          dataEntrega: { gte: new Date(`${addCalendarDays(hoje, -180)}T00:00:00.000-04:00`) },
          OR: [
            { clienteId: acesso.clienteId },
            ...(contaAzulId ? [{ contaAzulCustomerId: contaAzulId }] : []),
          ],
        },
        orderBy: { dataEntrega: "asc" },
        take: 80,
        include: { itens: true },
      });
      res.json({
        pedidos: pedidos.map((pedido) => {
          const dataEntrega = new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Manaus",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(pedido.dataEntrega);
          return {
            id: pedido.id,
            dataEntrega,
            status: pedido.status,
            programado: dataEntrega >= hoje && pedido.status !== "CANCELADO",
            doSite: (pedido.observacoes ?? "").includes("Pedido pelo site"),
            itens: pedido.itens.map((item) => ({
              nome: item.produtoNome,
              quantidade: Number(item.quantidade),
              preco: dinheiro(item.precoUnit),
            })),
          };
        }),
      });
    } catch (error) {
      console.error("[portal] pedidos", error);
      falha(res, 503, "Não foi possível carregar os pedidos.");
    }
  });

  app.post("/api/portal/pedidos", async (req, res) => {
    const acesso = await clienteDaSessao(req);
    if (!acesso) {
      falha(res, 401, "Entre para lançar um pedido.");
      return;
    }
    const parsed = z
      .object({
        dataEntrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        observacoes: z.string().max(1500).optional(),
        itens: z
          .array(
            z.object({
              produtoId: z.string().min(1).max(64),
              quantidade: z.number().positive().max(9999),
            }),
          )
          .min(1)
          .max(40),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      falha(res, 400, "Confira a data, os produtos e as quantidades.");
      return;
    }
    const ids = parsed.data.itens.map((item) => item.produtoId);
    if (new Set(ids).size !== ids.length) {
      falha(res, 400, "Cada produto entra uma vez no pedido.");
      return;
    }
    if (!entregaPermitida(parsed.data.dataEntrega)) {
      falha(res, 400, "A entrega precisa cair em dia útil, com 2 dias úteis de antecedência.");
      return;
    }
    const contaAzulId = acesso.cliente.externalId?.trim();
    if (!contaAzulId) {
      falha(res, 400, "Esta conta ainda não pode receber pedidos. Fale com a fazenda.");
      return;
    }
    try {
      const atraso = await detalheInadimplenciaCliente(contaAzulId);
      if (atraso.inadimplente) {
        falha(
          res,
          409,
          "Há um pagamento em atraso nesta conta. Regularize para enviar um novo pedido.",
        );
        return;
      }
      const prisma = getComercialPrisma();
      const produtos = await prisma.produtoComercial.findMany({
        where: {
          id: { in: ids },
          ativo: true,
          visivelPortal: true,
          importadoOperacao: true,
          contaAzulProdutoId: { not: null },
        },
      });
      if (produtos.length !== ids.length) {
        falha(res, 400, "Um ou mais produtos não estão disponíveis.");
        return;
      }
      const porId = new Map(produtos.map((produto) => [produto.id, produto]));
      const especiais = await precosDoCliente(contaAzulId);
      if (
        produtos.some(
          (produto) =>
            !produtoVisivelNaLoja({
              visivel: produto.visivelPortal,
              exclusivo: produto.exclusivoPortal,
              temPrecoEspecial: especiais.has(produto.id),
              logado: true,
            }),
        )
      ) {
        falha(res, 400, "Um ou mais produtos não estão disponíveis.");
        return;
      }
      const regra = await prisma.regraComercialCliente.findUnique({
        where: { contaAzulCustomerId: contaAzulId },
      });
      let total = 0;
      const linhas = parsed.data.itens.map((item) => {
        const produto = porId.get(item.produtoId)!;
        const especial = especiais.get(produto.id);
        const preco = especial ?? dinheiro(produto.precoBase);
        if (preco == null || preco <= 0) return null;
        total += preco * item.quantidade;
        return { produto, quantidade: item.quantidade, preco, especial: especial != null };
      });
      if (linhas.some((linha) => linha == null)) {
        falha(res, 400, "Há produto sem preço.");
        return;
      }
      const totalReais = Math.round(total * 100) / 100;
      if (totalReais < MIN_ORDER_REAIS) {
        falha(res, 400, `O pedido mínimo para entrega é R$ ${MIN_ORDER_REAIS.toFixed(2).replace(".", ",")}.`);
        return;
      }
      const nota = parsed.data.observacoes?.trim();
      const dataEntrega = new Date(`${parsed.data.dataEntrega}T12:00:00`);
      const pedido = await prisma.$transaction(async (tx) => {
        for (const linha of linhas) {
          if (linha!.produto.estoqueLoja == null) continue;
          const baixado = await tx.produtoComercial.updateMany({
            where: { id: linha!.produto.id, estoqueLoja: { gte: linha!.quantidade } },
            data: { estoqueLoja: { decrement: linha!.quantidade } },
          });
          if (baixado.count !== 1) {
            throw new LojaErro(409, `${linha!.produto.nome} não tem essa quantidade disponível.`);
          }
        }
        return tx.pedidoOperacional.create({
        data: {
          clienteId: acesso.clienteId,
          contaAzulCustomerId: contaAzulId,
          dataEntrega,
          diaSemana: dataEntrega.getDay(),
          tipoVenda: regra?.tipoVendaPadrao ?? "AVULSO",
          observacoes: nota ? `Pedido pelo site. ${nota}` : "Pedido pelo site.",
          itens: {
            create: linhas.map((linha) => ({
              produtoId: linha!.produto.id,
              produtoNome: linha!.produto.nome,
              categoria: linha!.produto.categoria,
              quantidade: linha!.quantidade.toFixed(3),
              precoUnit: linha!.preco.toFixed(2),
              precoEspecial: linha!.especial,
            })),
          },
        },
        include: { itens: true },
      });
      });
      res.status(201).json({
        id: pedido.id,
        dataEntrega: parsed.data.dataEntrega,
        total: totalReais,
      });
    } catch (error) {
      if (error instanceof LojaErro) {
        falha(res, error.status, error.message);
        return;
      }
      console.error("[portal] criar pedido", error);
      falha(res, 503, "Não foi possível enviar o pedido agora.");
    }
  });

  app.get("/api/portal/financeiro", async (req, res) => {
    const acesso = await clienteDaSessao(req);
    if (!acesso) {
      falha(res, 401, "Entre para ver o financeiro.");
      return;
    }
    const contaAzulId = acesso.cliente.externalId?.trim();
    if (!contaAzulId) {
      res.json({
        titulos: [],
        totais: { recebido: 0, emAberto: 0, emAtraso: 0 },
        aviso: "Os pagamentos desta conta ainda não estão disponíveis.",
      });
      return;
    }
    try {
      const hoje = todayYmd();
      const extrato = await extratoReceberClienteCa({
        contaAzulCustomerId: contaAzulId,
        dataInicio: addCalendarDays(hoje, -180),
        dataFim: addCalendarDays(hoje, 90),
      });
      const titulos = extrato.titulos.map((titulo) => ({
        id: titulo.id,
        descricao: titulo.descricao,
        vencimento: titulo.dataVencimento,
        pagamento: titulo.dataPagamento,
        status: titulo.status,
        valor: titulo.valorTotal,
        emAberto: titulo.valorAberto,
        pago: titulo.valorPago,
        referencia: titulo.referencia,
      }));
      lembrarTitulosDoCliente(
        contaAzulId,
        titulos.map((titulo) => ({ id: titulo.id, vencimento: titulo.vencimento })),
      );
      res.json({
        totais: {
          recebido: extrato.totais.recebido,
          emAberto: extrato.totais.emAberto,
          emAtraso: extrato.totais.emAtraso,
        },
        titulos,
      });
    } catch (error) {
      console.error("[portal] financeiro", error);
      falha(res, 503, "Os pagamentos não carregaram agora. Tente de novo em instantes.");
    }
  });

  const enviarDocumento = async (req: Request, res: Response, tipo: "boleto" | "nota") => {
    const acesso = await clienteDaSessao(req);
    if (!acesso) {
      falha(res, 401, "Entre para ver o financeiro.");
      return;
    }
    const contaAzulId = acesso.cliente.externalId?.trim();
    if (!contaAzulId) {
      falha(res, 404, "Os pagamentos desta conta ainda não estão disponíveis.");
      return;
    }
    try {
      const arquivo = await baixarDocumentoCliente({
        contaAzulCustomerId: contaAzulId,
        cnpj: acesso.cliente.cnpjCpf,
        parcelaId: String(req.params.id ?? ""),
        tipo,
      });
      res.setHeader("Content-Type", arquivo.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${arquivo.nome}"`);
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(arquivo.bytes);
    } catch (error) {
      if (error instanceof DocumentoErro) {
        falha(res, error.status, error.message);
        return;
      }
      console.error("[portal] documento", error);
      falha(res, 503, "Não foi possível baixar agora. Tente de novo em instantes.");
    }
  };

  app.get("/api/portal/financeiro/:id/boleto", documentoLimit, (req, res) => {
    void enviarDocumento(req, res, "boleto");
  });

  app.get("/api/portal/financeiro/:id/nota", documentoLimit, (req, res) => {
    void enviarDocumento(req, res, "nota");
  });

  app.post("/api/portal/equipe/entrar", loginLimit, async (req, res) => {
    if (!portalConfigurado()) {
      falha(res, 503, "O portal ainda não tem segredo de sessão configurado.");
      return;
    }
    const parsed = z.object({ email: emailSchema, senha: z.string().min(1).max(72) }).safeParse(req.body);
    if (!parsed.success) {
      falha(res, 401, "E-mail ou senha não conferem.");
      return;
    }
    try {
      const user = await db.getUserByEmail(parsed.data.email);
      const ok =
        user?.passwordHash &&
        podeEditarLoja(user.role) &&
        (await verifyPassword(parsed.data.senha, user.passwordHash));
      if (!ok || !user) {
        falha(res, 401, "E-mail ou senha não conferem.");
        return;
      }
      await emitirSessaoEquipe(req, res, user.id);
      res.json({ equipe: { nome: user.name?.trim() || user.email || "Equipe", email: user.email } });
    } catch (error) {
      console.error("[portal] equipe entrar", error);
      falha(res, 503, "Não foi possível entrar agora.");
    }
  });

  app.post("/api/portal/equipe/sair", async (req, res) => {
    encerrarSessao(req, res, "equipe");
    res.json({ ok: true });
  });

  app.get("/api/portal/equipe/produtos", async (req, res) => {
    const equipe = await equipeDaSessao(req);
    if (!equipe) {
      falha(res, 401, "Entre com o acesso da equipe.");
      return;
    }
    try {
      const prisma = getComercialPrisma();
      const produtos = await prisma.produtoComercial.findMany({
        where: { importadoOperacao: true, contaAzulProdutoId: { not: null } },
        orderBy: { nome: "asc" },
      });
      res.json({
        produtos: produtos.map((produto) => {
          const ficha = fichaDoProduto(produto.nome);
          return {
            id: produto.id,
            nome: produto.nome,
            categoria: produto.categoria,
            grupo: ficha.grupo,
            descricao: produto.descricaoLoja || ficha.descricao,
            aplicacao: produto.aplicacaoLoja || ficha.aplicacao,
            naLoja: produto.visivelPortal,
            exclusivo: produto.exclusivoPortal,
            preco: dinheiro(produto.precoBase),
            imagemUrl: produto.imagemUrl || ficha.foto,
            unidade: produto.modoCompra === "KG" ? "kg" : "un",
            estoque: estoqueNumero(produto.estoqueLoja),
          };
        }),
      });
    } catch (error) {
      console.error("[portal] equipe produtos", error);
      falha(res, 503, "Não foi possível listar os produtos.");
    }
  });

  app.post("/api/portal/equipe/produtos/liberar", async (req, res) => {
    const equipe = await equipeDaSessao(req);
    if (!equipe) {
      falha(res, 401, "Entre com o acesso da equipe.");
      return;
    }
    try {
      const prisma = getComercialPrisma();
      const resultado = await prisma.produtoComercial.updateMany({
        where: {
          ativo: true,
          importadoOperacao: true,
          contaAzulProdutoId: { not: null },
          precoBase: { not: null },
          ocultoListaCompra: false,
        },
        data: { visivelPortal: true },
      });
      res.json({ atualizados: resultado.count });
    } catch (error) {
      console.error("[portal] liberar produtos", error);
      falha(res, 503, "Não foi possível liberar os produtos.");
    }
  });

  app.patch("/api/portal/equipe/produtos/:id", async (req, res) => {
    const equipe = await equipeDaSessao(req);
    if (!equipe) {
      falha(res, 401, "Entre com o acesso da equipe.");
      return;
    }
    const parsed = z
      .object({
        naLoja: z.boolean().optional(),
        exclusivo: z.boolean().optional(),
        preco: z.number().positive().max(99999).optional(),
        imagemUrl: z.string().max(500).nullable().optional(),
        descricao: z.string().trim().max(400).optional(),
        aplicacao: z.string().trim().max(240).optional(),
        estoque: z.number().min(0).max(99999).nullable().optional(),
      })
      .safeParse(req.body);
    const temCampo =
      parsed.success &&
      (parsed.data.naLoja != null ||
        parsed.data.exclusivo != null ||
        parsed.data.preco != null ||
        parsed.data.imagemUrl !== undefined ||
        parsed.data.descricao != null ||
        parsed.data.aplicacao != null ||
        parsed.data.estoque !== undefined);
    if (!parsed.success || !temCampo) {
      falha(res, 400, "Informe preço, foto, estoque ou se o item fica na loja.");
      return;
    }
    if (parsed.data.imagemUrl && !imagemValida(parsed.data.imagemUrl)) {
      falha(res, 400, "A foto precisa ser um endereço https.");
      return;
    }
    try {
      const prisma = getComercialPrisma();
      const atual = await prisma.produtoComercial.findUnique({ where: { id: req.params.id } });
      if (!atual || !atual.importadoOperacao || !atual.contaAzulProdutoId) {
        falha(res, 404, "Produto não encontrado na operação importada do Conta Azul.");
        return;
      }
      if (parsed.data.naLoja && !atual.ativo) {
        falha(res, 400, "Este produto está inativo na operação. Reative no sistema interno antes de colocar na loja.");
        return;
      }
      const atualizado = await prisma.produtoComercial.update({
        where: { id: atual.id },
        data: {
          ...(parsed.data.naLoja != null ? { visivelPortal: parsed.data.naLoja } : {}),
          ...(parsed.data.exclusivo != null ? { exclusivoPortal: parsed.data.exclusivo } : {}),
          ...(parsed.data.preco != null ? { precoBase: parsed.data.preco.toFixed(2) } : {}),
          ...(parsed.data.imagemUrl !== undefined ? { imagemUrl: parsed.data.imagemUrl || null } : {}),
          ...(parsed.data.descricao != null ? { descricaoLoja: parsed.data.descricao } : {}),
          ...(parsed.data.aplicacao != null ? { aplicacaoLoja: parsed.data.aplicacao } : {}),
          ...(parsed.data.estoque !== undefined
            ? { estoqueLoja: parsed.data.estoque == null ? null : parsed.data.estoque.toFixed(3) }
            : {}),
        },
      });
      res.json({
        id: atualizado.id,
        naLoja: atualizado.visivelPortal,
        exclusivo: atualizado.exclusivoPortal,
        preco: dinheiro(atualizado.precoBase),
        imagemUrl: atualizado.imagemUrl,
        descricao: atualizado.descricaoLoja,
        aplicacao: atualizado.aplicacaoLoja,
        estoque: estoqueNumero(atualizado.estoqueLoja),
      });
    } catch (error) {
      console.error("[portal] patch produto", error);
      falha(res, 503, "Não foi possível salvar o produto.");
    }
  });

  app.post("/api/portal/equipe/produtos/:id/foto", async (req, res) => {
    const equipe = await equipeDaSessao(req);
    if (!equipe) {
      falha(res, 401, "Entre com o acesso da equipe.");
      return;
    }
    const parsed = z.object({ imagem: z.string().min(100).max(2_100_000) }).safeParse(req.body);
    if (!parsed.success) {
      falha(res, 400, "Escolha uma foto JPG ou PNG.");
      return;
    }
    const conteudo = Buffer.from(parsed.data.imagem, "base64");
    if (!jpegValido(conteudo)) {
      falha(res, 400, "Escolha uma foto JPG ou PNG de até 1,5 MB.");
      return;
    }
    try {
      const prisma = getComercialPrisma();
      const produto = await prisma.produtoComercial.findUnique({ where: { id: req.params.id } });
      if (!produto || !produto.importadoOperacao || !produto.contaAzulProdutoId) {
        falha(res, 404, "Produto não encontrado.");
        return;
      }
      const imagemUrl = `/api/portal/foto/${produto.id}?v=${Date.now()}`;
      await prisma.portalFoto.upsert({
        where: { produtoId: produto.id },
        create: { produtoId: produto.id, conteudo },
        update: { conteudo },
      });
      await prisma.produtoComercial.update({
        where: { id: produto.id },
        data: { imagemUrl },
      });
      res.json({ imagemUrl });
    } catch (error) {
      console.error("[portal] salvar foto", error);
      falha(res, 503, "Não foi possível guardar a foto.");
    }
  });

  app.get("/api/portal/equipe/cadastros", async (req, res) => {
    const equipe = await equipeDaSessao(req);
    if (!equipe) {
      falha(res, 401, "Entre com o acesso da equipe.");
      return;
    }
    try {
      const prisma = getComercialPrisma();
      const cadastros = await prisma.portalCadastro.findMany({
        orderBy: { criadoEm: "desc" },
        take: 40,
      });
      res.json({
        cadastros: cadastros.map((item) => ({
          id: item.id,
          nome: item.nome,
          cnpj: formatarCnpj(item.cnpj),
          email: item.email,
          cidade: item.cidade,
          estado: item.estado,
          status: item.status,
          erro: item.erro,
        })),
      });
    } catch (error) {
      console.error("[portal] cadastros", error);
      falha(res, 503, "Não foi possível listar os cadastros.");
    }
  });

  app.post("/api/portal/equipe/cadastros/:id/enviar", async (req, res) => {
    const equipe = await equipeDaSessao(req);
    if (!equipe) {
      falha(res, 401, "Entre com o acesso da equipe.");
      return;
    }
    try {
      await reenviarCadastro(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      console.error("[portal] reenviar cadastro", error);
      const prisma = getComercialPrisma();
      const texto = error instanceof Error ? error.message : "Falha ao enviar.";
      await prisma.portalCadastro.update({
        where: { id: req.params.id },
        data: { status: "ERRO", erro: texto.slice(0, 2000) },
      }).catch(() => undefined);
      falha(res, 503, "Não foi possível enviar este cadastro.");
    }
  });

  app.post("/api/portal/equipe/convites", async (req, res) => {
    const equipe = await equipeDaSessao(req);
    if (!equipe) {
      falha(res, 401, "Entre com o acesso da equipe.");
      return;
    }
    const parsed = z
      .object({
        email: emailSchema.optional(),
        redefinir: z.boolean().optional(),
      })
      .safeParse(req.body ?? {});
    if (!parsed.success) {
      falha(res, 400, "E-mail do convite inválido.");
      return;
    }
    if (parsed.data.redefinir && !parsed.data.email) {
      falha(res, 400, "Para redefinir a senha, informe o e-mail desse cliente.");
      return;
    }
    try {
      const prisma = getComercialPrisma();
      const clientes = await prisma.cliente.findMany({
        where: {
          emailPrincipal: parsed.data.email ? parsed.data.email : { not: null },
          externalId: { not: null },
        },
        include: { portalAcesso: true },
      });
      const filtrados = parsed.data.email
        ? clientes.filter((cliente) => cliente.emailPrincipal?.trim().toLowerCase() === parsed.data.email)
        : clientes;
      const expira = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const criados: Array<{ nome: string; email: string; link: string }> = [];
      const ignorados: Array<{ nome: string; email: string | null; motivo: string }> = [];
      const vistos = new Set<string>();

      for (const cliente of filtrados) {
        const email = cliente.emailPrincipal?.trim().toLowerCase() ?? "";
        if (!email) {
          ignorados.push({ nome: cliente.nome, email: null, motivo: "Sem e-mail no Conta Azul." });
          continue;
        }
        if (vistos.has(email)) {
          ignorados.push({ nome: cliente.nome, email, motivo: "E-mail repetido em outro cadastro." });
          continue;
        }
        vistos.add(email);
        if (cliente.portalAcesso?.senhaHash && !parsed.data.redefinir) {
          ignorados.push({ nome: cliente.nome, email, motivo: "Já criou senha." });
          continue;
        }
        if (cliente.portalAcesso && cliente.portalAcesso.email !== email) {
          const dono = await prisma.portalAcesso.findUnique({ where: { email } });
          if (dono && dono.clienteId !== cliente.id) {
            ignorados.push({ nome: cliente.nome, email, motivo: "E-mail já usado por outro cliente." });
            continue;
          }
        }
        const outro = await prisma.portalAcesso.findUnique({ where: { email } });
        if (outro && outro.clienteId !== cliente.id) {
          ignorados.push({ nome: cliente.nome, email, motivo: "E-mail já usado por outro cliente." });
          continue;
        }
        const convite = novoConviteToken();
        await prisma.portalAcesso.upsert({
          where: { clienteId: cliente.id },
          create: {
            clienteId: cliente.id,
            email,
            conviteHash: convite.hash,
            conviteExpiraEm: expira,
          },
          update: {
            email,
            ativo: true,
            conviteHash: convite.hash,
            conviteExpiraEm: expira,
            ...(parsed.data.redefinir ? { senhaHash: null } : {}),
          },
        });
        criados.push({
          nome: cliente.nome,
          email,
          link: `${urlPublicaSite()}/pedidos?convite=${convite.token}`,
        });
      }
      res.json({ criados, ignorados });
    } catch (error) {
      console.error("[portal] convites", error);
      falha(res, 503, "Não foi possível gerar os convites.");
    }
  });

  app.use("/api/portal", (err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError) {
      falha(res, 400, "Os dados enviados não são válidos.");
      return;
    }
    next(err);
  });
}
