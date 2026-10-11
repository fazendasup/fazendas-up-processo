import { createContaAzulHttp, contaAzulPost } from "../comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "../comercial/integrations/conta-azul/sync.service";
import { getComercialPrisma } from "../comercial/db";
import { getComercialEnv } from "../comercial/env";
import type { PrismaClient } from "../comercial/generated/prisma/index.js";
import { fichaDoProduto } from "./vitrineCopy";

export type DadosEmpresa = {
  nome: string;
  nomeFantasia: string | null;
  cnpj: string;
  email: string;
  telefone: string;
  contato: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  inscricaoEstadual: string | null;
};

export function cnpjValido(valor: string): boolean {
  const cnpj = valor.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (base: string, factors: number[]) => {
    const total = factors.reduce((sum, factor, index) => sum + Number(base[index]) * factor, 0);
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const d1 = calc(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(cnpj.slice(0, 12) + String(d1), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${d1}${d2}`);
}

export function formatarCnpj(digitos: string): string {
  return digitos.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

function formatarCep(digitos: string): string {
  return digitos.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

let fichasProntas = false;

export async function preencherFichasDaVitrine(prisma: PrismaClient): Promise<void> {
  if (fichasProntas) return;
  const produtos = await prisma.produtoComercial.findMany({
    where: { importadoOperacao: true },
    select: { id: true, nome: true, descricaoLoja: true, aplicacaoLoja: true, imagemUrl: true },
  });
  for (const produto of produtos) {
    if (produto.descricaoLoja && produto.aplicacaoLoja && produto.imagemUrl) continue;
    const ficha = fichaDoProduto(produto.nome);
    await prisma.produtoComercial.update({
      where: { id: produto.id },
      data: {
        ...(produto.descricaoLoja ? {} : { descricaoLoja: ficha.descricao }),
        ...(produto.aplicacaoLoja ? {} : { aplicacaoLoja: ficha.aplicacao }),
        ...(produto.imagemUrl ? {} : { imagemUrl: ficha.foto }),
      },
    });
  }
  fichasProntas = true;
}

function corpoPessoa(dados: DadosEmpresa, comInscricao: boolean): Record<string, unknown> {
  const corpo: Record<string, unknown> = {
    nome: dados.nome,
    tipo_pessoa: "Jurídica",
    cnpj: formatarCnpj(dados.cnpj),
    email: dados.email,
    telefone_comercial: dados.telefone,
    telefone_celular: dados.telefone,
    ativo: true,
    perfis: [{ tipo_perfil: "Cliente" }],
    enderecos: [
      {
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento?.trim() || "Sem complemento",
        bairro: dados.bairro,
        cidade: dados.cidade,
        estado: dados.estado,
        cep: formatarCep(dados.cep),
        pais: "Brasil",
      },
    ],
  };
  if (dados.nomeFantasia) corpo.nome_fantasia = dados.nomeFantasia;
  if (comInscricao) {
    corpo.inscricoes = dados.inscricaoEstadual
      ? [{ indicador_inscricao_estadual: "CONTRIBUINTE", inscricao_estadual: dados.inscricaoEstadual }]
      : [{ indicador_inscricao_estadual: "NAO CONTRIBUINTE" }];
  }
  return corpo;
}

/** Cria a pessoa jurídica no Conta Azul e devolve o id. */
export async function criarPessoaNoContaAzul(dados: DadosEmpresa): Promise<string> {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new Error("O cadastro da fazenda ainda não está disponível. A equipe recebe os dados e conclui.");
  }
  const http = createContaAzulHttp(env, cred.accessToken);
  let criado: { id?: string };
  try {
    criado = await contaAzulPost(http, "/v1/pessoas", corpoPessoa(dados, true));
  } catch (error) {
    criado = await contaAzulPost(http, "/v1/pessoas", corpoPessoa(dados, false));
    if (!criado?.id) throw error;
  }
  if (!criado.id) throw new Error("O cadastro não foi confirmado.");
  return criado.id;
}

export class LojaErro extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function enderecoLinha(dados: DadosEmpresa): string {
  const complemento = dados.complemento ? ` ${dados.complemento}` : "";
  return `${dados.logradouro}, ${dados.numero}${complemento} - ${dados.bairro}, ${dados.cidade}/${dados.estado}, ${formatarCep(dados.cep)}`;
}

async function garantirAcesso(prisma: PrismaClient, clienteId: string, emailInformado: string, cnpj: string) {
  const existente = await prisma.portalAcesso.findUnique({ where: { clienteId } });
  if (existente) return existente;
  let email = emailInformado.includes("@") ? emailInformado.toLowerCase() : `${cnpj}@cnpj.fazendasup.com.br`;
  const ocupado = await prisma.portalAcesso.findUnique({ where: { email } });
  if (ocupado) email = `${cnpj}@cnpj.fazendasup.com.br`;
  return prisma.portalAcesso.create({ data: { clienteId, email, ativo: true } });
}

/** Grava a empresa, envia ao Conta Azul e abre o acesso com a senha inicial. */
export async function registrarEmpresa(dados: DadosEmpresa): Promise<{ pendente: boolean; mensagem: string }> {
  const prisma = getComercialPrisma();
  const ids = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM clientes
    WHERE cnpj_cpf IS NOT NULL
      AND REPLACE(REPLACE(REPLACE(REPLACE(cnpj_cpf, '.', ''), '/', ''), '-', ''), ' ', '') = ${dados.cnpj}
  `;
  const existente = ids[0]
    ? await prisma.cliente.findUnique({ where: { id: ids[0].id } })
    : null;
  if (existente?.externalId) {
    throw new LojaErro(409, "Esta empresa já está cadastrada. Entre com o CNPJ.");
  }

  const pedido = await prisma.portalCadastro.create({
    data: {
      nome: dados.nome,
      nomeFantasia: dados.nomeFantasia,
      cnpj: dados.cnpj,
      email: dados.email,
      telefone: dados.telefone,
      contato: dados.contato,
      cep: dados.cep,
      logradouro: dados.logradouro,
      numero: dados.numero,
      complemento: dados.complemento,
      bairro: dados.bairro,
      cidade: dados.cidade,
      estado: dados.estado,
      inscricaoEstadual: dados.inscricaoEstadual,
      status: "RECEBIDO",
    },
  });

  let contaAzulId: string;
  try {
    contaAzulId = await criarPessoaNoContaAzul(dados);
  } catch (error) {
    const texto = error instanceof Error ? error.message : "Falha ao enviar o cadastro.";
    await prisma.portalCadastro.update({
      where: { id: pedido.id },
      data: { status: "ERRO", erro: texto.slice(0, 2000) },
    });
    return { pendente: true, mensagem: "Recebemos os dados. A fazenda conclui o cadastro e libera a entrada." };
  }

  const cliente = existente
    ? await prisma.cliente.update({
        where: { id: existente.id },
        data: {
          externalId: contaAzulId,
          nome: dados.nome,
          cnpjCpf: formatarCnpj(dados.cnpj),
          endereco: enderecoLinha(dados),
          contatoPrincipal: dados.contato,
          emailPrincipal: dados.email,
          telefoneWhatsapp: dados.telefone,
          statusRelacionamento: "ATIVO",
        },
      })
    : await prisma.cliente.create({
        data: {
          externalId: contaAzulId,
          nome: dados.nome,
          tipo: "OUTROS",
          cnpjCpf: formatarCnpj(dados.cnpj),
          endereco: enderecoLinha(dados),
          contatoPrincipal: dados.contato,
          emailPrincipal: dados.email,
          telefoneWhatsapp: dados.telefone,
          statusRelacionamento: "ATIVO",
          tags: ["site"],
        },
      });
  await garantirAcesso(prisma, cliente.id, dados.email, dados.cnpj);
  await prisma.portalCadastro.update({
    where: { id: pedido.id },
    data: { status: "ENVIADO", contaAzulId, erro: null },
  });
  return {
    pendente: false,
    mensagem: "Empresa cadastrada. Entre com o CNPJ. A primeira senha são os 5 primeiros dígitos.",
  };
}

export async function reenviarCadastro(id: string): Promise<void> {
  const prisma = getComercialPrisma();
  const pedido = await prisma.portalCadastro.findUnique({ where: { id } });
  if (!pedido || pedido.status === "ENVIADO") return;
  const dados: DadosEmpresa = {
    nome: pedido.nome,
    nomeFantasia: pedido.nomeFantasia,
    cnpj: pedido.cnpj,
    email: pedido.email,
    telefone: pedido.telefone,
    contato: pedido.contato,
    cep: pedido.cep,
    logradouro: pedido.logradouro,
    numero: pedido.numero,
    complemento: pedido.complemento,
    bairro: pedido.bairro,
    cidade: pedido.cidade,
    estado: pedido.estado,
    inscricaoEstadual: pedido.inscricaoEstadual,
  };
  const contaAzulId = await criarPessoaNoContaAzul(dados);
  const existente = await prisma.cliente.findFirst({
    where: { cnpjCpf: formatarCnpj(dados.cnpj) },
  });
  const cliente = existente
    ? await prisma.cliente.update({
        where: { id: existente.id },
        data: { externalId: contaAzulId, statusRelacionamento: "ATIVO" },
      })
    : await prisma.cliente.create({
        data: {
          externalId: contaAzulId,
          nome: dados.nome,
          tipo: "OUTROS",
          cnpjCpf: formatarCnpj(dados.cnpj),
          endereco: enderecoLinha(dados),
          contatoPrincipal: dados.contato,
          emailPrincipal: dados.email,
          telefoneWhatsapp: dados.telefone,
          statusRelacionamento: "ATIVO",
          tags: ["site"],
        },
      });
  await garantirAcesso(prisma, cliente.id, dados.email, dados.cnpj);
  await prisma.portalCadastro.update({
    where: { id: pedido.id },
    data: { status: "ENVIADO", contaAzulId, erro: null },
  });
}
