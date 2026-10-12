import type { PrismaClient } from "../comercial/generated/prisma/index.js";
import { validarCpf } from "@shared/terceirosPagamento";
import {
  atualizarPessoaNoContaAzul,
  formatarCep,
  formatarCnpj,
  type DadosEmpresa,
} from "./portalLoja";
import {
  clienteAceitouRecorrencia,
  minimoPorAceite,
  sincronizarContratoPendente,
} from "./contratoRecorrencia";

export type CadastroConta = {
  nome: string;
  nomeFantasia: string;
  cnpj: string;
  email: string;
  telefone: string;
  contato: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  inscricaoEstadual: string;
};

function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

function enderecoLinha(dados: CadastroConta): string {
  const complemento = dados.complemento ? ` ${dados.complemento}` : "";
  return `${dados.logradouro}, ${dados.numero}${complemento} - ${dados.bairro}, ${dados.cidade}/${dados.estado}, ${formatarCep(soDigitos(dados.cep))}`;
}

function paraEmpresa(dados: CadastroConta): DadosEmpresa {
  return {
    nome: dados.nome.trim(),
    nomeFantasia: dados.nomeFantasia.trim() || null,
    cnpj: soDigitos(dados.cnpj),
    email: dados.email.trim().toLowerCase(),
    telefone: dados.telefone.trim(),
    contato: dados.contato.trim(),
    cep: soDigitos(dados.cep),
    logradouro: dados.logradouro.trim(),
    numero: dados.numero.trim(),
    complemento: dados.complemento.trim() || null,
    bairro: dados.bairro.trim(),
    cidade: dados.cidade.trim(),
    estado: dados.estado.trim().toUpperCase(),
    inscricaoEstadual: dados.inscricaoEstadual.trim() || null,
  };
}

export function validarCadastroConta(dados: CadastroConta): string | null {
  const empresa = paraEmpresa(dados);
  if (empresa.nome.length < 3) return "Informe a razão social.";
  if (!empresa.email.includes("@")) return "Informe um e-mail válido.";
  if (empresa.telefone.length < 8) return "Informe o telefone.";
  if (empresa.contato.length < 3) return "Informe a pessoa de contato.";
  if (empresa.cep.length !== 8) return "Informe o CEP com 8 dígitos.";
  if (!empresa.logradouro || !empresa.numero || !empresa.bairro || !empresa.cidade) {
    return "Complete o endereço.";
  }
  if (!/^[A-Z]{2}$/.test(empresa.estado)) return "Informe a sigla do estado.";
  return null;
}

async function gravarContaLocal(prisma: PrismaClient, clienteId: string, dados: CadastroConta, acessoId: string) {
  const empresa = paraEmpresa(dados);
  const acesso = await prisma.portalAcesso.findUnique({ where: { id: acessoId } });
  if (acesso && acesso.email !== empresa.email) {
    const ocupado = await prisma.portalAcesso.findUnique({ where: { email: empresa.email } });
    if (ocupado && ocupado.id !== acesso.id) {
      throw new Error("Este e-mail já está em outra conta.");
    }
    await prisma.portalAcesso.update({ where: { id: acesso.id }, data: { email: empresa.email } });
  }
  await prisma.cliente.update({
    where: { id: clienteId },
    data: {
      nome: empresa.nome,
      emailPrincipal: empresa.email,
      telefoneWhatsapp: empresa.telefone,
      contatoPrincipal: empresa.contato,
      endereco: enderecoLinha(dados),
    },
  });
  await prisma.portalConta.upsert({
    where: { clienteId },
    create: {
      clienteId,
      nomeFantasia: empresa.nomeFantasia,
      telefone: empresa.telefone,
      contato: empresa.contato,
      cep: empresa.cep,
      logradouro: empresa.logradouro,
      numero: empresa.numero,
      complemento: empresa.complemento,
      bairro: empresa.bairro,
      cidade: empresa.cidade,
      estado: empresa.estado,
      inscricaoEstadual: empresa.inscricaoEstadual,
    },
    update: {
      nomeFantasia: empresa.nomeFantasia,
      telefone: empresa.telefone,
      contato: empresa.contato,
      cep: empresa.cep,
      logradouro: empresa.logradouro,
      numero: empresa.numero,
      complemento: empresa.complemento,
      bairro: empresa.bairro,
      cidade: empresa.cidade,
      estado: empresa.estado,
      inscricaoEstadual: empresa.inscricaoEstadual,
    },
  });
}

export async function lerConta(prisma: PrismaClient, acesso: { id: string; email: string; clienteId: string }) {
  const cliente = await prisma.cliente.findUnique({
    where: { id: acesso.clienteId },
    include: { portalConta: true, portalContrato: { include: { aceites: { orderBy: { aceitoEm: "desc" }, take: 1 } } } },
  });
  if (!cliente) throw new Error("Conta não encontrada.");
  const conta = cliente.portalConta;
  const cadastro: CadastroConta = {
    nome: cliente.nome,
    nomeFantasia: conta?.nomeFantasia ?? "",
    cnpj: cliente.cnpjCpf ?? "",
    email: acesso.email,
    telefone: conta?.telefone || cliente.telefoneWhatsapp || "",
    contato: conta?.contato || cliente.contatoPrincipal || "",
    cep: conta?.cep ?? "",
    logradouro: conta?.logradouro ?? "",
    numero: conta?.numero ?? "",
    complemento: conta?.complemento ?? "",
    bairro: conta?.bairro ?? "",
    cidade: conta?.cidade ?? "",
    estado: conta?.estado ?? "",
    inscricaoEstadual: conta?.inscricaoEstadual ?? "",
  };
  if (!cadastro.logradouro && cliente.endereco) cadastro.logradouro = cliente.endereco;
  const enderecoContrato = conta?.logradouro ? enderecoLinha(cadastro) : cliente.endereco;
  await sincronizarContratoPendente(prisma, cliente, enderecoContrato);
  const contrato = await prisma.portalContrato.findUnique({
    where: { clienteId: cliente.id },
    include: { aceites: { orderBy: { aceitoEm: "desc" }, take: 1 } },
  });
  const aceite = contrato?.aceites[0] ?? null;
  const aceito = contrato?.status === "ACEITO";
  return {
    cadastro,
    minimoReais: minimoPorAceite(aceito),
    contrato: contrato
      ? {
          versao: contrato.versao,
          texto: contrato.texto,
          status: contrato.status,
          aceite: aceite
            ? {
                aceitoEm: aceite.aceitoEm.toISOString(),
                representanteNome: aceite.representanteNome,
                representanteCpf: aceite.representanteCpf,
                representanteEmail: aceite.representanteEmail,
                ip: aceite.ip,
                userAgent: aceite.userAgent,
              }
            : null,
        }
      : null,
  };
}

export async function salvarConta(
  prisma: PrismaClient,
  acesso: { id: string; email: string; clienteId: string },
  dados: CadastroConta,
): Promise<{ aviso: string | null }> {
  const erro = validarCadastroConta(dados);
  if (erro) throw new Error(erro);
  const cliente = await prisma.cliente.findUnique({ where: { id: acesso.clienteId } });
  if (!cliente) throw new Error("Conta não encontrada.");
  await gravarContaLocal(prisma, cliente.id, { ...dados, cnpj: cliente.cnpjCpf ?? dados.cnpj }, acesso.id);
  await sincronizarContratoPendente(
    prisma,
    { id: cliente.id, nome: dados.nome.trim(), cnpjCpf: cliente.cnpjCpf, endereco: cliente.endereco },
    enderecoLinha(dados),
  );
  if (!cliente.externalId) {
    return { aviso: "Os dados foram salvos. Esta conta ainda não está ligada ao cadastro financeiro." };
  }
  try {
    await atualizarPessoaNoContaAzul(cliente.externalId, paraEmpresa({ ...dados, cnpj: soDigitos(cliente.cnpjCpf ?? "") }));
    return { aviso: null };
  } catch (error) {
    const texto = error instanceof Error ? error.message : "Falha ao atualizar o cadastro financeiro.";
    return { aviso: `Os dados foram salvos na conta. ${texto}` };
  }
}

export async function aceitarContrato(
  prisma: PrismaClient,
  acesso: { email: string; clienteId: string },
  input: {
    representanteNome: string;
    representanteCpf: string;
    representanteEmail: string;
    liEAceito: boolean;
    ip: string;
    userAgent: string;
  },
): Promise<void> {
  if (input.liEAceito !== true) throw new Error("É preciso aceitar o contrato.");
  const nome = input.representanteNome.trim();
  const email = input.representanteEmail.trim().toLowerCase();
  const cpf = soDigitos(input.representanteCpf);
  if (nome.length < 5) throw new Error("Informe o nome completo de quem aceita.");
  if (!validarCpf(cpf)) throw new Error("CPF de quem aceita está inválido.");
  if (!email.includes("@")) throw new Error("Informe o e-mail de quem aceita.");
  const cliente = await prisma.cliente.findUnique({ where: { id: acesso.clienteId } });
  if (!cliente) throw new Error("Conta não encontrada.");
  const conta = await prisma.portalConta.findUnique({ where: { clienteId: cliente.id } });
  const endereco = conta?.logradouro
    ? enderecoLinha({
        nome: cliente.nome,
        nomeFantasia: conta.nomeFantasia ?? "",
        cnpj: cliente.cnpjCpf ?? "",
        email: acesso.email,
        telefone: conta.telefone,
        contato: conta.contato,
        cep: conta.cep,
        logradouro: conta.logradouro,
        numero: conta.numero,
        complemento: conta.complemento ?? "",
        bairro: conta.bairro,
        cidade: conta.cidade,
        estado: conta.estado,
        inscricaoEstadual: conta.inscricaoEstadual ?? "",
      })
    : cliente.endereco;
  await sincronizarContratoPendente(prisma, cliente, endereco);
  const contrato = await prisma.portalContrato.findUnique({ where: { clienteId: cliente.id } });
  if (!contrato) throw new Error("O contrato ainda não está disponível.");
  if (contrato.status === "ACEITO") return;
  await prisma.$transaction([
    prisma.portalContratoAceite.create({
      data: {
        contratoId: contrato.id,
        clienteId: cliente.id,
        versao: contrato.versao,
        textoHash: contrato.textoHash,
        representanteNome: nome,
        representanteCpf: cpf,
        representanteEmail: email,
        empresaNome: cliente.nome,
        empresaCnpj: cliente.cnpjCpf ? formatarCnpj(soDigitos(cliente.cnpjCpf)) || cliente.cnpjCpf : "",
        ip: input.ip.slice(0, 64) || "não informado",
        userAgent: input.userAgent.slice(0, 512) || "não informado",
      },
    }),
    prisma.portalContrato.update({
      where: { id: contrato.id },
      data: { status: "ACEITO" },
    }),
  ]);
}

export async function minimoDaConta(prisma: PrismaClient, clienteId: string | null): Promise<number> {
  if (!clienteId) return minimoPorAceite(false);
  return minimoPorAceite(await clienteAceitouRecorrencia(prisma, clienteId));
}
