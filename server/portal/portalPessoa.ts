import { validarCpf, formatarCpf } from "@shared/terceirosPagamento";
import { createContaAzulHttp, contaAzulPost } from "../comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "../comercial/integrations/conta-azul/sync.service";
import { getComercialPrisma } from "../comercial/db";
import { getComercialEnv } from "../comercial/env";
import { hashPassword } from "../comercial/lib/password";
import { LojaErro } from "./portalLoja";

export type DadosPessoa = {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  senha: string;
};

function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

async function criarPessoaFisicaContaAzul(dados: DadosPessoa): Promise<string> {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new LojaErro(503, "O cadastro ainda não está disponível. Tente de novo em instantes.");
  }
  const http = createContaAzulHttp(env, cred.accessToken);
  const criado = await contaAzulPost<{ id?: string }>(http, "/v1/pessoas", {
    nome: dados.nome,
    tipo_pessoa: "Física",
    cpf: formatarCpf(dados.cpf),
    email: dados.email,
    telefone_celular: dados.telefone,
    ativo: true,
    perfis: [{ tipo_perfil: "Cliente" }],
  });
  if (!criado.id) throw new LojaErro(503, "O Conta Azul não confirmou o cadastro.");
  return criado.id;
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
  if (ids[0]) {
    const existente = await prisma.cliente.findUnique({
      where: { id: ids[0].id },
      include: { portalAcesso: true },
    });
    if (existente?.portalAcesso) {
      throw new LojaErro(409, "Este CPF já tem conta. Entre com o CPF e a senha.");
    }
  }

  let contaAzulId: string;
  try {
    contaAzulId = await criarPessoaFisicaContaAzul({ ...dados, cpf, email, telefone, nome });
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
