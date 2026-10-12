import { createHash } from "node:crypto";
import type { PrismaClient } from "../comercial/generated/prisma/index.js";
import { MIN_ORDER_REAIS, MIN_ORDER_RECORRENTE_REAIS } from "./portalCalendario";

export const CONTRATO_RECORRENCIA_VERSAO = "2026-10-12";

/** Dados públicos da matriz. Nome fantasia Fazendas UP. */
export const FAZENDA_CONTRATO = {
  razaoSocial: "VISIONEER SOLUTION LTDA",
  nomeFantasia: "Fazendas UP",
  cnpj: "50.321.726/0001-02",
  endereco: "Avenida do Turismo, 10072G, Galpão G, Tarumã, Manaus/AM, CEP 69041-010",
};

export function hashContrato(texto: string): string {
  return createHash("sha256").update(texto, "utf8").digest("hex");
}

export function minimoPorAceite(aceito: boolean): number {
  return aceito ? MIN_ORDER_RECORRENTE_REAIS : MIN_ORDER_REAIS;
}

export function montarTextoContrato(input: {
  clienteNome: string;
  clienteCnpj: string;
  clienteEndereco: string;
}): string {
  const cliente = input.clienteNome.trim() || "Cliente";
  const cnpj = input.clienteCnpj.trim() || "CNPJ informado no cadastro";
  const endereco = input.clienteEndereco.trim() || "endereço informado no cadastro";
  return [
    "CONTRATO DE FORNECIMENTO RECORRENTE",
    `Versão ${CONTRATO_RECORRENCIA_VERSAO}`,
    "",
    "1. Partes",
    `De um lado, ${FAZENDA_CONTRATO.razaoSocial}, nome fantasia ${FAZENDA_CONTRATO.nomeFantasia}, CNPJ ${FAZENDA_CONTRATO.cnpj}, com sede em ${FAZENDA_CONTRATO.endereco}, chamada Fazenda.`,
    `De outro, ${cliente}, CNPJ ${cnpj}, com endereço ${endereco}, chamada Cliente. O aceite é feito pelo representante identificado no registro eletrônico, com nome, CPF e e-mail.`,
    "",
    "2. Objeto",
    "Fornecimento recorrente dos produtos disponíveis na conta do Cliente, nas quantidades e nas datas de entrega registradas nessa conta.",
    "",
    "3. Pedido avulso",
    "Sem este contrato aceito, cada pedido é avulso. O valor mínimo para entrega é de R$ 300,00. A primeira data disponível é o segundo dia útil seguinte, excluídos sábado, domingo e feriado de Manaus. Esse prazo corresponde a 48 horas em dia útil.",
    "",
    "4. Pedido recorrente",
    "Com este contrato aceito, o valor mínimo de cada entrega recorrente passa a R$ 150,00. A antecedência continua sendo de 2 dias úteis. O preço é o da conta no momento em que a entrega se torna firme: o preço negociado, quando houver, ou o preço de tabela.",
    "",
    "5. Entrega firme",
    "Cada entrega recorrente torna-se firme 24 horas antes do envio. Envio é a saída do produto da fazenda para a rota daquela data de entrega, contada no horário de Manaus. Até esse momento o Cliente pode cancelar a entrega ou encerrar a recorrência pela conta, sem cobrança daquela entrega.",
    "",
    "6. Produção e cobrança",
    "Passado o prazo da cláusula 5, a entrega entra na linha de produção, inclusive colheita, higienização e embalagem. O cancelamento deixa de ser possível e a cobrança do valor da entrega é gerada, porque o produto perecível já foi destinado àquele pedido. A cobrança é o preço dos itens da entrega, e não uma multa.",
    "",
    "7. Aceite eletrônico",
    "O Cliente aceita este contrato em meio eletrônico, na conta identificada pelo CNPJ, por representante com nome, CPF e e-mail informados no aceite. As partes reconhecem esse aceite como forma válida de assinatura. A Fazenda guarda a versão do texto, o código de integridade, a data e a hora em Manaus, o nome, o CPF e o e-mail de quem aceitou, o CNPJ da empresa, o endereço IP e o identificador do navegador. O Cliente pode guardar a cópia exibida no momento do aceite.",
    "",
    "8. Vigência",
    "O contrato vale por prazo indeterminado, a partir do aceite. O encerramento da recorrência produz efeito sobre as entregas que ainda não tenham se tornado firmes, na forma da cláusula 5. A atualização dos dados cadastrais não substitui o texto já aceito.",
    "",
    "9. Foro",
    "Fica eleito o foro da comarca de Manaus, Amazonas.",
  ].join("\n");
}

type ClienteContrato = {
  id: string;
  nome: string;
  cnpjCpf: string | null;
  endereco: string | null;
};

export async function sincronizarContratoPendente(
  prisma: PrismaClient,
  cliente: ClienteContrato,
  endereco?: string | null,
): Promise<boolean> {
  const texto = montarTextoContrato({
    clienteNome: cliente.nome,
    clienteCnpj: cliente.cnpjCpf ?? "",
    clienteEndereco: endereco ?? cliente.endereco ?? "",
  });
  const textoHash = hashContrato(texto);
  const atual = await prisma.portalContrato.findUnique({
    where: { clienteId: cliente.id },
    select: { status: true, textoHash: true },
  });
  if (atual?.status === "ACEITO") return false;
  if (atual?.textoHash === textoHash) return false;
  await prisma.portalContrato.upsert({
    where: { clienteId: cliente.id },
    create: {
      clienteId: cliente.id,
      versao: CONTRATO_RECORRENCIA_VERSAO,
      texto,
      textoHash,
      status: "PENDENTE",
    },
    update: {
      versao: CONTRATO_RECORRENCIA_VERSAO,
      texto,
      textoHash,
      status: "PENDENTE",
    },
  });
  return true;
}

let contratosPreparados = false;

/** Prepara o contrato de cada cliente que não está inativo. Não marca aceite. */
export async function garantirContratosDosClientesAtivos(prisma: PrismaClient): Promise<number> {
  if (contratosPreparados) return 0;
  const clientes = await prisma.cliente.findMany({
    where: { statusRelacionamento: { not: "INATIVO" } },
    select: { id: true, nome: true, cnpjCpf: true, endereco: true },
  });
  const contas = await prisma.portalConta.findMany({
    select: {
      clienteId: true,
      logradouro: true,
      numero: true,
      complemento: true,
      bairro: true,
      cidade: true,
      estado: true,
      cep: true,
    },
  });
  const porCliente = new Map(contas.map((conta) => [conta.clienteId, conta]));
  let preparados = 0;
  for (const cliente of clientes) {
    const conta = porCliente.get(cliente.id);
    const endereco = conta?.logradouro
      ? [
          conta.logradouro,
          conta.numero,
          conta.complemento,
          conta.bairro,
          conta.cidade && conta.estado ? `${conta.cidade}/${conta.estado}` : conta.cidade,
          conta.cep,
        ]
          .filter(Boolean)
          .join(", ")
      : null;
    if (await sincronizarContratoPendente(prisma, cliente, endereco)) preparados += 1;
  }
  contratosPreparados = true;
  return preparados;
}

export async function clienteAceitouRecorrencia(prisma: PrismaClient, clienteId: string): Promise<boolean> {
  const contrato = await prisma.portalContrato.findUnique({
    where: { clienteId },
    select: { status: true },
  });
  return contrato?.status === "ACEITO";
}
