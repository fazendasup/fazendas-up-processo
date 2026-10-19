import type { PrismaClient } from "../comercial/generated/prisma/index.js";
import { createContaAzulHttp, contaAzulGet, contaAzulPatch } from "../comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "../comercial/integrations/conta-azul/sync.service";
import { getComercialEnv } from "../comercial/env";
import { formatarCep, LojaErro } from "./portalLoja";

export type EnderecoEntrega = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export type PeriodoEntrega = "manha" | "tarde";

export const PERIODOS_ENTREGA: Record<PeriodoEntrega, string> = {
  manha: "Manhã (8h–12h)",
  tarde: "Tarde (13h–17h)",
};

function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

export function validarEnderecoEntrega(dados: EnderecoEntrega): EnderecoEntrega {
  const cep = soDigitos(dados.cep);
  const logradouro = dados.logradouro.trim();
  const numero = dados.numero.trim();
  const complemento = (dados.complemento ?? "").trim();
  const bairro = dados.bairro.trim();
  const cidade = dados.cidade.trim();
  const estado = dados.estado.trim().toUpperCase().slice(0, 2);
  if (cep.length !== 8) throw new LojaErro(400, "Informe um CEP válido.");
  if (logradouro.length < 2) throw new LojaErro(400, "Informe a rua ou avenida.");
  if (!numero) throw new LojaErro(400, "Informe o número.");
  if (bairro.length < 2) throw new LojaErro(400, "Informe o bairro.");
  if (cidade.length < 2) throw new LojaErro(400, "Informe a cidade.");
  if (estado.length !== 2) throw new LojaErro(400, "Informe o estado (UF).");
  return { cep, logradouro, numero, complemento, bairro, cidade, estado };
}

export function rotuloPeriodo(periodo: PeriodoEntrega): string {
  return PERIODOS_ENTREGA[periodo];
}

export function textoEndereco(endereco: EnderecoEntrega): string {
  const complemento = endereco.complemento ? `, ${endereco.complemento}` : "";
  return `${endereco.logradouro}, ${endereco.numero}${complemento} - ${endereco.bairro}, ${endereco.cidade}/${endereco.estado}, CEP ${formatarCep(endereco.cep)}`;
}

export async function lerEnderecoEntrega(prisma: PrismaClient, clienteId: string): Promise<EnderecoEntrega> {
  const conta = await prisma.portalConta.findUnique({ where: { clienteId } });
  return {
    cep: conta?.cep ?? "",
    logradouro: conta?.logradouro ?? "",
    numero: conta?.numero ?? "",
    complemento: conta?.complemento ?? "",
    bairro: conta?.bairro ?? "",
    cidade: conta?.cidade || "Manaus",
    estado: conta?.estado || "AM",
  };
}

export async function salvarEnderecoEntrega(
  prisma: PrismaClient,
  clienteId: string,
  bruto: EnderecoEntrega,
  telefone?: string | null,
  contato?: string | null,
): Promise<EnderecoEntrega> {
  const endereco = validarEnderecoEntrega(bruto);
  await prisma.portalConta.upsert({
    where: { clienteId },
    create: {
      clienteId,
      telefone: telefone?.trim() || "",
      contato: contato?.trim() || "",
      cep: formatarCep(endereco.cep),
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      complemento: endereco.complemento || null,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      estado: endereco.estado,
    },
    update: {
      cep: formatarCep(endereco.cep),
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      complemento: endereco.complemento || null,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      estado: endereco.estado,
      ...(telefone ? { telefone: telefone.trim() } : {}),
      ...(contato ? { contato: contato.trim() } : {}),
    },
  });
  return endereco;
}

/** Espelha o endereço de entrega no cadastro Conta Azul (melhor para cobrança/nota). */
export async function sincronizarEnderecoContaAzul(
  prisma: PrismaClient,
  pessoaId: string,
  endereco: EnderecoEntrega,
): Promise<void> {
  try {
    const env = getComercialEnv();
    const cred = await ensureValidAccessToken(prisma, env);
    if (!cred?.accessToken) return;
    const http = createContaAzulHttp(env, cred.accessToken);
    const detalhe = await contaAzulGet<{ enderecos?: Array<{ id?: string }> }>(
      http,
      `/v1/pessoas/${encodeURIComponent(pessoaId)}`,
    );
    const enderecoId = detalhe.enderecos?.[0]?.id;
    await contaAzulPatch(http, `/v1/pessoas/${encodeURIComponent(pessoaId)}`, {
      enderecos: [
        {
          ...(enderecoId ? { id: enderecoId } : {}),
          logradouro: endereco.logradouro,
          numero: endereco.numero,
          complemento: endereco.complemento || "Sem complemento",
          bairro: endereco.bairro,
          cidade: endereco.cidade,
          estado: endereco.estado,
          cep: formatarCep(endereco.cep),
          pais: "Brasil",
        },
      ],
    });
  } catch (error) {
    console.warn("[portal] sync endereço Conta Azul", error);
  }
}
