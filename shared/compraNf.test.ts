import { describe, expect, it } from "vitest";
import {
  agregarComprasPorFornecedor,
  parseNfeXml,
  type CompraNfItemRow,
} from "./compraNf";

const XML_SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe35260112345678000190550010000001231000001234">
      <ide>
        <nNF>123</nNF>
        <serie>1</serie>
        <dhEmi>2026-09-10T08:15:00-03:00</dhEmi>
      </ide>
      <emit>
        <CNPJ>12345678000190</CNPJ>
        <xNome>HORTA DO VALE LTDA</xNome>
      </emit>
      <dest>
        <CNPJ>99888777000166</CNPJ>
        <xNome>FAZENDAS UP</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>A1</cProd>
          <xProd>ALFACE AMERICANA KG</xProd>
          <uCom>KG</uCom>
          <qCom>25.5000</qCom>
          <vUnCom>8.00</vUnCom>
          <vProd>204.00</vProd>
        </prod>
      </det>
      <det nItem="2">
        <prod>
          <cProd>R1</cProd>
          <xProd>RUCULA MAÇO</xProd>
          <uCom>UN</uCom>
          <qCom>40</qCom>
          <vUnCom>2.50</vUnCom>
          <vProd>100.00</vProd>
        </prod>
      </det>
      <total><ICMSTot><vNF>304.00</vNF></ICMSTot></total>
    </infNFe>
  </NFe>
</nfeProc>`;

describe("compraNf parse + agregação", () => {
  it("parseia XML de NF-e com emitente e itens", () => {
    const p = parseNfeXml(XML_SAMPLE);
    expect(p.fornecedorNome).toBe("HORTA DO VALE LTDA");
    expect(p.fornecedorCnpj).toBe("12345678000190");
    expect(p.dataEmissao).toBe("2026-09-10");
    expect(p.numero).toBe("123");
    expect(p.chaveAcesso).toBe("35260112345678000190550010000001231000001234");
    expect(p.itens).toHaveLength(2);
    expect(p.itens[0]!.descricao).toMatch(/ALFACE/i);
    expect(p.itens[0]!.quantidade).toBe(25.5);
    expect(p.itens[0]!.unidade).toBe("KG");
  });

  it("agrega só alface por fornecedor", () => {
    const itens: CompraNfItemRow[] = [
      {
        id: 1,
        compraNfId: 10,
        descricao: "ALFACE AMERICANA KG",
        quantidade: 25.5,
        unidade: "KG",
        valorTotal: 204,
        dataEmissao: "2026-09-10",
        fornecedorNome: "HORTA DO VALE LTDA",
        numero: "123",
        chaveAcesso: null,
        fonte: "xml",
      },
      {
        id: 2,
        compraNfId: 10,
        descricao: "RUCULA MAÇO",
        quantidade: 40,
        unidade: "UN",
        valorTotal: 100,
        dataEmissao: "2026-09-10",
        fornecedorNome: "HORTA DO VALE LTDA",
        numero: "123",
        chaveAcesso: null,
        fonte: "xml",
      },
      {
        id: 3,
        compraNfId: 11,
        descricao: "Alface Crespa",
        quantidade: 10,
        unidade: "KG",
        valorTotal: 80,
        dataEmissao: "2026-09-12",
        fornecedorNome: "FOLHAS SP",
        numero: "50",
        chaveAcesso: null,
        fonte: "xml",
      },
    ];
    const agg = agregarComprasPorFornecedor(itens, "alface");
    expect(agg.totais.quantidade).toBe(35.5);
    expect(agg.totais.notas).toBe(2);
    expect(agg.fornecedores).toHaveLength(2);
    expect(agg.fornecedores[0]!.fornecedor).toBe("HORTA DO VALE LTDA");
    expect(agg.fornecedores[0]!.quantidade).toBe(25.5);
    expect(agg.produtos.every(p => /alface/i.test(p.produto))).toBe(true);
  });
});
