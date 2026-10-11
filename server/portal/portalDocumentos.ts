import { getComercialPrisma } from "../comercial/db";
import { getComercialEnv } from "../comercial/env";
import { extratoReceberClienteCa } from "../comercial/lib/cliente-inadimplencia-ca";
import {
  contaAzulGet,
  contaAzulGetBytes,
  createContaAzulHttp,
} from "../comercial/integrations/conta-azul/conta-azul.client";
import { ensureValidAccessToken } from "../comercial/integrations/conta-azul/sync.service";
import { addCalendarDays, todayYmd } from "./portalCalendario";

export class DocumentoErro extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const STATUS_BOLETO_INUTIL = new Set([
  "CANCELADO",
  "INVALIDO",
  "EXPIRADO",
  "FALHA_EMISSAO",
  "FALHA_CANCELAR",
  "EM_CANCELAMENTO",
  "EXTORNADO",
]);

const ID_PARCELA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CHAVE_NFE = /^\d{44}$/;
const MAX_BYTES = 8_000_000;

export type SolicitacaoCobrancaResumo = {
  id?: string | null;
  tipo?: string | null;
  status?: string | null;
  idCliente?: string | null;
};

type ParcelaDetalhe = {
  id?: string;
  cliente?: { id?: string };
  data_vencimento?: string;
  evento?: {
    tipo?: string;
    referencia?: { id?: string; origem?: string };
  };
  id_boleto_bancario_autorizado?: string | null;
  id_ultimo_solicitacao_cobranca?: string | null;
  fatura?: { numero?: number; tipo_fatura?: string };
  solicitacoes_cobrancas?: Array<{
    id?: string;
    id_cliente?: string;
    tipo_solicitacao_cobranca?: string;
    status_solicitacao_cobranca?: string;
  }>;
};

type NotaItem = { chave_acesso?: string; numero_nota?: number };

type CacheCliente = { at: number; vencimentos: Map<string, string | null> };

const cacheTitulos = new Map<string, CacheCliente>();

export function lembrarTitulosDoCliente(
  contaAzulCustomerId: string,
  titulos: Array<{ id: string; vencimento: string | null }>,
) {
  const vencimentos = new Map<string, string | null>();
  for (const titulo of titulos) vencimentos.set(titulo.id, titulo.vencimento);
  cacheTitulos.set(contaAzulCustomerId, { at: Date.now(), vencimentos });
}

function boletoUtil(solicitacao: SolicitacaoCobrancaResumo): boolean {
  if (!solicitacao.id?.trim()) return false;
  if (!/BOLETO/i.test(solicitacao.tipo ?? "")) return false;
  return !STATUS_BOLETO_INUTIL.has((solicitacao.status ?? "").toUpperCase());
}

export function escolherCobrancaBoleto(input: {
  idBoletoAutorizado?: string | null;
  idUltimaCobranca?: string | null;
  solicitacoes: SolicitacaoCobrancaResumo[];
}): string | null {
  const autorizada = input.idBoletoAutorizado?.trim() ?? "";
  if (ID_PARCELA.test(autorizada)) return autorizada;
  const viva = [...input.solicitacoes].reverse().find(boletoUtil);
  if (viva?.id?.trim()) return viva.id.trim();
  const ultima = input.idUltimaCobranca?.trim();
  if (!ultima) return null;
  const encontrada = input.solicitacoes.find((item) => item.id?.trim() === ultima);
  if (!encontrada) return ultima;
  return boletoUtil(encontrada) ? ultima : null;
}

export function descreverArquivoFiscal(
  bytes: Buffer,
  contentType: string,
  numero: number | null,
  prefixo: "boleto" | "nota",
): { nome: string; contentType: string } {
  const base = numero ? `${prefixo}-${numero}` : prefixo;
  if (bytes.subarray(0, 4).toString("utf8") === "%PDF" || /pdf/i.test(contentType)) {
    return { nome: `${base}.pdf`, contentType: "application/pdf" };
  }
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return { nome: `${base}.zip`, contentType: "application/zip" };
  }
  return { nome: `${base}.xml`, contentType: "application/xml" };
}

async function httpCa() {
  const env = getComercialEnv();
  const prisma = getComercialPrisma();
  const cred = await ensureValidAccessToken(prisma, env);
  if (!cred?.accessToken) {
    throw new DocumentoErro(503, "Os pagamentos não carregaram agora. Tente de novo em instantes.");
  }
  return createContaAzulHttp(env, cred.accessToken);
}

async function vencimentosDoCliente(contaAzulCustomerId: string): Promise<Map<string, string | null>> {
  const salvo = cacheTitulos.get(contaAzulCustomerId);
  if (salvo && Date.now() - salvo.at < 45_000) return salvo.vencimentos;
  const hoje = todayYmd();
  const extrato = await extratoReceberClienteCa({
    contaAzulCustomerId,
    dataInicio: addCalendarDays(hoje, -180),
    dataFim: addCalendarDays(hoje, 90),
  });
  lembrarTitulosDoCliente(
    contaAzulCustomerId,
    extrato.titulos.map((titulo) => ({ id: titulo.id, vencimento: titulo.dataVencimento })),
  );
  return cacheTitulos.get(contaAzulCustomerId)?.vencimentos ?? new Map();
}

async function parcelaDoCliente(contaAzulCustomerId: string, parcelaId: string): Promise<ParcelaDetalhe> {
  if (!ID_PARCELA.test(parcelaId)) {
    throw new DocumentoErro(404, "Este pagamento não foi encontrado nesta conta.");
  }
  const vencimentos = await vencimentosDoCliente(contaAzulCustomerId);
  if (!vencimentos.has(parcelaId)) {
    throw new DocumentoErro(404, "Este pagamento não foi encontrado nesta conta.");
  }
  const http = await httpCa();
  let detalhe: ParcelaDetalhe;
  try {
    detalhe = await contaAzulGet<ParcelaDetalhe>(
      http,
      `/v1/financeiro/eventos-financeiros/parcelas/${encodeURIComponent(parcelaId)}`,
    );
  } catch {
    throw new DocumentoErro(503, "Não foi possível baixar agora. Tente de novo em instantes.");
  }
  const donoDireto = detalhe.cliente?.id?.trim();
  if (donoDireto && donoDireto !== contaAzulCustomerId) {
    throw new DocumentoErro(404, "Este pagamento não foi encontrado nesta conta.");
  }
  const donos = (detalhe.solicitacoes_cobrancas ?? [])
    .map((item) => item.id_cliente?.trim())
    .filter((id): id is string => Boolean(id));
  if (donos.length > 0 && !donos.includes(contaAzulCustomerId)) {
    throw new DocumentoErro(404, "Este pagamento não foi encontrado nesta conta.");
  }
  if (detalhe.evento?.tipo && detalhe.evento.tipo !== "RECEITA") {
    throw new DocumentoErro(404, "Este pagamento não foi encontrado nesta conta.");
  }
  return detalhe;
}

async function baixarBoleto(detalhe: ParcelaDetalhe): Promise<{ bytes: Buffer; contentType: string; nome: string }> {
  const cobrancaId = escolherCobrancaBoleto({
    idBoletoAutorizado: detalhe.id_boleto_bancario_autorizado,
    idUltimaCobranca: detalhe.id_ultimo_solicitacao_cobranca,
    solicitacoes: (detalhe.solicitacoes_cobrancas ?? []).map((item) => ({
      id: item.id,
      tipo: item.tipo_solicitacao_cobranca,
      status: item.status_solicitacao_cobranca,
      idCliente: item.id_cliente,
    })),
  });
  if (!cobrancaId || !ID_PARCELA.test(cobrancaId)) {
    throw new DocumentoErro(404, "Este pagamento ainda não tem boleto para baixar.");
  }
  const http = await httpCa();
  let arquivo: { status: number; data: Buffer; contentType: string };
  try {
    arquivo = await contaAzulGetBytes(
      http,
      `/v1/financeiro/eventos-financeiros/contas-a-receber/cobranca/${encodeURIComponent(cobrancaId)}/imprimir`,
    );
  } catch {
    throw new DocumentoErro(503, "Não foi possível baixar o boleto agora. Tente de novo em instantes.");
  }
  const pdf = arquivo.status === 200 && arquivo.data.subarray(0, 4).toString("utf8") === "%PDF" && arquivo.data.length <= MAX_BYTES;
  if (!pdf) {
    throw new DocumentoErro(404, "Este pagamento ainda não tem boleto para baixar.");
  }
  return { bytes: arquivo.data, contentType: "application/pdf", nome: "boleto.pdf" };
}

async function listarNotas(
  http: ReturnType<typeof createContaAzulHttp>,
  params: URLSearchParams,
): Promise<NotaItem[]> {
  const resposta = await contaAzulGet<{ itens?: NotaItem[] }>(http, `/v1/notas-fiscais?${params.toString()}`);
  return resposta.itens ?? [];
}

function escolherNota(itens: NotaItem[], numero: number | null): NotaItem | null {
  const validas = itens.filter((item) => CHAVE_NFE.test(item.chave_acesso ?? ""));
  if (numero != null) {
    const igual = validas.find((item) => item.numero_nota === numero);
    if (igual) return igual;
  }
  return validas[0] ?? null;
}

async function baixarNota(
  detalhe: ParcelaDetalhe,
  cnpj: string | null,
  vencimento: string | null,
): Promise<{ bytes: Buffer; contentType: string; nome: string }> {
  const origem = detalhe.evento?.referencia?.origem ?? "";
  const vendaId =
    detalhe.evento?.referencia?.id && /VENDA/.test(origem) && ID_PARCELA.test(detalhe.evento.referencia.id)
      ? detalhe.evento.referencia.id
      : null;
  const numero = Number.isFinite(Number(detalhe.fatura?.numero)) ? Number(detalhe.fatura?.numero) : null;
  const documento = (cnpj ?? "").replace(/\D/g, "");
  const ancora = vencimento?.slice(0, 10) || detalhe.data_vencimento?.slice(0, 10) || todayYmd();
  const paramsBase = {
    data_inicial: addCalendarDays(ancora, -120),
    data_final: addCalendarDays(ancora, 45),
    pagina: "1",
    tamanho_pagina: "20",
  };
  const http = await httpCa();
  let nota: NotaItem | null = null;
  let falhas = 0;
  const tentar = async (extra: Record<string, string>) => {
    const params = new URLSearchParams(paramsBase);
    for (const [chave, valor] of Object.entries(extra)) params.set(chave, valor);
    try {
      return escolherNota(await listarNotas(http, params), numero);
    } catch {
      falhas += 1;
      return null;
    }
  };
  if (vendaId) nota = await tentar({ id_venda: vendaId });
  if (!nota && numero && documento) {
    nota = await tentar({ numero_nota: String(numero), documento_tomador: documento });
  }
  if (!nota && falhas > 0) {
    throw new DocumentoErro(503, "Não foi possível baixar a nota agora. Tente de novo em instantes.");
  }
  const chave = nota?.chave_acesso ?? "";
  if (!CHAVE_NFE.test(chave)) {
    throw new DocumentoErro(404, "Este pagamento ainda não tem nota fiscal para baixar.");
  }
  let arquivo: { status: number; data: Buffer; contentType: string };
  try {
    arquivo = await contaAzulGetBytes(http, `/v1/notas-fiscais/${chave}`);
  } catch {
    throw new DocumentoErro(503, "Não foi possível baixar a nota agora. Tente de novo em instantes.");
  }
  if (arquivo.status !== 200 || arquivo.data.length < 32 || arquivo.data.length > MAX_BYTES) {
    throw new DocumentoErro(404, "Este pagamento ainda não tem nota fiscal para baixar.");
  }
  const descrito = descreverArquivoFiscal(arquivo.data, arquivo.contentType, nota?.numero_nota ?? numero, "nota");
  return { bytes: arquivo.data, contentType: descrito.contentType, nome: descrito.nome };
}

export async function baixarDocumentoCliente(input: {
  contaAzulCustomerId: string;
  cnpj: string | null;
  parcelaId: string;
  tipo: "boleto" | "nota";
}): Promise<{ bytes: Buffer; contentType: string; nome: string }> {
  const detalhe = await parcelaDoCliente(input.contaAzulCustomerId, input.parcelaId);
  if (input.tipo === "boleto") return baixarBoleto(detalhe);
  const vencimento = (await vencimentosDoCliente(input.contaAzulCustomerId)).get(input.parcelaId) ?? null;
  return baixarNota(detalhe, input.cnpj, vencimento);
}
