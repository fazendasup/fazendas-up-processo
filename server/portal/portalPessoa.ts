import { validarCpf, formatarCpf } from "@shared/terceirosPagamento";
import { createContaAzulHttp, contaAzulGet, contaAzulPatch, contaAzulPost } from "../comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "../comercial/integrations/conta-azul/sync.service";
import { getComercialPrisma } from "../comercial/db";
import { getComercialEnv } from "../comercial/env";
import { hashPassword } from "../comercial/lib/password";
import type { AxiosInstance } from "axios";
import { LojaErro } from "./portalLoja";

export type DadosPessoa = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  senha: string;
};

type PessoaCa = {
  id?: string;
  nome?: string;
  documento?: string;
  email?: string;
};

function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function documentoIgual(documento: string | null | undefined, cpf: string): boolean {
  return soDigitos(documento ?? "") === cpf;
}

/** Escolhe o cadastro Conta Azul mais útil quando o CPF já existe (às vezes há duplicatas). */
function escolherPessoaExistente(itens: PessoaCa[], cpf: string, email: string, preferidoId?: string | null): string | null {
  const mesmos = itens.filter((item) => item.id && documentoIgual(item.documento, cpf));
  if (mesmos.length === 0) return null;
  if (preferidoId) {
    const preferido = mesmos.find((item) => item.id === preferidoId);
    if (preferido?.id) return preferido.id;
  }
  const comEmail = mesmos.find((item) => (item.email ?? "").trim().toLowerCase() === email);
  if (comEmail?.id) return comEmail.id;
  const comAlgumEmail = mesmos.find((item) => (item.email ?? "").trim().includes("@"));
  if (comAlgumEmail?.id) return comAlgumEmail.id;
  return mesmos[0]?.id ?? null;
}

async function buscarPessoaPorCpf(http: AxiosInstance, cpf: string): Promise<PessoaCa[]> {
  const formatado = formatarCpf(cpf);
  const consultas = [
    `/v1/pessoas?tamanho_pagina=50&pagina=1&busca=${encodeURIComponent(cpf)}`,
    `/v1/pessoas?tamanho_pagina=50&pagina=1&busca=${encodeURIComponent(formatado)}`,
  ];
  const vistos = new Map<string, PessoaCa>();
  for (const path of consultas) {
    try {
      const resposta = await contaAzulGet<{ items?: PessoaCa[] }>(http, path);
      for (const item of resposta.items ?? []) {
        if (!item.id || !documentoIgual(item.documento, cpf)) continue;
        vistos.set(item.id, item);
      }
    } catch (error) {
      console.warn("[portal] busca pessoa Conta Azul", error);
    }
  }
  return [...vistos.values()];
}

async function atualizarContatoPessoaCa(
  http: AxiosInstance,
  pessoaId: string,
  dados: { nome: string; email: string; telefone: string },
): Promise<void> {
  try {
    await contaAzulPatch(http, `/v1/pessoas/${encodeURIComponent(pessoaId)}`, {
      nome: dados.nome,
      email: dados.email,
      telefone_celular: dados.telefone,
      ativo: true,
      perfis: [{ tipo_perfil: "Cliente" }],
    });
  } catch (error) {
    // Contato local já fica certo; o Conta Azul às vezes rejeita patch parcial.
    console.warn("[portal] atualizar pessoa Conta Azul", error);
  }
}

/**
 * Cria pessoa física no Conta Azul ou reaproveita se o CPF já existir.
 */
async function garantirPessoaFisicaContaAzul(
  dados: DadosPessoa,
  preferidoId?: string | null,
): Promise<string> {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new LojaErro(503, "O cadastro ainda não está disponível. Tente de novo em instantes.");
  }
  const http = createContaAzulHttp(env, cred.accessToken);
  const cpf = soDigitos(dados.cpf);
  const email = dados.email.trim().toLowerCase();
  const telefone = soDigitos(dados.telefone);

  const existentes = await buscarPessoaPorCpf(http, cpf);
  const reuso = escolherPessoaExistente(existentes, cpf, email, preferidoId);
  if (reuso) {
    await atualizarContatoPessoaCa(http, reuso, { nome: dados.nome, email, telefone });
    return reuso;
  }

  try {
    const criado = await contaAzulPost<{ id?: string }>(http, "/v1/pessoas", {
      nome: dados.nome,
      tipo_pessoa: "Física",
      cpf: formatarCpf(cpf),
      email,
      telefone_celular: telefone,
      ativo: true,
      perfis: [{ tipo_perfil: "Cliente" }],
    });
    if (!criado.id) throw new LojaErro(503, "O Conta Azul não confirmou o cadastro.");
    return criado.id;
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    if (/já existe.*cpf|cpf informado/i.test(mensagem)) {
      const deNovo = await buscarPessoaPorCpf(http, cpf);
      const id = escolherPessoaExistente(deNovo, cpf, email, preferidoId);
      if (id) {
        await atualizarContatoPessoaCa(http, id, { nome: dados.nome, email, telefone });
        return id;
      }
    }
    if (error instanceof LojaErro) throw error;
    console.error("[portal] pessoa Conta Azul", error);
    throw new LojaErro(503, "Não foi possível concluir o cadastro agora. Tente de novo em instantes.");
  }
}

/**
 * Cadastro leve de pessoa física: nome, CPF, e-mail, telefone e senha.
 * Sem endereço nem contrato. Entra já logável.
 */
export async function registrarPessoa(dados: DadosPessoa): Promise<{
  acessoId: string;
  clienteId: string;
  email: string;
  nome: string;
  cpf: string;
}> {
  const cpf = soDigitos(dados.cpf);
  const email = dados.email.trim().toLowerCase();
  const telefone = soDigitos(dados.telefone);
  const nome = dados.nome.trim();

  if (nome.length < 3) throw new LojaErro(400, "Informe seu nome completo.");
  if (!validarCpf(cpf)) throw new LojaErro(400, "Confira o CPF.");
  if (!email.includes("@") || email.length < 5) throw new LojaErro(400, "Informe um e-mail válido.");
  if (telefone.length < 10 || telefone.length > 13) throw new LojaErro(400, "Informe um telefone com DDD.");
  if (dados.senha.length < 8 || dados.senha.length > 72) {
    throw new LojaErro(400, "A senha precisa ter pelo menos 8 caracteres.");
  }

  const prisma = getComercialPrisma();
  const emailOcupado = await prisma.portalAcesso.findUnique({ where: { email } });
  if (emailOcupado) throw new LojaErro(409, "Este e-mail já tem conta. Entre com o CPF.");

  const ids = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM clientes
    WHERE cnpj_cpf IS NOT NULL
      AND REPLACE(REPLACE(REPLACE(REPLACE(cnpj_cpf, '.', ''), '/', ''), '-', ''), ' ', '') = ${cpf}
  `;
  let preferidoExternalId: string | null = null;
  if (ids[0]) {
    const existente = await prisma.cliente.findUnique({
      where: { id: ids[0].id },
      include: { portalAcesso: true },
    });
    if (existente?.portalAcesso) {
      throw new LojaErro(409, "Este CPF já tem conta. Entre com o CPF e a senha.");
    }
    preferidoExternalId = existente?.externalId?.trim() || null;
  }

  let contaAzulId: string;
  try {
    contaAzulId = await garantirPessoaFisicaContaAzul(
      { ...dados, cpf, email, telefone, nome },
      preferidoExternalId,
    );
  } catch (error) {
    if (error instanceof LojaErro) throw error;
    console.error("[portal] pessoa Conta Azul", error);
    throw new LojaErro(503, "Não foi possível concluir o cadastro agora. Tente de novo em instantes.");
  }

  const senhaHash = await hashPassword(dados.senha);
  const cpfFmt = formatarCpf(cpf);

  const cliente = ids[0]
    ? await prisma.cliente.update({
        where: { id: ids[0].id },
        data: {
          externalId: contaAzulId,
          nome,
          cnpjCpf: cpfFmt,
          emailPrincipal: email,
          telefoneWhatsapp: telefone,
          contatoPrincipal: nome,
          tipo: "AVULSO",
          statusRelacionamento: "ATIVO",
          tags: ["site", "pessoa"],
        },
      })
    : await prisma.cliente.create({
        data: {
          externalId: contaAzulId,
          nome,
          tipo: "AVULSO",
          cnpjCpf: cpfFmt,
          emailPrincipal: email,
          telefoneWhatsapp: telefone,
          contatoPrincipal: nome,
          statusRelacionamento: "ATIVO",
          tags: ["site", "pessoa"],
        },
      });

  const acesso = await prisma.portalAcesso.create({
    data: {
      clienteId: cliente.id,
      email,
      senhaHash,
      perfil: "PESSOA",
      ativo: true,
    },
  });

  await prisma.portalConta.upsert({
    where: { clienteId: cliente.id },
    create: {
      clienteId: cliente.id,
      telefone,
      contato: nome,
      cidade: "Manaus",
      estado: "AM",
    },
    update: {
      telefone,
      contato: nome,
    },
  });

  return {
    acessoId: acesso.id,
    clienteId: cliente.id,
    email,
    nome,
    cpf: cpfFmt,
  };
}

export function ehPerfilPessoa(perfil: string | null | undefined, cnpjCpf: string | null | undefined): boolean {
  if (perfil === "PESSOA") return true;
  if (perfil === "EMPRESA") return false;
  const digitos = soDigitos(cnpjCpf ?? "");
  return digitos.length === 11;
}

export { escolherPessoaExistente };
