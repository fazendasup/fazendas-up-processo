// Seed demonstrativo: projeto "FUP - Piloto" com dados realistas para apresentação.
// Executar: pnpm db:seed-fup-piloto

import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida");
  process.exit(1);
}

const PROJETO_NOME = "FUP - Piloto";
const BOOTSTRAP_ONLY = process.argv.includes("--bootstrap");
const DEMO_PASSWORD = "Fup@2026";
const EXECUTOR_NOME = "Equipe FUP";
const MODULOS = ["estoque", "automacao", "inteligencia", "visao_cultivo"];

const FASES = {
  mudas: { perfis: 12, furosPorPerfil: 0, ec: 1.1, ph: 6.0 },
  vegetativa: { perfis: 12, furosPorPerfil: 9, ec: 1.55, ph: 6.0 },
  maturacao: { perfis: 6, furosPorPerfil: 6, ec: 1.85, ph: 5.9 },
};

const VARIEDADES = [
  {
    slug: "alface-crespa-verde",
    nome: "Alface Crespa Verde",
    diasGerminacao: 4,
    diasMudas: 13,
    diasVegetativa: 17,
    diasMaturacao: 12,
    yieldEsperadoGramas: 185,
    densidadePorPerfil: 36,
  },
  {
    slug: "alface-crespa-roxa",
    nome: "Alface Crespa Roxa",
    diasGerminacao: 5,
    diasMudas: 14,
    diasVegetativa: 18,
    diasMaturacao: 13,
    yieldEsperadoGramas: 175,
    densidadePorPerfil: 36,
  },
  {
    slug: "alface-americana",
    nome: "Alface Americana",
    diasGerminacao: 5,
    diasMudas: 15,
    diasVegetativa: 22,
    diasMaturacao: 16,
    yieldEsperadoGramas: 255,
    densidadePorPerfil: 30,
  },
  {
    slug: "alface-frisee",
    nome: "Alface Frisee",
    diasGerminacao: 5,
    diasMudas: 14,
    diasVegetativa: 19,
    diasMaturacao: 14,
    yieldEsperadoGramas: 165,
    densidadePorPerfil: 36,
  },
];

const FASES_CONFIG = [
  {
    fase: "mudas",
    label: "Mudas",
    ecMin: 0.9,
    ecMax: 1.2,
    phMin: 5.8,
    phMax: 6.2,
    cor: "oklch(0.65 0.19 160)",
    corLight: "oklch(0.92 0.08 160)",
    icon: "M",
  },
  {
    fase: "vegetativa",
    label: "Vegetativa",
    ecMin: 1.35,
    ecMax: 1.75,
    phMin: 5.7,
    phMax: 6.3,
    cor: "oklch(0.60 0.15 158)",
    corLight: "oklch(0.93 0.07 158)",
    icon: "V",
  },
  {
    fase: "maturacao",
    label: "Maturação",
    ecMin: 1.65,
    ecMax: 2.05,
    phMin: 5.7,
    phMax: 6.2,
    cor: "oklch(0.54 0.13 152)",
    corLight: "oklch(0.93 0.065 152)",
    icon: "C",
  },
];

const TORRES = [
  {
    slug: "fup-mudas-01",
    nome: "Mudas 01",
    fase: "mudas",
    numeroTorre: 1,
    numAndares: 12,
  },
  {
    slug: "fup-veg-01",
    nome: "Vegetativa 01",
    fase: "vegetativa",
    numeroTorre: 2,
    numAndares: 12,
  },
  {
    slug: "fup-veg-02",
    nome: "Vegetativa 02",
    fase: "vegetativa",
    numeroTorre: 3,
    numAndares: 12,
  },
  {
    slug: "fup-veg-03",
    nome: "Vegetativa 03",
    fase: "vegetativa",
    numeroTorre: 4,
    numAndares: 12,
  },
  {
    slug: "fup-mat-01",
    nome: "Maturação 01",
    fase: "maturacao",
    numeroTorre: 5,
    numAndares: 9,
  },
  {
    slug: "fup-mat-02",
    nome: "Maturação 02",
    fase: "maturacao",
    numeroTorre: 6,
    numAndares: 9,
  },
  {
    slug: "fup-mat-03",
    nome: "Maturação 03",
    fase: "maturacao",
    numeroTorre: 7,
    numAndares: 9,
  },
  {
    slug: "fup-mat-04",
    nome: "Maturação 04",
    fase: "maturacao",
    numeroTorre: 8,
    numAndares: 9,
  },
  {
    slug: "fup-mat-05",
    nome: "Maturação 05",
    fase: "maturacao",
    numeroTorre: 9,
    numAndares: 9,
  },
  {
    slug: "fup-mat-06",
    nome: "Maturação 06",
    fase: "maturacao",
    numeroTorre: 10,
    numAndares: 9,
  },
  {
    slug: "fup-mat-07",
    nome: "Maturação 07",
    fase: "maturacao",
    numeroTorre: 11,
    numAndares: 9,
  },
  {
    slug: "fup-mat-08",
    nome: "Maturação 08",
    fase: "maturacao",
    numeroTorre: 12,
    numAndares: 9,
  },
  {
    slug: "fup-mat-09",
    nome: "Maturação 09 - Alta densidade",
    fase: "maturacao",
    numeroTorre: 13,
    numAndares: 9,
    override: { maturacao: { perfis: 12, furosPorPerfil: 6 } },
  },
  {
    slug: "fup-mat-10",
    nome: "Maturação 10 - Alta densidade",
    fase: "maturacao",
    numeroTorre: 14,
    numAndares: 9,
    override: { maturacao: { perfis: 12, furosPorPerfil: 6 } },
  },
];

function daysFromNow(days, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function plusDays(date, days, hour = 12) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function mysqlUrlWithUtf8mb4(url) {
  let out = url.trim();
  if (!/[?&]charset=utf8/i.test(out)) {
    out = out.includes("?")
      ? `${out}&charset=utf8mb4`
      : `${out}?charset=utf8mb4`;
  }
  if (!/[?&]connectTimeout=/i.test(out)) {
    out += "&connectTimeout=10000";
  }
  return out;
}

function isNoSuchTable(err) {
  return err?.code === "ER_NO_SUCH_TABLE" || err?.errno === 1146;
}

async function exec(connection, sql, params = []) {
  const [result] = await connection.execute(sql, params);
  return result;
}

async function safeDeleteByProjeto(connection, table, projetoId) {
  try {
    await exec(connection, `DELETE FROM \`${table}\` WHERE projetoId = ?`, [
      projetoId,
    ]);
  } catch (err) {
    if (!isNoSuchTable(err)) throw err;
    console.warn(`Tabela opcional ausente, ignorando limpeza: ${table}`);
  }
}

async function resetOperationalData(connection, projetoId) {
  const tables = [
    "vision_training_samples",
    "vision_cultivo_analyses",
    "alert_events",
    "intelligent_alerts",
    "recommendation_rules",
    "registros_colheita",
    "tarefas",
    "transplantios",
    "manutencoes",
    "aplicacoes_andar",
    "furos",
    "perfis",
    "andares",
    "torres",
    "aplicacoes_caixa",
    "medicoes_caixa",
    "caixas_agua",
    "germinacao",
    "planos_plantio",
    "ciclos",
    "receitas_crescimento",
    "variedades",
    "fases_config",
    "estoque_itens",
    "aplicacoes_bancada",
    "medicoes_bancada",
    "caixas_bancada",
    "bancadas",
  ];
  for (const table of tables) {
    await safeDeleteByProjeto(connection, table, projetoId);
  }
}

async function countOperationalRows(connection, projetoId) {
  const tables = [
    "variedades",
    "fases_config",
    "caixas_agua",
    "torres",
    "receitas_crescimento",
    "planos_plantio",
    "estoque_itens",
  ];
  let total = 0;
  for (const table of tables) {
    try {
      const [rows] = await connection.execute(
        `SELECT COUNT(*) AS n FROM \`${table}\` WHERE projetoId = ?`,
        [projetoId]
      );
      total += Number(rows[0]?.n ?? 0);
    } catch (err) {
      if (!isNoSuchTable(err)) throw err;
    }
  }
  return total;
}

async function getOrCreateProjeto(connection) {
  const [existing] = await connection.execute(
    "SELECT id FROM projetos WHERE nome = ? ORDER BY status = 'ativo' DESC, id ASC LIMIT 1",
    [PROJETO_NOME]
  );
  if (existing.length > 0) {
    const id = Number(existing[0].id);
    await exec(
      connection,
      `UPDATE projetos
       SET tipo = 'fazenda_vertical',
           status = 'ativo',
           usarCaixaAgua = 1,
           descricao = ?,
           endereco = ?
       WHERE id = ?`,
      [
        "Projeto fictício para demonstração do sistema Fazendas Up em operação hidropônica vertical com alfaces.",
        "Unidade demonstrativa FUP - ambiente controlado, São Paulo/SP",
        id,
      ]
    );
    return { id, created: false };
  }

  const result = await exec(
    connection,
    `INSERT INTO projetos (nome, tipo, status, descricao, endereco, usarCaixaAgua)
     VALUES (?, 'fazenda_vertical', 'ativo', ?, ?, 1)`,
    [
      PROJETO_NOME,
      "Projeto fictício para demonstração do sistema Fazendas Up em operação hidropônica vertical com alfaces.",
      "Unidade demonstrativa FUP - ambiente controlado, São Paulo/SP",
    ]
  );
  return { id: Number(result.insertId), created: true };
}

async function ensureUser(
  connection,
  {
    name,
    email,
    role,
    projetoRole,
    password = DEMO_PASSWORD,
    overwritePassword = true,
  }
) {
  const normalizedEmail = email.trim().toLowerCase();
  const [existing] = await connection.execute(
    "SELECT id, passwordHash FROM users WHERE email = ? LIMIT 1",
    [normalizedEmail]
  );
  const shouldSetPassword = overwritePassword || !existing[0]?.passwordHash;
  const passwordHash = shouldSetPassword
    ? await bcrypt.hash(password, 10)
    : existing[0]?.passwordHash;

  if (existing.length > 0) {
    const id = Number(existing[0].id);
    await exec(
      connection,
      `UPDATE users
       SET name = ?, role = ?, loginMethod = 'password'${shouldSetPassword ? ", passwordHash = ?" : ""}
       WHERE id = ?`,
      shouldSetPassword ? [name, role, passwordHash, id] : [name, role, id]
    );
    return { id, projetoRole };
  }

  const openId = `local_${crypto.randomUUID()}`;
  const result = await exec(
    connection,
    `INSERT INTO users (openId, name, email, role, passwordHash, loginMethod, createdAt)
     VALUES (?, ?, ?, ?, ?, 'password', NOW())`,
    [openId, name, normalizedEmail, role, passwordHash]
  );
  return { id: Number(result.insertId), projetoRole };
}

async function ensureUsersAndMemberships(connection, projetoId) {
  const demoUsers = [
    {
      name: "Coordenador FUP Piloto",
      email: "gerente.fup@demo.local",
      role: "admin",
      projetoRole: "admin",
    },
    {
      name: "Operador Sala de Cultivo",
      email: "operador.fup@demo.local",
      role: "user",
      projetoRole: "operador",
    },
    {
      name: "Visitante Evento",
      email: "visitante.fup@demo.local",
      role: "user",
      projetoRole: "visualizador",
    },
  ];

  const createdUsers = [];
  for (const user of demoUsers) {
    createdUsers.push(await ensureUser(connection, user));
  }

  const [admins] = await connection.execute(
    "SELECT id FROM users WHERE role IN ('admin', 'platform_admin')"
  );
  const memberships = new Map();
  for (const user of createdUsers) memberships.set(user.id, user.projetoRole);
  for (const admin of admins) memberships.set(Number(admin.id), "admin");

  for (const [userId, role] of memberships.entries()) {
    await exec(
      connection,
      `INSERT INTO projeto_usuarios (projetoId, userId, role)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE role = VALUES(role)`,
      [projetoId, userId, role]
    );
  }

  return createdUsers[0]?.id ?? Number(admins[0]?.id ?? 1);
}

async function enableModules(connection, projetoId) {
  for (const modulo of MODULOS) {
    try {
      await exec(
        connection,
        `INSERT INTO projeto_modulos (projetoId, modulo, habilitado)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE habilitado = VALUES(habilitado)`,
        [projetoId, modulo]
      );
    } catch (err) {
      if (!isNoSuchTable(err)) throw err;
      console.warn(
        "Tabela projeto_modulos ausente; módulos serão tratados pelo fallback legado."
      );
      return;
    }
  }
}

async function insertVariedades(connection, projetoId) {
  const out = new Map();
  for (const v of VARIEDADES) {
    const result = await exec(
      connection,
      `INSERT INTO variedades (projetoId, slug, nome, diasMudas, diasVegetativa, diasMaturacao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        projetoId,
        v.slug,
        v.nome,
        v.diasMudas,
        v.diasVegetativa,
        v.diasMaturacao,
      ]
    );
    out.set(v.slug, { ...v, id: Number(result.insertId) });
  }
  return out;
}

async function insertFasesConfig(connection, projetoId) {
  for (const f of FASES_CONFIG) {
    await exec(
      connection,
      `INSERT INTO fases_config (projetoId, fase, label, ecMin, ecMax, phMin, phMax, cor, corLight, icon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projetoId,
        f.fase,
        f.label,
        f.ecMin,
        f.ecMax,
        f.phMin,
        f.phMax,
        f.cor,
        f.corLight,
        f.icon,
      ]
    );
  }
}

async function insertReceitas(connection, projetoId, variedades, executorId) {
  const receitas = new Map();
  for (const v of variedades.values()) {
    const ecPorFase = {
      mudas: { min: 0.9, max: 1.2 },
      vegetativa: {
        min: v.slug === "alface-americana" ? 1.45 : 1.35,
        max: v.slug === "alface-americana" ? 1.85 : 1.75,
      },
      maturacao: {
        min: v.slug === "alface-americana" ? 1.75 : 1.65,
        max: v.slug === "alface-americana" ? 2.15 : 2.05,
      },
    };
    const horasLuzPorFase = { mudas: 14, vegetativa: 16, maturacao: 15 };
    const result = await exec(
      connection,
      `INSERT INTO receitas_crescimento (
        projetoId, nome, variedadeId, metodoColheita, diasGerminacao, diasMudas, diasVegetativa, diasMaturacao,
        ecPorFase, ph, temperaturaMedia, umidadeMedia, horasLuzPorFase, densidadePorPerfil,
        yieldEsperadoGramas, observacoes, ativa, criadoPorId, criadoPorNome
      ) VALUES (?, ?, ?, 'corte_unico', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        projetoId,
        `Receita FUP - ${v.nome}`,
        v.id,
        v.diasGerminacao,
        v.diasMudas,
        v.diasVegetativa,
        v.diasMaturacao,
        JSON.stringify(ecPorFase),
        6.0,
        v.slug === "alface-americana" ? 20.5 : 21,
        v.slug === "alface-crespa-roxa" ? 66 : 68,
        JSON.stringify(horasLuzPorFase),
        v.densidadePorPerfil,
        v.yieldEsperadoGramas,
        "Receita demonstrativa baseada em cultivo NFT indoor com água entre 20 e 22 C.",
        executorId,
        EXECUTOR_NOME,
      ]
    );
    receitas.set(v.slug, Number(result.insertId));
  }
  return receitas;
}

function estruturaDaTorre(torre) {
  const base = FASES[torre.fase];
  const override = torre.override?.[torre.fase];
  return override ?? base;
}

function variedadePorIndice(variedades, index) {
  return Array.from(variedades.values())[index % variedades.size];
}

async function criarCaixa(connection, projetoId, torre) {
  const slug = `ca-${torre.slug}`;
  const result = await exec(
    connection,
    "INSERT INTO caixas_agua (projetoId, slug, nome, fase) VALUES (?, ?, ?, ?)",
    [projetoId, slug, `Reservatório ${torre.nome}`, torre.fase]
  );
  return {
    id: Number(result.insertId),
    slug,
    nome: `Reservatório ${torre.nome}`,
    fase: torre.fase,
  };
}

function shouldOccupyAndar(torre, numero) {
  if (torre.fase === "mudas") return numero <= 9;
  if (torre.fase === "vegetativa") return numero <= 10;
  if (torre.numeroTorre >= 13) return numero <= 7;
  return numero <= 8;
}

function dataEntradaPorFase(torre, andarNumero, variedade) {
  const restPatterns = {
    mudas: [0, 1, 2, 4, 6, 8, 10, 12, 3],
    vegetativa: [0, 1, 2, 3, 5, 7, 9, 11, 13, 15, 4, 6],
    maturacao: [0, 1, 2, 3, 5, 6, 8, 10, 12, 14, 4, 7, 9, 11, 15, 6, 8, 10],
  };
  const restPattern = restPatterns[torre.fase] ?? restPatterns.maturacao;
  const rawRest =
    restPattern[
      (Number(torre.numeroTorre || 0) + Number(andarNumero || 0) * 2) %
        restPattern.length
    ] ?? 8;
  const diasCiclo =
    torre.fase === "mudas"
      ? Number(variedade?.diasMudas ?? 14)
      : torre.fase === "vegetativa"
        ? Number(variedade?.diasVegetativa ?? 21)
        : Number(variedade?.diasMaturacao ?? 14);
  const minRest = rawRest <= 0 ? 0 : 1;
  const targetRest = Math.max(
    minRest,
    Math.min(rawRest, Math.max(minRest, diasCiclo - 1))
  );
  const elapsed = Math.max(0, diasCiclo - targetRest);
  return daysFromNow(-elapsed);
}

async function criarTorresEstrutura(
  connection,
  projetoId,
  variedades,
  receitas
) {
  const caixas = [];
  const torresCriadas = [];
  const andaresOcupados = [];

  for (const torre of TORRES) {
    const caixa = await criarCaixa(connection, projetoId, torre);
    caixas.push(caixa);

    const estrutura = estruturaDaTorre(torre);
    const result = await exec(
      connection,
      `INSERT INTO torres (
        projetoId, slug, nome, fase, numeroTorre, estruturaOverrideJson, numAndares, caixaAguaId, ativa
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        projetoId,
        torre.slug,
        torre.nome,
        torre.fase,
        torre.numeroTorre,
        torre.override ? JSON.stringify(torre.override) : null,
        torre.numAndares,
        caixa.id,
      ]
    );
    const torreId = Number(result.insertId);
    torresCriadas.push({ ...torre, id: torreId, caixaAguaId: caixa.id });

    for (let andarNumero = 1; andarNumero <= torre.numAndares; andarNumero++) {
      const ocupado = shouldOccupyAndar(torre, andarNumero);
      const variedade = variedadePorIndice(
        variedades,
        torre.numeroTorre + andarNumero
      );
      const dataEntrada = ocupado
        ? dataEntradaPorFase(torre, andarNumero, variedade)
        : null;
      const andarResult = await exec(
        connection,
        "INSERT INTO andares (projetoId, torreId, numero, dataEntrada, lavado) VALUES (?, ?, ?, ?, ?)",
        [projetoId, torreId, andarNumero, dataEntrada, ocupado ? 0 : 1]
      );
      const andarId = Number(andarResult.insertId);

      if (ocupado) {
        andaresOcupados.push({
          id: andarId,
          torreId,
          torre,
          numero: andarNumero,
          variedade,
          dataEntrada,
        });
      }

      for (let perfilIndex = 0; perfilIndex < estrutura.perfis; perfilIndex++) {
        await exec(
          connection,
          `INSERT INTO perfis (projetoId, andarId, perfilIndex, variedadeId, receitaId, ativo, dataEntrada, cultivoStatus)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            projetoId,
            andarId,
            perfilIndex,
            ocupado ? variedade.id : null,
            ocupado ? (receitas.get(variedade.slug) ?? null) : null,
            ocupado ? 1 : 0,
            dataEntrada,
            null,
          ]
        );

        for (
          let furoIndex = 0;
          furoIndex < estrutura.furosPorPerfil;
          furoIndex++
        ) {
          const variationEmpty =
            ocupado &&
            torre.fase !== "mudas" &&
            furoIndex === estrutura.furosPorPerfil - 1 &&
            (andarNumero + perfilIndex) % 11 === 0;
          await exec(
            connection,
            "INSERT INTO furos (projetoId, andarId, perfilIndex, furoIndex, status, variedadeId) VALUES (?, ?, ?, ?, ?, ?)",
            [
              projetoId,
              andarId,
              perfilIndex,
              furoIndex,
              ocupado && !variationEmpty ? "plantado" : "vazio",
              ocupado && !variationEmpty ? variedade.id : null,
            ]
          );
        }
      }
    }
  }

  return { caixas, torres: torresCriadas, andaresOcupados };
}

async function insertHistoricoSolucao(
  connection,
  projetoId,
  caixas,
  executorId
) {
  for (const [index, caixa] of caixas.entries()) {
    const faseCfg = FASES[caixa.fase];
    for (let i = 0; i < 3; i++) {
      await exec(
        connection,
        `INSERT INTO medicoes_caixa (projetoId, caixaAguaId, ec, ph, dataHora, executadoPorId, executadoPorNome)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          projetoId,
          caixa.id,
          Number((faseCfg.ec + (index % 3) * 0.03 - i * 0.02).toFixed(2)),
          Number((faseCfg.ph + (index % 2) * 0.04 - i * 0.01).toFixed(2)),
          daysFromNow(-i, 8 + (index % 7)),
          executorId,
          EXECUTOR_NOME,
        ]
      );
    }

    await exec(
      connection,
      `INSERT INTO aplicacoes_caixa (projetoId, caixaAguaId, tipo, produto, quantidade, dataHora, executadoPorId, executadoPorNome)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projetoId,
        caixa.id,
        caixa.fase === "mudas" ? "nutriente" : "correcao",
        caixa.fase === "mudas"
          ? "Solução nutritiva A/B diluída"
          : "Ajuste fino pH- + complemento cálcio",
        caixa.fase === "mudas"
          ? "180 ml A + 180 ml B"
          : "60 ml pH- + 220 ml cálcio",
        daysFromNow(-1, 10),
        executorId,
        EXECUTOR_NOME,
      ]
    );
  }
}

async function insertAplicacoesAndar(
  connection,
  projetoId,
  andaresOcupados,
  executorId
) {
  const selecionados = andaresOcupados
    .filter(a => a.torre.fase !== "mudas")
    .slice(0, 12);
  for (const [i, andar] of selecionados.entries()) {
    await exec(
      connection,
      `INSERT INTO aplicacoes_andar (projetoId, andarId, tipo, produto, quantidade, dataHora, executadoPorId, executadoPorNome)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projetoId,
        andar.id,
        i % 3 === 0 ? "biologico" : "inspecao",
        i % 3 === 0
          ? "Bacillus subtilis preventivo"
          : "Check visual de uniformidade",
        i % 3 === 0 ? "35 ml pulverizado" : "1 checklist",
        daysFromNow(-((i % 5) + 1), 9),
        executorId,
        EXECUTOR_NOME,
      ]
    );
  }
}

async function insertCiclos(connection, projetoId, executorId) {
  const ciclos = [
    {
      nome: "Reposição solução A/B - vegetativa",
      frequencia: "semanal",
      diasSemana: [1, 4],
      intervaloDias: null,
      produto: "FUP Nutri A/B",
      tipo: "Nutrição",
      dosagem: "280 ml A + 280 ml B por reservatório",
      fasesAplicaveis: ["vegetativa"],
      alvo: "caixa",
      ultimaExecucao: daysFromNow(-4),
    },
    {
      nome: "Correção pH e alcalinidade",
      frequencia: "personalizada",
      diasSemana: null,
      intervaloDias: 2,
      produto: "pH- ácido nítrico 38%",
      tipo: "Correção",
      dosagem: "40-80 ml conforme leitura",
      fasesAplicaveis: ["mudas", "vegetativa", "maturacao"],
      alvo: "caixa",
      ultimaExecucao: daysFromNow(-2),
    },
    {
      nome: "Biológico preventivo foliar",
      frequencia: "semanal",
      diasSemana: [2],
      intervaloDias: null,
      produto: "Bacillus subtilis",
      tipo: "Biológico",
      dosagem: "35 ml / torre",
      fasesAplicaveis: ["vegetativa", "maturacao"],
      alvo: "andar",
      ultimaExecucao: daysFromNow(-7),
    },
    {
      nome: "Limpeza preventiva de calhas",
      frequencia: "quinzenal",
      diasSemana: null,
      intervaloDias: null,
      produto: "Peróxido estabilizado 2%",
      tipo: "Sanitização",
      dosagem: "1 L por linha após esvaziamento",
      fasesAplicaveis: ["mudas", "vegetativa", "maturacao"],
      alvo: "ambos",
      ultimaExecucao: daysFromNow(-13),
    },
  ];

  const ids = [];
  for (const c of ciclos) {
    const result = await exec(
      connection,
      `INSERT INTO ciclos (
        projetoId, nome, frequencia, diasSemana, intervaloDias, produto, tipo, dosagem,
        fasesAplicaveis, alvo, ultimaExecucao, ultimoExecutorId, ultimoExecutorNome, ativo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        projetoId,
        c.nome,
        c.frequencia,
        c.diasSemana ? JSON.stringify(c.diasSemana) : null,
        c.intervaloDias,
        c.produto,
        c.tipo,
        c.dosagem,
        JSON.stringify(c.fasesAplicaveis),
        c.alvo,
        c.ultimaExecucao,
        executorId,
        EXECUTOR_NOME,
      ]
    );
    ids.push(Number(result.insertId));
  }
  return ids;
}

async function insertGerminacao(connection, projetoId, variedades, executorId) {
  const rows = Array.from(variedades.values()).map((v, i) => ({
    v,
    quantidade: [640, 580, 420, 520][i],
    plantioOffset: [-3, -5, -7, -1][i],
    germinadas: [602, 540, 390, 0][i],
    naoGerminadas: [18, 24, 16, 0][i],
    transplantadas: [0, 430, 380, 0][i],
    status: ["germinando", "pronto_mudas", "transplantado", "germinando"][i],
  }));

  for (const row of rows) {
    await exec(
      connection,
      `INSERT INTO germinacao (
        projetoId, variedadeId, variedadeNome, quantidade, dataPlantio, dataHora, diasParaTransplantio,
        germinadas, naoGerminadas, transplantadas, status, observacoes, executadoPorId, executadoPorNome
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projetoId,
        row.v.id,
        row.v.nome,
        row.quantidade,
        daysFromNow(row.plantioOffset),
        daysFromNow(row.plantioOffset, 7),
        row.v.diasGerminacao,
        row.germinadas,
        row.naoGerminadas,
        row.transplantadas,
        row.status,
        "Lote demonstrativo com bandejas identificadas por QR code e contagem parcial conferida.",
        executorId,
        EXECUTOR_NOME,
      ]
    );
  }
}

async function insertTransplantios(
  connection,
  projetoId,
  andaresOcupados,
  variedades,
  executorId
) {
  const destinos = andaresOcupados
    .filter(a => a.torre.fase !== "mudas")
    .slice(0, 6);
  for (const [i, destino] of destinos.entries()) {
    const v = variedadePorIndice(variedades, i);
    await exec(
      connection,
      `INSERT INTO transplantios (
        projetoId, dataHora, torreOrigemId, andarOrigemId, faseOrigem, faseDestino, variedadeId, variedadeNome,
        quantidadeTransplantada, quantidadeDesperdicio, motivoDesperdicio, torreDestinoId, andarDestinoId,
        observacoes, executadoPorId, executadoPorNome
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projetoId,
        daysFromNow(-(i + 2), 8),
        null,
        null,
        i < 2 ? "germinacao" : "mudas",
        destino.torre.fase,
        v.id,
        v.nome,
        destino.torre.fase === "maturacao" ? 180 : 108,
        i % 2 === 0 ? 4 : 2,
        i % 2 === 0 ? "raízes fracas" : "mudas fora do padrão",
        destino.torreId,
        destino.id,
        "Transplantio demonstrativo registrado com rastreabilidade de lote.",
        executorId,
        EXECUTOR_NOME,
      ]
    );
  }
}

async function insertPlanosPlantio(
  connection,
  projetoId,
  variedades,
  receitas,
  andaresOcupados,
  executorId
) {
  const destinos = andaresOcupados
    .filter(a => a.torre.fase === "maturacao")
    .slice(0, 8);
  const offsets = [-9, -4, 0, 3, 6, 10, 14, 21];
  for (let i = 0; i < offsets.length; i++) {
    const v = variedadePorIndice(variedades, i);
    const inicio = daysFromNow(offsets[i]);
    const muda = plusDays(inicio, v.diasGerminacao);
    const veg = plusDays(muda, v.diasMudas);
    const mat = plusDays(veg, v.diasVegetativa);
    const colheita = plusDays(mat, v.diasMaturacao);
    const status =
      offsets[i] < -5
        ? "em_producao"
        : offsets[i] <= 0
          ? "em_germinacao"
          : "planejado";
    const germinacaoFase =
      status === "planejado"
        ? "pendente"
        : offsets[i] <= -4
          ? "pronto_mudas"
          : "germinando";
    const destino = destinos[i % destinos.length];

    await exec(
      connection,
      `INSERT INTO planos_plantio (
        projetoId, receitaId, receitaNome, variedadeId, variedadeNome, quantidadePlantas,
        dataInicioGerminacao, dataTransplantioMudas, dataTransplantioVeg, dataTransplantioMat,
        dataColheitaPrevista, torreDestinoId, andarDestinoId, status, germinadas, naoGerminadas,
        transplantadasGerminacao, germinacaoFase, observacoes, criadoPorId, criadoPorNome
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projetoId,
        receitas.get(v.slug),
        `Receita FUP - ${v.nome}`,
        v.id,
        v.nome,
        v.slug === "alface-americana" ? 360 : 432,
        inicio,
        muda,
        veg,
        mat,
        colheita,
        destino?.torreId ?? null,
        destino?.id ?? null,
        status,
        status === "planejado" ? 0 : 390,
        status === "planejado" ? 0 : 18,
        status === "em_producao" ? 360 : 0,
        germinacaoFase,
        "Plano contínuo para demonstração: lotes escalonados para colheita semanal.",
        executorId,
        EXECUTOR_NOME,
      ]
    );
  }
}

async function insertManutencoes(connection, projetoId, torres, executorId) {
  const rows = [
    {
      torre: torres.find(t => t.fase === "maturacao"),
      andarNumero: 4,
      tipo: "iluminacao",
      descricao: "Driver LED com cintilação intermitente no andar 4.",
      abertura: -3,
      prazo: 1,
      status: "aberta",
    },
    {
      torre: torres.find(t => t.fase === "vegetativa"),
      andarNumero: null,
      tipo: "bomba",
      descricao:
        "Ruído acima do normal na bomba de recirculação do setor vegetativo.",
      abertura: -5,
      prazo: 0,
      status: "em_andamento",
    },
    {
      torre: torres.find(t => t.fase === "mudas"),
      andarNumero: 2,
      tipo: "limpeza",
      descricao: "Limpeza de bandejas pós-transplantio concluída.",
      abertura: -8,
      prazo: -6,
      status: "concluida",
      conclusao: -6,
      solucao:
        "Bandejas higienizadas com peróxido estabilizado e enxágue final.",
    },
  ];

  for (const row of rows) {
    if (!row.torre) continue;
    await exec(
      connection,
      `INSERT INTO manutencoes (
        projetoId, torreId, andarNumero, tipo, descricao, dataAbertura, prazo, dataConclusao, solucao, status,
        abertoPorId, abertoPorNome, concluidoPorId, concluidoPorNome
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projetoId,
        row.torre.id,
        row.andarNumero,
        row.tipo,
        row.descricao,
        daysFromNow(row.abertura),
        daysFromNow(row.prazo),
        row.conclusao == null ? null : daysFromNow(row.conclusao),
        row.solucao ?? null,
        row.status,
        executorId,
        EXECUTOR_NOME,
        row.conclusao == null ? null : executorId,
        row.conclusao == null ? null : EXECUTOR_NOME,
      ]
    );
  }
}

async function insertRegistrosColheita(
  connection,
  projetoId,
  andaresOcupados,
  receitas,
  executorId
) {
  const colheitas = andaresOcupados
    .filter(a => a.torre.fase === "maturacao")
    .slice(0, 6);
  for (const [i, andar] of colheitas.entries()) {
    const plantas = andar.variedade.slug === "alface-americana" ? 150 : 192;
    const peso = Math.round(
      plantas * andar.variedade.yieldEsperadoGramas * (0.92 + (i % 3) * 0.03)
    );
    await exec(
      connection,
      `INSERT INTO registros_colheita (
        projetoId, torreId, andarId, variedadeId, variedadeNome, receitaId, dataColheita,
        quantidadePlantas, pesoTotalGramas, qualidade, destino, observacoes, executadoPorId, executadoPorNome
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projetoId,
        andar.torreId,
        andar.id,
        andar.variedade.id,
        andar.variedade.nome,
        receitas.get(andar.variedade.slug) ?? null,
        daysFromNow(-(i + 1), 7),
        plantas,
        peso,
        i === 4 ? "B" : "A",
        i % 2 === 0
          ? "Evento FUP - degustação"
          : "Cliente piloto / mercado local",
        "Colheita demonstrativa com lote pesado e classificado.",
        executorId,
        EXECUTOR_NOME,
      ]
    );
  }
}

async function insertEstoque(connection, projetoId) {
  const itens = [
    [
      "sementes",
      "Semente Alface Crespa Verde peletizada",
      2.4,
      "kg",
      0.18,
      7,
      10,
      14,
      0.9,
      680,
      "Sementes Tecnoseed",
      "Lote SV-2409, germinação 96%.",
    ],
    [
      "sementes",
      "Semente Alface Crespa Roxa peletizada",
      1.8,
      "kg",
      0.12,
      7,
      12,
      14,
      0.7,
      720,
      "Sementes Tecnoseed",
      "Lote SR-2410, manter refrigerado.",
    ],
    [
      "sementes",
      "Semente Alface Americana peletizada",
      1.2,
      "kg",
      0.1,
      7,
      15,
      14,
      0.5,
      790,
      "Horti Prime Seeds",
      "Cultivar cabeça compacta para NFT.",
    ],
    [
      "sementes",
      "Semente Alface Frisee peletizada",
      1.4,
      "kg",
      0.11,
      7,
      15,
      14,
      0.5,
      760,
      "Horti Prime Seeds",
      "Boa tolerância a borda queimada.",
    ],
    [
      "substratos",
      "Espuma fenólica 2x2 cm",
      8200,
      "unidade",
      480,
      7,
      8,
      10,
      2500,
      0.18,
      "AgroFoam",
      "Cubos para germinação.",
    ],
    [
      "substratos",
      "Bandeja germinação 200 células",
      96,
      "unidade",
      8,
      14,
      7,
      10,
      24,
      28.5,
      "Cultivo Indoor BR",
      "Bandejas reutilizáveis higienizadas.",
    ],
    [
      "biologicos",
      "Bacillus subtilis concentrado",
      9.5,
      "l",
      0.35,
      7,
      9,
      10,
      2.5,
      88,
      "BioLab Verde",
      "Aplicação preventiva foliar.",
    ],
    [
      "biologicos",
      "Trichoderma harzianum",
      6,
      "kg",
      0.22,
      10,
      12,
      10,
      1.8,
      145,
      "BioLab Verde",
      "Uso no berçário e pós-limpeza.",
    ],
    [
      "nutrientes",
      "FUP Nutri A",
      78,
      "l",
      3.5,
      3,
      7,
      10,
      25,
      18.4,
      "NutriCrop",
      "Solução concentrada A.",
    ],
    [
      "nutrientes",
      "FUP Nutri B",
      74,
      "l",
      3.5,
      3,
      7,
      10,
      25,
      17.9,
      "NutriCrop",
      "Solução concentrada B.",
    ],
    [
      "nutrientes",
      "Nitrato de cálcio",
      46,
      "kg",
      2.4,
      5,
      8,
      10,
      14,
      11.8,
      "NutriCrop",
      "Complemento para maturação.",
    ],
    [
      "nutrientes",
      "pH- ácido nítrico 38%",
      18,
      "l",
      0.45,
      3,
      7,
      10,
      6,
      24.2,
      "Química Hidro",
      "Correção de pH.",
    ],
    [
      "embalagem",
      "Clamshell 250 g alface viva",
      3400,
      "unidade",
      420,
      7,
      12,
      10,
      1200,
      0.72,
      "Pack Verde",
      "Embalagem para evento e clientes piloto.",
    ],
    [
      "embalagem",
      "Etiqueta QR rastreabilidade",
      5200,
      "unidade",
      420,
      7,
      10,
      10,
      1500,
      0.08,
      "Pack Verde",
      "Etiqueta com lote e data de colheita.",
    ],
    [
      "embalagem",
      "Caixa transporte hortaliças",
      260,
      "unidade",
      42,
      7,
      10,
      10,
      80,
      5.4,
      "LogPack",
      "Caixas retornáveis sanitizáveis.",
    ],
  ];

  for (const item of itens) {
    await exec(
      connection,
      `INSERT INTO estoque_itens (
        projetoId, categoria, nome, quantidadeTotal, unidadeTipo, usoPorEvento, frequenciaDias,
        prazoEntregaDias, diasMargemCompra, nivelMinimo, precoUnitario, fornecedor, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projetoId, ...item]
    );
  }
}

async function insertTarefas(
  connection,
  projetoId,
  torres,
  caixas,
  ciclos,
  executorId
) {
  const torreMat = torres.find(t => t.fase === "maturacao");
  const torreVeg = torres.find(t => t.fase === "vegetativa");
  const caixaVeg = caixas.find(c => c.fase === "vegetativa");
  const rows = [
    [
      "Medir pH/EC reservatórios vegetativos",
      "Conferir leituras antes da abertura do evento.",
      "medicao",
      "alta",
      daysFromNow(0, 8),
      torreVeg?.id,
      null,
      caixaVeg?.id,
      ciclos[0],
      "pendente",
    ],
    [
      "Preparar colheita degustação",
      "Separar lotes demonstrativos apenas no dia do evento; maturação escalonada para não concentrar colheita antes da apresentação.",
      "colheita",
      "media",
      daysFromNow(3, 9),
      torreMat?.id,
      1,
      null,
      null,
      "pendente",
    ],
    [
      "Transplantar lote Crespa Roxa",
      "Mover bandejas prontas para a linha vegetativa 02.",
      "transplantio",
      "alta",
      daysFromNow(1, 9),
      torreVeg?.id,
      3,
      null,
      null,
      "pendente",
    ],
    [
      "Inspecionar driver LED maturação",
      "Checar cintilação no setor de maturação antes da visita técnica.",
      "manutencao",
      "media",
      daysFromNow(1, 14),
      torreMat?.id,
      4,
      null,
      null,
      "em_andamento",
    ],
    [
      "Comprar reposição clamshell",
      "Pedido sugerido pelo estoque para manter margem do evento.",
      "outro",
      "media",
      daysFromNow(3, 12),
      null,
      null,
      null,
      null,
      "pendente",
    ],
    [
      "Aplicar biológico preventivo",
      "Aplicação foliar em vegetativa e maturação conforme ciclo.",
      "ciclo",
      "media",
      daysFromNow(2, 7),
      torreVeg?.id,
      null,
      null,
      ciclos[2],
      "pendente",
    ],
    [
      "Lavar bandejas do berçário",
      "Higienização pós-transplantio concluída pela manhã.",
      "lavagem",
      "baixa",
      daysFromNow(-1, 9),
      torres.find(t => t.fase === "mudas")?.id,
      2,
      null,
      null,
      "concluida",
    ],
  ];

  for (const row of rows) {
    const [
      titulo,
      descricao,
      tipo,
      prioridade,
      vencimento,
      torreId,
      andarNumero,
      caixaAguaId,
      cicloId,
      status,
    ] = row;
    await exec(
      connection,
      `INSERT INTO tarefas (
        projetoId, titulo, descricao, tipo, prioridade, dataVencimento, torreId, andarNumero, caixaAguaId,
        cicloId, atribuidoParaId, atribuidoParaNome, status, concluidoPorId, concluidoPorNome, concluidoEm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projetoId,
        titulo,
        descricao,
        tipo,
        prioridade,
        vencimento,
        torreId ?? null,
        andarNumero ?? null,
        caixaAguaId ?? null,
        cicloId ?? null,
        executorId,
        EXECUTOR_NOME,
        status,
        status === "concluida" ? executorId : null,
        status === "concluida" ? EXECUTOR_NOME : null,
        status === "concluida" ? daysFromNow(0, 8) : null,
      ]
    );
  }
}

async function insertInteligencia(connection, projetoId, torres, executorId) {
  const regras = [
    [
      "Risco de atraso em germinação",
      "risco_atraso",
      "Lote em germinação acima do prazo esperado",
      "dias_em_germinacao > receita.diasGerminacao + 1",
      "Conferir vigor, umidade do substrato e programar descarte parcial se necessário.",
      "mudas",
      "alta",
      "alta",
    ],
    [
      "Estabilidade de pH fora da faixa",
      "lote_fora_padrao",
      "Medição de pH fora do intervalo da fase",
      "ph < fase.phMin OR ph > fase.phMax",
      "Executar correção gradual e repetir medição após recirculação.",
      null,
      "alta",
      "media",
    ],
    [
      "Manutenção crítica em iluminação",
      "manutencao_critica",
      "Manutenção aberta em torre de maturação",
      "status != 'concluida' AND tipo = 'iluminacao'",
      "Priorizar reparo para evitar perda de fotoperíodo.",
      "maturacao",
      "urgente",
      "alta",
    ],
  ];
  const ruleIds = [];
  for (const regra of regras) {
    const result = await exec(
      connection,
      `INSERT INTO recommendation_rules (
        projetoId, nome, tipo, gatilho, condicao, acaoSugerida, faseAplicavel, prioridadePadrao,
        severidadePadrao, ativo, versao, criadoPorId, criadoPorNome, aprovadoPorId, aprovadoPorNome,
        fonte, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?)`,
      [
        projetoId,
        regra[0],
        regra[1],
        regra[2],
        regra[3],
        regra[4],
        regra[5],
        regra[6],
        regra[7],
        executorId,
        EXECUTOR_NOME,
        executorId,
        EXECUTOR_NOME,
        "Seed FUP - Piloto",
        "Regra demonstrativa para evento de apresentação.",
      ]
    );
    ruleIds.push(Number(result.insertId));
  }

  const torreMat = torres.find(t => t.fase === "maturacao");
  const alertas = [
    {
      tipo: "manutencao_critica",
      severidade: "alta",
      prioridade: "urgente",
      titulo: "Iluminação com manutenção aberta na maturação",
      descricao:
        "A torre Maturação 01 possui manutenção de LED pendente e pode afetar uniformidade de cabeça.",
      entidadeTipo: "torre",
      entidadeId: torreMat?.id ?? null,
      entidadeNome: torreMat?.nome ?? "Maturação",
      fase: "maturacao",
      ruleId: ruleIds[2],
      sugestaoAcao:
        "Finalizar inspeção do driver LED antes do próximo fotoperíodo.",
    },
    {
      tipo: "lote_fora_padrao",
      severidade: "media",
      prioridade: "alta",
      titulo: "pH próximo ao limite em reservatório vegetativo",
      descricao:
        "A última leitura ficou em 6,04 e exige nova checagem no próximo turno.",
      entidadeTipo: "caixa_agua",
      entidadeId: null,
      entidadeNome: "Reservatórios vegetativos",
      fase: "vegetativa",
      ruleId: ruleIds[1],
      sugestaoAcao:
        "Repetir medição após recirculação e aplicar correção somente se houver tendência de alta.",
    },
  ];

  for (const alerta of alertas) {
    const hash = crypto
      .createHash("sha256")
      .update(`${projetoId}:${alerta.tipo}:${alerta.titulo}`)
      .digest("hex");
    const result = await exec(
      connection,
      `INSERT INTO intelligent_alerts (
        projetoId, tipo, severidade, prioridade, titulo, descricao, entidadeTipo, entidadeId, entidadeNome,
        fase, origem, ruleId, dadosSnapshot, sugestaoAcao, nivelConfianca, status, gerarTarefa, hashUnico
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'motor_regras', ?, ?, ?, 'alta', 'novo', 1, ?)`,
      [
        projetoId,
        alerta.tipo,
        alerta.severidade,
        alerta.prioridade,
        alerta.titulo,
        alerta.descricao,
        alerta.entidadeTipo,
        alerta.entidadeId,
        alerta.entidadeNome,
        alerta.fase,
        alerta.ruleId,
        JSON.stringify({ origem: "seed", apresentadoEmEvento: true }),
        alerta.sugestaoAcao,
        hash,
      ]
    );
    const alertaId = Number(result.insertId);
    await exec(
      connection,
      `INSERT INTO alert_events (projetoId, alertaId, eventoTipo, usuarioId, usuarioNome, observacao, dadosExtra)
       VALUES (?, ?, 'criado', ?, ?, ?, ?)`,
      [
        projetoId,
        alertaId,
        executorId,
        EXECUTOR_NOME,
        "Alerta demonstrativo criado pelo seed FUP - Piloto.",
        JSON.stringify({ seed: "fup-piloto" }),
      ]
    );
  }
}

async function insertVisao(connection, projetoId, executorId) {
  const imageBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
  const imageSha256 = crypto
    .createHash("sha256")
    .update(Buffer.from(imageBase64, "base64"))
    .digest("hex");
  try {
    const analysis = await exec(
      connection,
      `INSERT INTO vision_cultivo_analyses (
        projetoId, createdByUserId, torreSlug, variedadeNome, contextoNotas, mimeType, imageSha256,
        resultadoJson, modeloVersao, storageKey, imagemArmazenada
      ) VALUES (?, ?, ?, ?, ?, 'image/png', ?, ?, 'stub-v1', NULL, NULL)`,
      [
        projetoId,
        executorId,
        "fup-mat-01",
        "Alface Crespa Verde",
        "Imagem demonstrativa para histórico do módulo de visão.",
        imageSha256,
        JSON.stringify({
          status: "saude_ok",
          confianca: 0.91,
          achados: ["coloração uniforme", "sem sinais de praga"],
          recomendacao: "Manter receita atual e repetir análise em 48 horas.",
          modeloVersao: "stub-v1",
        }),
      ]
    );

    await exec(
      connection,
      `INSERT INTO vision_training_samples (
        projetoId, analysisId, createdByUserId, rotuloPrincipal, rotulosExtras, splitTreino,
        imagemSha256, imagemBase64, mimeType, confirmadoPorAdmin
      ) VALUES (?, ?, ?, 'saude_ok', ?, 'treino', ?, ?, 'image/png', 1)`,
      [
        projetoId,
        Number(analysis.insertId),
        executorId,
        JSON.stringify({ variedade: "Alface Crespa Verde", fase: "maturacao" }),
        imageSha256,
        imageBase64,
      ]
    );
  } catch (err) {
    if (!isNoSuchTable(err)) throw err;
    console.warn(
      "Tabelas de visão ausentes; histórico de visão não foi inserido."
    );
  }
}

async function seed() {
  const connection = await mysql.createConnection(
    mysqlUrlWithUtf8mb4(DATABASE_URL)
  );
  try {
    await connection.beginTransaction();

    const projeto = await getOrCreateProjeto(connection);
    await enableModules(connection, projeto.id);
    const executorId = await ensureUsersAndMemberships(connection, projeto.id);

    if (BOOTSTRAP_ONLY && !projeto.created) {
      const existingRows = await countOperationalRows(connection, projeto.id);
      if (existingRows > 0) {
        await connection.commit();
        console.log(
          `Bootstrap FUP - Piloto ignorado: projeto id=${projeto.id} já possui ${existingRows} linha(s) operacionais.`
        );
        return;
      }
    }

    await resetOperationalData(connection, projeto.id);

    const variedades = await insertVariedades(connection, projeto.id);
    await insertFasesConfig(connection, projeto.id);
    const receitas = await insertReceitas(
      connection,
      projeto.id,
      variedades,
      executorId
    );
    const { caixas, torres, andaresOcupados } = await criarTorresEstrutura(
      connection,
      projeto.id,
      variedades,
      receitas
    );
    await insertHistoricoSolucao(connection, projeto.id, caixas, executorId);
    await insertAplicacoesAndar(
      connection,
      projeto.id,
      andaresOcupados,
      executorId
    );
    const ciclos = await insertCiclos(connection, projeto.id, executorId);
    await insertGerminacao(connection, projeto.id, variedades, executorId);
    await insertTransplantios(
      connection,
      projeto.id,
      andaresOcupados,
      variedades,
      executorId
    );
    await insertPlanosPlantio(
      connection,
      projeto.id,
      variedades,
      receitas,
      andaresOcupados,
      executorId
    );
    await insertManutencoes(connection, projeto.id, torres, executorId);
    await insertRegistrosColheita(
      connection,
      projeto.id,
      andaresOcupados,
      receitas,
      executorId
    );
    await insertEstoque(connection, projeto.id);
    await insertTarefas(
      connection,
      projeto.id,
      torres,
      caixas,
      ciclos,
      executorId
    );
    await insertInteligencia(connection, projeto.id, torres, executorId);
    await insertVisao(connection, projeto.id, executorId);

    await connection.commit();
    console.log(
      `${BOOTSTRAP_ONLY ? "Bootstrap" : "Seed"} concluído: "${PROJETO_NOME}" (id=${projeto.id}, ${
        projeto.created ? "criado" : "atualizado"
      }).`
    );
    console.log(
      "Usuários demo: gerente.fup@demo.local, operador.fup@demo.local, visitante.fup@demo.local"
    );
    console.log(`Senha dos usuários demo: ${DEMO_PASSWORD}`);
  } catch (err) {
    await connection.rollback();
    console.error("Erro no seed FUP - Piloto:", err);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

seed();
