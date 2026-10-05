/**
 * Fazendas UP — Gerador POP/FIT
 * App principal: render, edição, fotos, salvar, exportar PDF
 */
const STORAGE_KEY = 'fazendas-up-pop-fit-v16';
const CONTENT_REV = 52;
const VIEW_KEY = 'fazendas-up-current-view';
const APP_DOC_TITLE = 'Fazendas UP — Gerador POP & FIT';
let titleBeforePrint = APP_DOC_TITLE;

let state = structuredClone(DEFAULT_DATA);
let currentView = 'pop';
const NEW_SECTOR_KEYS = ['lavagem', 'secagem', 'embalagem', 'plantioAlface', 'plantioMicroverdes', 'torresProducao'];

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  try {
    loadState();
    bindNavigation();
    bindToolbar();
    // Render imediatamente (ícones via <img> fallback) — não esperar CDN
    renderAll();
    flashMsg('Carregando ícones…');
    try {
      await preloadIcons(4000);
      renderAll();
    } catch (e) {
      console.warn('Preload de ícones falhou', e);
    }
    flashMsg('');
  } catch (e) {
    console.error('Falha ao iniciar o gerador:', e);
    flashMsg('Erro ao carregar — use Restaurar padrão');
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      prepareAndPrint();
    }
  });
});

function loadState() {
  try {
    const keys = [
      STORAGE_KEY,
      'fazendas-up-pop-fit-v16',
      'fazendas-up-pop-fit-v15',
      'fazendas-up-pop-fit-v14',
      'fazendas-up-pop-fit-v13',
      'fazendas-up-pop-fit-v12',
      'fazendas-up-pop-fit-v11',
      'fazendas-up-pop-fit-v10',
      'fazendas-up-pop-fit-v9',
    ];
    let saved = null;
    let savedLogo = null;
    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw);
        if (!saved) saved = parsed;
        if (!savedLogo && parsed?.empresa?.logo) savedLogo = parsed.empresa.logo;
      } catch (_) { /* ignore */ }
    }
    state = structuredClone(DEFAULT_DATA);
    if (saved) state = deepMerge(state, saved);
    if (savedLogo && !state.empresa?.logo) {
      if (!state.empresa) state.empresa = { ...DEFAULT_DATA.empresa };
      state.empresa.logo = savedLogo;
    }
    ensureState();
  } catch (e) {
    console.warn('Erro ao carregar dados, usando padrão.', e);
    state = structuredClone(DEFAULT_DATA);
    ensureState();
  }
}

/** Garante que todos os campos obrigatórios existam (corrige cache antigo do navegador). */
function ensureState() {
  const def = DEFAULT_DATA;
  if (!state.empresa) state.empresa = { ...def.empresa };
  if (!state.meta) state.meta = { ...def.meta };
  if (!state.preLavagem) state.preLavagem = structuredClone(def.preLavagem);

  for (const key of NEW_SECTOR_KEYS) {
    if (!def[key]) continue;
    if (!state[key]) state[key] = structuredClone(def[key]);
    else state[key] = deepMerge(structuredClone(def[key]), state[key]);
    if (!Array.isArray(state[key].fits) || state[key].fits.length < def[key].fits.length) {
      state[key].fits = structuredClone(def[key].fits);
    }
  }

  const pl = state.preLavagem;
  const dpl = def.preLavagem;

  const topKeys = [
    'pop', 'definicoes', 'responsabilidades', 'utensilios', 'controlesCriticos',
    'fluxo', 'processoDetalhado', 'folhas', 'higienizacao', 'riscos',
    'registros', 'naoConformidades', 'treinamento', 'resumo', 'fits', 'treinamentoTopics',
  ];
  for (const key of topKeys) {
    if (pl[key] == null) pl[key] = structuredClone(dpl[key]);
  }

  const popKeys = [
    'codigo', 'titulo', 'objetivo', 'escopo', 'referencias', 'produtos', 'capacidade',
    'origem', 'equipe', 'maquina', 'entradaRecipiente', 'saidaRecipiente', 'fotos',
  ];
  if (!pl.pop) pl.pop = structuredClone(dpl.pop);
  for (const key of popKeys) {
    if (pl.pop[key] == null) pl.pop[key] = structuredClone(dpl.pop[key]);
  }
  if (!pl.pop.fotos) pl.pop.fotos = { fluxo: null, geral: null, bancada: null, maquina: null };

  if (!Array.isArray(pl.fits) || pl.fits.length < 3) {
    pl.fits = structuredClone(dpl.fits);
  } else {
    pl.fits = dpl.fits.map((defFit, i) => {
      const saved = pl.fits[i] || {};
      const mergeSteps = (savedSteps, defSteps) =>
        (Array.isArray(savedSteps) && savedSteps.length ? savedSteps : defSteps).map((p, j) => ({
          ...(defSteps[j] || {}),
          ...p,
          icon: (defSteps[j] || {}).icon || p.icon,
        }));
      return {
        ...structuredClone(defFit),
        ...saved,
        passos: mergeSteps(saved.passos, defFit.passos),
        antesDeComecar: mergeSteps(saved.antesDeComecar, defFit.antesDeComecar),
        pontosCriticos: Array.isArray(saved.pontosCriticos) && saved.pontosCriticos.length
          ? saved.pontosCriticos : defFit.pontosCriticos,
        problemasComuns: Array.isArray(saved.problemasComuns) && saved.problemasComuns.length
          ? saved.problemasComuns : defFit.problemasComuns,
        cards: (Array.isArray(saved.cards) && saved.cards.length ? saved.cards : defFit.cards).map((c, j) => ({
          ...(defFit.cards[j] || {}),
          ...c,
          icon: (defFit.cards[j] || {}).icon || c.icon,
        })),
        objetivo: saved.objetivo || defFit.objetivo,
        registrar: saved.registrar || defFit.registrar,
        foto: saved.foto ?? defFit.foto,
      };
    });
  }

  // Força atualização das FITs/POP quando a revisão de conteúdo muda
  // (ex.: regra 2 ciclos por cesto azul → Lavagem; LHM 350).
  if (!state.meta) state.meta = {};
  if (state.meta.contentRev !== CONTENT_REV && dpl.fits) {
    [0, 1, 2].forEach((i) => {
      if (dpl.fits[i]) {
        pl.fits[i] = { ...structuredClone(dpl.fits[i]), foto: pl.fits[i]?.foto ?? null };
      }
    });
    if (Array.isArray(dpl.processoDetalhado)) {
      pl.processoDetalhado = structuredClone(dpl.processoDetalhado);
    }
    if (Array.isArray(dpl.naoConformidades)) {
      pl.naoConformidades = structuredClone(dpl.naoConformidades);
    }
    if (Array.isArray(dpl.controlesCriticos)) {
      pl.controlesCriticos = structuredClone(dpl.controlesCriticos);
    }
    if (Array.isArray(dpl.fluxo)) {
      pl.fluxo = structuredClone(dpl.fluxo);
    }
    if (Array.isArray(dpl.definicoes)) {
      pl.definicoes = structuredClone(dpl.definicoes);
    }
    if (dpl.pop?.saidaRecipiente) {
      pl.pop = { ...(pl.pop || {}), saidaRecipiente: dpl.pop.saidaRecipiente };
    }

    // Atualiza setores Lavagem/Secagem/Embalagem quando a revisão muda (preserva fotos)
    for (const key of ['lavagem', 'secagem', 'embalagem', 'plantioAlface', 'plantioMicroverdes', 'torresProducao']) {
      const dSec = def[key];
      if (dSec && state[key]) {
        const fotos = state[key].pop?.fotos;
        const fitFotos = (state[key].fits || []).map((f) => f?.foto ?? null);
        state[key] = structuredClone(dSec);
        if (fotos) state[key].pop.fotos = { ...state[key].pop.fotos, ...fotos };
        if (Array.isArray(state[key].fits)) {
          state[key].fits.forEach((f, i) => {
            if (fitFotos[i] != null) f.foto = fitFotos[i];
          });
        }
      }
    }

    state.meta.contentRev = CONTENT_REV;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Não foi possível salvar contentRev', e);
    }
  }

  // Garante arrays (corrige localStorage corrompido)
  const arrayKeys = {
    escopo: 'pop',
    referencias: 'pop',
    definicoes: null,
    responsabilidades: null,
    utensilios: null,
    controlesCriticos: null,
    fluxo: null,
    processoDetalhado: null,
    higienizacao: null,
    riscos: null,
    registros: null,
    naoConformidades: null,
    treinamento: null,
    resumo: null,
    treinamentoTopics: null,
  };
  for (const [key, parent] of Object.entries(arrayKeys)) {
    const target = parent ? pl[parent] : pl;
    const defTarget = parent ? dpl[parent] : dpl;
    if (!Array.isArray(target?.[key])) {
      if (parent) pl[parent][key] = structuredClone(defTarget[key]);
      else pl[key] = structuredClone(defTarget[key]);
    }
  }
  if (!Array.isArray(pl.utensilios) || pl.utensilios.length < 11) {
    pl.utensilios = structuredClone(dpl.utensilios);
  } else {
    pl.utensilios = dpl.utensilios.map((def, i) => ({
      ...def,
      ...(pl.utensilios[i] || {}),
      icon: def.icon,
    }));
  }
  if (Array.isArray(pl.fluxo)) {
    pl.fluxo = dpl.fluxo.map((def, i) => ({ ...def, ...(pl.fluxo[i] || {}), icon: def.icon }));
  }
  if (Array.isArray(pl.higienizacao)) {
    pl.higienizacao = dpl.higienizacao.map((def, i) => ({
      ...def, ...(pl.higienizacao[i] || {}), icon: def.icon,
    }));
  }
  if (Array.isArray(pl.processoDetalhado)) {
    pl.processoDetalhado = dpl.processoDetalhado.map((def, i) => ({
      ...def, ...(pl.processoDetalhado[i] || {}), icon: def.icon,
    }));
  }
  if (!pl.folhas || !Array.isArray(pl.folhas.aprovado)) {
    pl.folhas = structuredClone(dpl.folhas);
  }

  ensurePlacasBpfFotos();
}

/** Upload do usuário = data URL; caminhos relativos são defaults de assets. */
function isUploadedPhoto(val) {
  return typeof val === 'string' && val.startsWith('data:');
}

/** Usa upload se houver; senão caminho padrão (DEFAULT_DATA / assets). */
function resolvePhotoSrc(stateVal, defaultVal) {
  if (isUploadedPhoto(stateVal)) return stateVal;
  if (typeof stateVal === 'string' && stateVal.trim()) return stateVal;
  if (typeof defaultVal === 'string' && defaultVal.trim()) return defaultVal;
  return null;
}

/** Inicializa state.placasBpf.fotos — seeds defaults sem sobrescrever uploads. */
function ensurePlacasBpfFotos() {
  const defFotos = DEFAULT_DATA.placasBpf?.fotos || {};
  if (!state.placasBpf) state.placasBpf = { fotos: {} };
  if (!state.placasBpf.fotos) state.placasBpf.fotos = {};

  const keys = typeof PLACAS_BPF !== 'undefined'
    ? PLACAS_BPF.map((p) => p.id.replace(/^placa-/, ''))
    : Object.keys(defFotos);

  for (const key of keys) {
    const def = defFotos[key] || { hero: null };
    if (!state.placasBpf.fotos[key]) {
      state.placasBpf.fotos[key] = structuredClone(def);
      continue;
    }
    const slot = state.placasBpf.fotos[key];
    if (!isUploadedPhoto(slot.hero)) {
      slot.hero = def.hero || null;
    }
    if (Array.isArray(def.passos)) {
      if (!Array.isArray(slot.passos)) {
        const prev = slot.passos && typeof slot.passos === 'object' ? slot.passos : {};
        slot.passos = def.passos.map((d, i) => {
          const cur = prev[i];
          return isUploadedPhoto(cur) ? cur : (d || null);
        });
      } else {
        for (let i = 0; i < def.passos.length; i++) {
          if (!isUploadedPhoto(slot.passos[i])) {
            slot.passos[i] = def.passos[i] || null;
          }
        }
      }
      while (slot.passos.length < def.passos.length) {
        slot.passos.push(def.passos[slot.passos.length] || null);
      }
    }
  }
}

function deepMerge(base, override) {
  if (Array.isArray(base)) {
    if (!Array.isArray(override)) return base;
    return base.map((item, i) => deepMerge(item, override[i] ?? item));
  }
  if (base && typeof base === 'object') {
    const out = { ...base };
    if (override && typeof override === 'object') {
      for (const k of Object.keys(override)) {
        if (k in base) out[k] = deepMerge(base[k], override[k]);
        else out[k] = override[k];
      }
    }
    return out;
  }
  return override ?? base;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  flashMsg('Salvo automaticamente');
}

function flashMsg(text) {
  const el = document.getElementById('status-msg');
  if (!el) return;
  el.textContent = text;
  setTimeout(() => { el.textContent = ''; }, 2000);
}

// ── Navigation ──
function buildSidebarNav() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav || !Array.isArray(SECTOR_NAV)) return;
  nav.innerHTML = SECTOR_NAV.map((sector, i) => {
    const items = Array.isArray(sector.items) ? sector.items : [];
    const open = i === 0;
    return `
    <div class="nav-sector ${open ? '' : 'collapsed'}" data-sector="${esc(sector.key)}">
      <button type="button" class="nav-sector-toggle" aria-expanded="${open ? 'true' : 'false'}">
        <span class="nav-sector-label">${esc(sector.label)}</span>
        <span class="nav-sector-count">${items.length}</span>
        <span class="nav-sector-chevron" aria-hidden="true">v</span>
      </button>
      <div class="nav-sector-items">
        ${items.map((item) => `
          <button class="nav-btn" data-view="${esc(item.view)}">${esc(item.label)}</button>
        `).join('')}
      </div>
    </div>`;
  }).join('');

  nav.querySelectorAll('.nav-sector-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sector = btn.closest('.nav-sector');
      if (!sector) return;
      sector.classList.toggle('collapsed');
      btn.setAttribute('aria-expanded', sector.classList.contains('collapsed') ? 'false' : 'true');
    });
  });
}

function listValidViews() {
  return [...document.querySelectorAll('.nav-btn[data-view]')].map((b) => b.dataset.view);
}

function resolveInitialView() {
  const valid = new Set(listValidViews());
  const fromHash = (location.hash || '').replace(/^#/, '');
  let fromStore = '';
  try {
    fromStore = localStorage.getItem(VIEW_KEY) || '';
  } catch (_) { /* ignore */ }
  for (const candidate of [fromHash, fromStore, currentView, 'pop']) {
    if (candidate && valid.has(candidate)) return candidate;
  }
  return 'pop';
}

function activateNavForView(view) {
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
  const btn = document.querySelector(`.nav-btn[data-view="${CSS.escape(view)}"]`);
  if (!btn) return;
  btn.classList.add('active');
  document.querySelectorAll('.nav-sector').forEach((s) => {
    s.classList.add('collapsed');
    const toggle = s.querySelector('.nav-sector-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });
  const sector = btn.closest('.nav-sector');
  if (sector) {
    sector.classList.remove('collapsed');
    const toggle = sector.querySelector('.nav-sector-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }
}

function persistCurrentView(view) {
  try {
    localStorage.setItem(VIEW_KEY, view);
  } catch (_) { /* ignore */ }
  const nextHash = `#${view}`;
  if (location.hash !== nextHash) {
    history.replaceState(null, '', nextHash);
  }
}

function setCurrentView(view, { persist = true } = {}) {
  const valid = new Set(listValidViews());
  const next = valid.has(view) ? view : 'pop';
  currentView = next;
  if (persist) persistCurrentView(next);
  activateNavForView(next);
  showView(next);
}

function bindNavigation() {
  buildSidebarNav();
  document.querySelectorAll('.nav-btn[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setCurrentView(btn.dataset.view);
    });
  });
  window.addEventListener('hashchange', () => {
    const fromHash = (location.hash || '').replace(/^#/, '');
    if (fromHash && fromHash !== currentView) setCurrentView(fromHash);
  });
  setCurrentView(resolveInitialView(), { persist: true });
}

function showView(view) {
  document.querySelectorAll('.document').forEach((d) => d.classList.add('hidden'));
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.remove('hidden');
  syncBrowserDocumentTitle();
}

/** Metadados do documento visível (código + título) — usado no nome do PDF */
function getDocMetaForView(view = currentView) {
  const pl = state.preLavagem;
  if (view === 'pop') return { codigo: pl?.pop?.codigo, titulo: pl?.pop?.titulo };
  if (view === 'fit1') return { codigo: pl?.fits?.[0]?.codigo, titulo: pl?.fits?.[0]?.titulo };
  if (view === 'fit2') return { codigo: pl?.fits?.[1]?.codigo, titulo: pl?.fits?.[1]?.titulo };
  if (view === 'fit3') return { codigo: pl?.fits?.[2]?.codigo, titulo: pl?.fits?.[2]?.titulo };
  if (view === 'cartaz') return { codigo: 'CARTAZ-PL-001', titulo: 'Pré-Lavagem — Cartaz de Parede' };
  if (view === 'formularios') return { codigo: 'REG-PL-001', titulo: 'Formulários — Pré-Lavagem' };
  if (view === 'config') return { codigo: 'CONFIG', titulo: 'Configurações' };

  if (String(view || '').startsWith('bpf-') && typeof PLACAS_BPF !== 'undefined') {
    const placa = PLACAS_BPF.find((p) => p.id.replace(/^placa-/, 'bpf-') === view);
    if (placa) return { codigo: placa.codigo, titulo: placa.titulo };
  }

  const m = String(view || '').match(/^(lv|sc|em|pa|pm|tr)-(pop|fit\d+|cartaz|forms)$/);
  if (m) {
    const sectorKey = {
      lv: 'lavagem', sc: 'secagem', em: 'embalagem',
      pa: 'plantioAlface', pm: 'plantioMicroverdes', tr: 'torresProducao',
    }[m[1]];
    const d = state[sectorKey];
    const prefix = { lv: 'LV', sc: 'SC', em: 'EM', pa: 'PA', pm: 'PM', tr: 'TR' }[m[1]];
    if (!d) return { codigo: view, titulo: view };
    if (m[2] === 'pop') return { codigo: d.pop?.codigo, titulo: d.pop?.titulo };
    if (m[2] === 'cartaz') {
      return { codigo: `CARTAZ-${prefix}-001`, titulo: `${d.pop?.titulo || prefix} — Cartaz` };
    }
    if (m[2] === 'forms') {
      return { codigo: `REG-${prefix}-001`, titulo: `Formulários — ${d.pop?.titulo || prefix}` };
    }
    const fitIdx = Number(String(m[2]).replace('fit', ''));
    const fit = d.fits?.[fitIdx];
    if (fit) return { codigo: fit.codigo, titulo: fit.titulo };
  }

  if (state.doc?.codigo) return { codigo: state.doc.codigo, titulo: state.doc.titulo };
  return { codigo: '', titulo: APP_DOC_TITLE };
}

function sanitizePrintFilename(name) {
  return String(name || 'documento')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
    .slice(0, 150) || 'documento';
}

function buildPrintDocumentTitle(meta = getDocMetaForView()) {
  const codigo = (meta?.codigo || '').trim();
  const titulo = (meta?.titulo || '').trim();
  if (codigo && titulo) return sanitizePrintFilename(`${codigo} — ${titulo}`);
  if (codigo) return sanitizePrintFilename(codigo);
  if (titulo) return sanitizePrintFilename(titulo);
  return sanitizePrintFilename(APP_DOC_TITLE);
}

function syncBrowserDocumentTitle() {
  const meta = getDocMetaForView(currentView);
  const label = buildPrintDocumentTitle(meta);
  document.title = `${label} · Fazendas UP`;
}

function applyPrintDocumentTitle() {
  titleBeforePrint = document.title || APP_DOC_TITLE;
  // Chrome/Edge usam document.title como nome sugerido ao "Salvar como PDF"
  document.title = buildPrintDocumentTitle();
}

function restoreDocumentTitle() {
  syncBrowserDocumentTitle();
  titleBeforePrint = document.title;
}

function bindToolbar() {
  const on = (id, event, handler) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  };

  on('btn-save', 'click', saveState);
  on('btn-export-json', 'click', exportJson);
  on('import-file', 'change', importJson);
  on('btn-print', 'click', () => prepareAndPrint());
  on('btn-print-top', 'click', () => prepareAndPrint());
  on('btn-reset', 'click', () => {
    if (confirm('Restaurar TODOS os dados padrão da Pré-Lavagem?\n\nIsso recarrega a POP e FITs completas. Fotos e logo serão perdidos.')) {
      localStorage.removeItem(STORAGE_KEY);
      state = structuredClone(DEFAULT_DATA);
      ensureState();
      saveState();
      renderAll();
      flashMsg('Dados completos restaurados!');
    }
  });
}

/** Estado da preparação de impressão (antes/depois do diálogo). */
let printFieldBackups = [];
let fitPrintClipRestores = [];

function restorePrintFields() {
  printFieldBackups.forEach(({ el, node }) => {
    if (node.isConnected) node.replaceWith(el);
  });
  printFieldBackups = [];
}

/** Troca inputs/textareas por blocos de texto — garante texto completo na folha. */
function freezeFieldsForPrint(root) {
  restorePrintFields();
  root.querySelectorAll('textarea, input:not([type="file"]):not([type="hidden"])').forEach((el) => {
    const node = document.createElement('div');
    node.className = 'print-text-fixed';
    node.textContent = el.value ?? '';
    if (el.classList.contains('field-critical-val')) node.classList.add('print-text-lg');
    if (el.classList.contains('field-header-title') || el.classList.contains('field-empresa')) {
      node.classList.add('print-text-title');
    }
    printFieldBackups.push({ el, node });
    el.replaceWith(node);
  });
  // Botões de toggle CRÍTICO/OK → span estático (não sai controle na impressão)
  root.querySelectorAll('button.crit-toggle').forEach((el) => {
    const node = document.createElement('span');
    node.className = el.classList.contains('badge-crit') ? 'badge-crit' : 'badge-ok';
    node.textContent = el.textContent;
    printFieldBackups.push({ el, node });
    el.replaceWith(node);
  });
}

/** Converte mm → px no dispositivo atual (preciso para escala de impressão). */
function mmToPx(mm) {
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;left:-99999px;top:0;height:${mm}mm;width:1mm;pointer-events:none;`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px || mm * (96 / 25.4);
}

/**
 * Escala cada .print-page para caber em 1 folha A4 — sem esmagar a leitura.
 * Se o conteúdo for longo demais, NÃO reduz abaixo do mínimo legível:
 * deixa fluir para a página seguinte (evita fonte miúda e texto cortado).
 */
function scalePrintPageToSheet(page) {
  if (!page || page.dataset.fitScaled === '1') return;

  const kids = Array.from(page.childNodes);
  const clip = document.createElement('div');
  clip.className = 'fit-print-clip';
  const inner = document.createElement('div');
  inner.className = 'fit-print-scale-inner';
  kids.forEach((n) => inner.appendChild(n));
  clip.appendChild(inner);
  page.appendChild(clip);

  /* Preencher a área útil do A4 (297mm − margens ≈ 275mm) */
  const targetH = mmToPx(275);
  const targetW = Math.max(page.clientWidth, mmToPx(186));
  const MIN_READABLE = 0.8;
  /* Página de objetivo/problemas costuma ter menos conteúdo — amplia mais para encher */
  const isRestPage = !!inner.querySelector('.fit-rest-tail, .problemas-table, .fit-closing');
  const MAX_SCALE = isRestPage ? 1.65 : 1.35;

  inner.style.transform = 'none';
  inner.style.width = '100%';
  void inner.offsetHeight;
  const naturalH = Math.max(inner.scrollHeight, 1);
  const naturalW = Math.max(inner.scrollWidth, 1);

  let scale = Math.min(targetW / naturalW, targetH / naturalH);

  if (scale < MIN_READABLE) {
    while (inner.firstChild) page.insertBefore(inner.firstChild, clip);
    clip.remove();
    page.dataset.fitScaled = 'skip';
    return;
  }

  scale = Math.min(MAX_SCALE, scale);

  clip.style.height = '275mm';
  clip.style.width = '100%';
  clip.style.overflow = 'hidden';
  clip.style.position = 'relative';

  inner.style.transformOrigin = 'top left';
  inner.style.transform = `scale(${scale})`;
  inner.style.width = `${100 / scale}%`;

  fitPrintClipRestores.push({ page, clip, inner });
  page.dataset.fitScaled = '1';
}

function prepareFitPrintPages() {
  clearFitPrintPages();
  const scalable = new Set([
    'fit1', 'fit2', 'fit3', 'cartaz',
    'lv-fit0', 'lv-fit1', 'lv-cartaz',
    'sc-fit0', 'sc-fit1', 'sc-cartaz',
    'em-fit0', 'em-fit1', 'em-cartaz',
    'pa-fit0', 'pa-fit1', 'pa-fit2', 'pa-fit3', 'pa-cartaz',
    'pm-fit0', 'pm-fit1', 'pm-fit2', 'pm-fit3', 'pm-fit4', 'pm-cartaz',
  ]);
  if (!scalable.has(currentView)) return;
  const root = document.getElementById(`view-${currentView}`);
  if (!root || root.classList.contains('hidden')) return;
  const pages = root.querySelectorAll('.print-page');
  if (pages.length) pages.forEach(scalePrintPageToSheet);
  else if (currentView.endsWith('cartaz')) scalePrintPageToSheet(root);
}

function clearFitPrintPages() {
  fitPrintClipRestores.forEach(({ page, clip, inner }) => {
    if (page && inner && clip && clip.parentNode === page) {
      while (inner.firstChild) page.insertBefore(inner.firstChild, clip);
      clip.remove();
      delete page.dataset.fitScaled;
    }
  });
  fitPrintClipRestores = [];
  document.querySelectorAll('[data-fit-scaled]').forEach((el) => delete el.dataset.fitScaled);
}

function prepareDocumentForPrint() {
  const src = document.getElementById(`view-${currentView}`);
  if (!src) return;
  applyPrintDocumentTitle();
  document.body.classList.add('is-printing');
  freezeFieldsForPrint(src);
  // Força reflow com estilos body.is-printing antes de medir
  void document.body.offsetHeight;
  prepareFitPrintPages();
}

function cleanupAfterPrint() {
  clearFitPrintPages();
  const src = document.getElementById(`view-${currentView}`);
  document.body.classList.remove('is-printing');
  restorePrintFields();
  restoreDocumentTitle();
  if (src) autoResizeTextareas(src);
}

window.addEventListener('beforeprint', prepareDocumentForPrint);
window.addEventListener('afterprint', cleanupAfterPrint);

/**
 * Abre impressão. beforeprint congela os textos e escala cada página FIT em 1 folha.
 */
function prepareAndPrint() {
  const src = document.getElementById(`view-${currentView}`);
  if (!src) {
    alert('Documento não encontrado.');
    return;
  }
  try {
    // Pré-aplica síncrona (alguns browsers disparam beforeprint tarde demais para medir)
    prepareDocumentForPrint();
    window.print();
    flashMsg('Diálogo de impressão aberto');
  } catch (err) {
    cleanupAfterPrint();
    console.error(err);
    alert('Não foi possível abrir a impressão.\n\n' + (err?.message || err));
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fazendas-up-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
}

function importJson(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      state = JSON.parse(ev.target.result);
      ensureState();
      saveState();
      renderAll();
      flashMsg('Dados importados!');
    } catch {
      alert('Arquivo JSON inválido.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ── Helpers ──
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

/** Campo multilinha — mostra texto completo */
function fieldArea(path, value, extraClass = '', rows = 2) {
  return `<textarea class="doc-textarea editable field-auto ${extraClass}" data-path="${path}" rows="${rows}">${esc(value ?? '')}</textarea>`;
}

/** Campo curto (título, código, valor numérico) */
function fieldInput(path, value, extraClass = '') {
  return `<input class="doc-input editable ${extraClass}" data-path="${path}" value="${esc(value ?? '')}">`;
}

/** Textarea compacta — 1 linha, expande só se necessário */
function fieldCompact(path, value, extraClass = '') {
  return `<textarea class="doc-textarea editable field-auto field-compact ${extraClass}" data-path="${path}" rows="1">${esc(value ?? '')}</textarea>`;
}

function autoResizeTextareas(root = document) {
  root.querySelectorAll('textarea.field-auto').forEach((el) => {
    const fit = () => {
      el.style.height = 'auto';
      const min = el.classList.contains('field-compact') ? 26 : 40;
      el.style.height = `${Math.max(el.scrollHeight, min)}px`;
    };
    if (!el.dataset.autoFit) {
      el.dataset.autoFit = '1';
      el.addEventListener('input', fit);
    }
    fit();
  });
}

function bindInput(el, getPath, setPath) {
  const event = el.tagName === 'TEXTAREA' ? 'input' : 'change';
  el.addEventListener(event, () => {
    setPath(el.value);
    saveState();
  });
  el.addEventListener('blur', saveState);
}

function getNested(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function setNested(obj, path, val) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    const next = keys[i + 1];
    if (cur[k] == null || typeof cur[k] !== 'object') {
      cur[k] = /^\d+$/.test(next) ? [] : {};
    }
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = val;
}

/**
 * Slot de foto (upload → data URL no state).
 * @param {boolean} printable — se true, a foto aparece na impressão A4 (placas BPF).
 */
function photoSlot(id, path, hint = 'Clique para adicionar foto', hero = false, printable = false) {
  const stateVal = getNested(state, path);
  const defaultVal = getNested(DEFAULT_DATA, path);
  const src = resolvePhotoSrc(stateVal, defaultVal);
  const printCls = printable ? 'photo-slot--print' : 'no-print';
  return `
    <div class="photo-slot ${printCls} ${hero ? 'hero-photo' : ''}" data-photo-path="${path}" title="${hint}">
      ${src ? `<img src="${src}" alt="ilustração">` : `<div class="ph-hint">${hint}</div>`}
      <input type="file" accept="image/*" data-photo-path="${path}">
    </div>`;
}

function sectionBanner(title, variant = '') {
  return `<div class="section-banner ${variant}">${esc(title)}</div>`;
}

/** Cabeçalho de seção do POP — hierarquia limpa, sem banner colorido */
function sectionHeading(title) {
  const m = title.match(/^(\d+\.)\s*(.+)$/);
  if (m) {
    return `<div class="doc-section-head print-keep-head">
      <span class="section-num">${m[1].replace('.', '')}</span>
      <h2 class="section-heading">${esc(m[2])}</h2>
    </div>`;
  }
  return `<div class="doc-section-head doc-section-head--plain print-keep-head">
    <h2 class="section-heading">${esc(title)}</h2>
  </div>`;
}

const MINI_CARD_COLORS = ['card-green', 'card-orange', 'card-organic', 'card-blue'];

function renderEpiPanel() {
  const epis = [
    ['touca', 'Touca'],
    ['luvas', 'Luvas'],
    ['avental', 'Avental'],
    ['botas', 'Botas'],
  ];
  return `
    <div class="print-keep epi-panel">
      ${sectionBanner('EPI OBRIGATÓRIO', 'epi')}
      <div class="epi-grid">
        ${epis.map(([e, label]) => `
          <div class="epi-item">${renderIcon(e, 36)}<span>${label}</span></div>`).join('')}
      </div>
    </div>`;
}

function renderCriticalPanel(items, basePath = 'preLavagem.controlesCriticos') {
  const list = items || state.preLavagem.controlesCriticos || [];
  return `
    ${sectionBanner('CONTROLES CRÍTICOS', 'critical')}
    <div class="critical-grid">
      ${list.map((c, i) => `
        <div class="critical-box">
          ${renderIcon(c.icon, 48)}
          ${fieldInput(`${basePath}.${i}.valor`, c.valor, 'field-on-dark field-critical-val')}
          ${fieldCompact(`${basePath}.${i}.label`, c.label, 'field-critical-lbl')}
        </div>`).join('')}
    </div>`;
}

function bindPhotos(root) {
  root.querySelectorAll('input[data-photo-path]').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setNested(state, input.dataset.photoPath, ev.target.result);
        saveState();
        renderAll();
      };
      reader.readAsDataURL(file);
    });
  });
}

function bindLogo() {
  document.querySelectorAll('[data-logo-upload]').forEach(slot => {
    const input = slot.querySelector('input[type=file]');
    if (!input) return;
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        state.empresa.logo = ev.target.result;
        saveState();
        renderAll();
      };
      reader.readAsDataURL(file);
    });
  });
}

function docHeader(codigo, titulo, tipo, codigoPath = 'preLavagem.pop.codigo', tituloPath = 'preLavagem.pop.titulo') {
  const brand = esc(state.empresa?.nome || 'Fazendas UP');
  const logo = state.empresa?.logo
    ? `<img src="${state.empresa.logo}" alt="Logo ${brand}">`
    : `<div class="logo-fallback">${renderIcon('logo', 40)}<span>${brand}</span></div>`;
  return `
    <div class="doc-header">
      <div class="logo-slot" data-logo-upload title="Clique para enviar/trocar a logo">
        ${logo}
        <div class="upload-hint no-print">Clique p/ logo</div>
        <input type="file" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer">
      </div>
      <div class="type-cell">
        ${fieldInput('empresa.nome', state.empresa.nome, 'field-on-dark field-empresa')}
        <span class="type-label">${esc(tipo)}</span>
        ${fieldInput(codigoPath, codigo, 'field-on-dark field-codigo')}
      </div>
      <div class="meta-cell">
        ${fieldInput(tituloPath, titulo, 'field-header-title')}
        <div class="meta-rows">
          <label class="meta-field"><span>Versão</span>${fieldInput('meta.versao', state.meta.versao, 'field-meta')}</label>
          <label class="meta-field"><span>Data</span>${fieldInput('meta.data', state.meta.data, 'field-meta')}</label>
          <label class="meta-field meta-field--full"><span>Responsável</span>${fieldInput('meta.responsavel', state.meta.responsavel, 'field-meta')}</label>
        </div>
      </div>
    </div>
    <div class="legend">
      <span class="l-crit">CRÍTICO</span>
      <span class="l-atenc">ATENÇÃO</span>
      <span class="l-epi">EPI</span>
      <span class="l-reg">REGISTRAR</span>
      <span class="l-ok">OK / FLUXO</span>
    </div>`;
}

function renderTextBlock(title, path, multiline = true) {
  const val = getNested(state, path) ?? '';
  return multiline
    ? `${sectionHeading(title)}${fieldArea(path, val, 'field-block', 3)}`
    : `${sectionHeading(title)}${fieldInput(path, val)}`;
}

function renderStringList(title, basePath, items) {
  const list = items || [];
  return `
    <div class="print-block">
    ${sectionHeading(title)}
    <ul class="editable-list">
      ${list.map((t, i) => `
        <li><span class="list-icon">•</span>${fieldCompact(`${basePath}.${i}`, t, 'field-list')}</li>`).join('')}
    </ul>
    </div>`;
}

function renderCheckList(title, basePath, items, icons = null) {
  return `
    ${sectionHeading(title)}
    <div class="check-list">
      ${items.map((t, i) => {
        const text = typeof t === 'string' ? t : t.texto;
        const icon = typeof t === 'object' && t.icon ? renderIcon(t.icon, 22) : '';
        return `<div class="check-item">
          ${icon}
          ${fieldCompact(`${basePath}.${i}${typeof t === 'object' ? '.texto' : ''}`, text, 'field-check')}
        </div>`;
      }).join('')}
    </div>`;
}

function renderDefinicoes(items, basePath = 'preLavagem.definicoes') {
  const list = items || [];
  return `
    ${sectionHeading('DEFINIÇÕES')}
    <table class="summary-table">
      <thead><tr><th>Termo</th><th>Definição</th></tr></thead>
      <tbody>
        ${list.map((r, i) => `
          <tr>
            <td>${fieldInput(`${basePath}.${i}.termo`, r.termo)}</td>
            <td>${fieldCompact(`${basePath}.${i}.definicao`, r.definicao)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderResponsabilidades(items, basePath = 'preLavagem.responsabilidades') {
  const list = items || [];
  return `
    ${sectionHeading('RESPONSABILIDADES')}
    <table class="summary-table">
      <thead><tr><th>Função</th><th>Responsabilidade</th></tr></thead>
      <tbody>
        ${list.map((r, i) => `
          <tr>
            <td>${fieldInput(`${basePath}.${i}.funcao`, r.funcao)}</td>
            <td>${fieldCompact(`${basePath}.${i}.descricao`, r.descricao)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderUtensilios(items, basePath = 'preLavagem.utensilios', maquinaPath = 'preLavagem.pop.maquina', maquinaVal = null) {
  const list = items || [];
  const maq = maquinaVal ?? getNested(state, maquinaPath) ?? '';
  return `
    ${sectionHeading('UTENSÍLIOS E EQUIPAMENTOS')}
    <div class="utensilios-grid">
      ${list.map((u, i) => `
        <div class="utensilio-item">
          <div class="utensilio-icon">${renderIcon(u.icon, 32)}</div>
          <div class="utensilio-name">${fieldInput(`${basePath}.${i}.nome`, u.nome, 'utensilio-label')}</div>
        </div>`).join('')}
    </div>
    <div class="info-banner">
      ${renderIcon('maquina', 32)}
      ${fieldInput(maquinaPath, maq, 'field-banner')}
    </div>`;
}

function renderProcessoDetalhado(items) {
  return `
    ${sectionHeading('DESCRIÇÃO DETALHADA DO PROCESSO')}
    <div class="fit-steps" id="processo-detalhado"></div>`;
}

function renderProblemasTable(basePath, items, includeTitle = true) {
  const list = items || [];
  return `
    ${includeTitle ? sectionHeading('PROBLEMAS COMUNS E AÇÕES') : ''}
    <table class="summary-table problemas-table">
      <thead><tr><th>Problema</th><th>O que fazer</th></tr></thead>
      <tbody>
        ${list.map((r, i) => `
          <tr>
            <td>${fieldCompact(`${basePath}.${i}.problema`, r.problema)}</td>
            <td>${fieldCompact(`${basePath}.${i}.acao`, r.acao)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderPontosCriticos(items, basePath) {
  return `
    <div class="critical-list">
      ${items.map((t, i) => `
        <div class="critical-line">
          <span class="badge-crit">CRÍTICO</span>
          ${fieldCompact(`${basePath}.${i}`, t, 'field-critical')}
        </div>`).join('')}
    </div>`;
}

/** Selo CRÍTICO/OK clicável na tela — na impressão vira texto estático (sem aparência de botão). */
function critToggleBadge(path, isCritico) {
  const cls = isCritico ? 'badge-crit' : 'badge-ok';
  const label = isCritico ? 'CRÍTICO' : 'OK';
  const title = isCritico
    ? 'Clique para marcar como OK (não crítico)'
    : 'Clique para marcar como CRÍTICO';
  return `<button type="button" class="crit-toggle ${cls}" data-crit-path="${esc(path)}" title="${esc(title)}" aria-pressed="${isCritico ? 'true' : 'false'}">${label}</button>`;
}

function bindCritToggles(root) {
  root.querySelectorAll('button.crit-toggle[data-crit-path]').forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const path = btn.dataset.critPath;
      const next = !getNested(state, path);
      setNested(state, path, next);
      saveState();

      const step = btn.closest('.fit-step');
      if (step) step.classList.toggle('critical', next);
      btn.classList.toggle('badge-crit', next);
      btn.classList.toggle('badge-ok', !next);
      btn.textContent = next ? 'CRÍTICO' : 'OK';
      btn.setAttribute('aria-pressed', next ? 'true' : 'false');
      btn.title = next
        ? 'Clique para marcar como OK (não crítico)'
        : 'Clique para marcar como CRÍTICO';
      flashMsg(next ? 'Passo marcado como CRÍTICO' : 'Passo marcado como OK');
    });
  });
}

function fillProcessoDetalhado(container, items) {
  if (!container) return;
  container.innerHTML = `
    <p class="crit-toggle-hint no-print">Clique em <strong>CRÍTICO</strong> ou <strong>OK</strong> para alternar.</p>
    ${(items || []).map((p, i) => `
    <div class="fit-step ${p.critico ? 'critical' : ''}">
      <div class="num">${i + 1}</div>
      <div class="icon-box">${renderIcon(p.icon, 28)}</div>
      ${fieldCompact(`preLavagem.processoDetalhado.${i}.texto`, p.texto, 'step-text')}
      ${critToggleBadge(`preLavagem.processoDetalhado.${i}.critico`, !!p.critico)}
    </div>`).join('')}`;
}

function renderHigieneExtended(container, items, basePath = 'preLavagem.higienizacao') {
  if (!container) return;
  const accents = {
    mao: '#1565c0', borrifador: '#1565c0', tesoura: '#e65100',
    maquina: '#455a64', mop: '#795548', bancada: '#00897b',
    agua: '#0288d1', cacapaBranca: '#546e7a', alerta: '#c62828', inspecao: '#6a1b9a',
  };
  container.innerHTML = (items || []).map((h, i) => {
    const accent = accents[h.icon] || '#546e7a';
    return `
    <div class="hygiene-card" style="--accent:${accent}">
      <div class="hygiene-card-icon">${renderIcon(h.icon, 40)}</div>
      <div class="hygiene-card-content">
        ${fieldInput(`${basePath}.${i}.item`, h.item, 'hygiene-title')}
        ${fieldInput(`${basePath}.${i}.produto`, h.produto, 'hygiene-product')}
        ${fieldInput(`${basePath}.${i}.frequencia`, h.frequencia || '', 'hygiene-freq')}
      </div>
    </div>`;
  }).join('');
}

function bindEditableFields(root, extraPaths = {}) {
  root.querySelectorAll('textarea[data-path]').forEach(el => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    const path = el.dataset.path;
    el.addEventListener('input', () => { setNested(state, path, el.value); saveState(); });
  });
  root.querySelectorAll('[data-path]').forEach(el => {
    if (el.tagName === 'TEXTAREA') return;
    const path = extraPaths[el.dataset.path] || el.dataset.path;
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    bindInput(el, () => getNested(state, path), (v) => setNested(state, path, v));
  });
  autoResizeTextareas(root);
}

// ── Render POP ──
function renderPop() {
  const d = state.preLavagem;
  const el = document.getElementById('view-pop');
  state.doc = { codigo: d.pop.codigo, titulo: d.pop.titulo };

  el.innerHTML = `
    <!-- Pág.1: Objetivo · Escopo · Referências -->
    <div class="print-page" data-print-page="1">
      <div class="doc-header-wrap">${docHeader(d.pop.codigo, d.pop.titulo, 'PROCEDIMENTO OPERACIONAL PADRÃO')}</div>
      ${renderTextBlock('1. OBJETIVO', 'preLavagem.pop.objetivo')}
      ${renderStringList('2. ESCOPO', 'preLavagem.pop.escopo', d.pop.escopo)}
      ${renderStringList('3. REFERÊNCIAS', 'preLavagem.pop.referencias', d.pop.referencias)}
    </div>

    <!-- Pág.2: Definições · Responsabilidades -->
    <div class="print-page page-break" data-print-page="2">
      ${renderDefinicoes(d.definicoes)}
      ${renderResponsabilidades(d.responsabilidades)}
    </div>

    <!-- Pág.3: Utensílios · Fluxo -->
    <div class="print-page page-break" data-print-page="3">
      ${renderUtensilios(d.utensilios)}
      <div class="recipientes-row">
        <div class="recipiente-card entrada">
          ${renderIcon('cacapaPreta', 56)}
          ${fieldCompact('preLavagem.pop.entradaRecipiente', d.pop.entradaRecipiente, 'field-recipiente')}
        </div>
        <span class="flow-arrow">→</span>
        <div class="recipiente-card saida">
          ${renderIcon('cestoAzul', 56)}
          ${fieldCompact('preLavagem.pop.saidaRecipiente', d.pop.saidaRecipiente, 'field-recipiente')}
        </div>
      </div>
      <div class="doc-section">${sectionHeading('4. FLUXO DO PROCESSO')}
      <div class="flow-row" id="flow-container"></div></div>
      ${photoSlot('pop-fluxo', 'preLavagem.pop.fotos.fluxo', 'Foto do fluxo real da sala (caçapa → bancada → MLM → cesto)', true)}
    </div>

    <!-- Pág.4: Controles críticos · Descrição detalhada -->
    <div class="print-page page-break" data-print-page="4">
      <div class="doc-section">${sectionHeading('5. CONTROLES CRÍTICOS')}
      <div class="critical-grid" id="critical-container"></div></div>
      ${renderProcessoDetalhado(d.processoDetalhado)}
    </div>

    <!-- Pág.5: EPI · Seleção de folhas · Higienização -->
    <div class="print-page page-break" data-print-page="5">
      <div class="doc-section">${sectionHeading('6. EPI OBRIGATÓRIO')}
      <div class="epi-grid">
        ${[
          ['touca', 'Touca'],
          ['luvas', 'Luvas'],
          ['avental', 'Avental'],
          ['botas', 'Botas'],
        ].map(([e, label]) => `
          <div class="epi-item">${renderIcon(e, 36)}<span>${label}</span></div>`).join('')}
      </div></div>
      <div class="mini-cards">
        ${[
          ['folhaBoa', 'produtos', 'Produtos', d.pop.produtos],
          ['balanca', 'capacidade', 'Capacidade', d.pop.capacidade],
          ['fornecedor', 'origem', 'Origem', d.pop.origem],
          ['equipe', 'equipe', 'Equipe', d.pop.equipe],
        ].map(([ic, key, label, v]) => `
          <div class="mini-card card-green">
            <div class="mini-card-icon">${renderIcon(ic, 36)}</div>
            <strong>${esc(label)}</strong>
            ${fieldCompact(`preLavagem.pop.${key}`, v, 'field-mini')}
          </div>`).join('')}
      </div>
      <div class="doc-section">${sectionHeading('7. SELEÇÃO DE FOLHAS')}
      <div class="leaf-compare">
        <div class="leaf-box good">
          <h4>✔ APROVADO</h4>
          <div class="leaf-icon-zone">${renderIcon('folhaBoa', 40)}</div>
          <ul id="aprovado-list"></ul>
        </div>
        <div class="leaf-box bad">
          <h4>✘ DESCARTAR</h4>
          <div class="leaf-icon-zone">${renderIcon('folhaRuim', 40)}</div>
          <ul id="reprovado-list"></ul>
        </div>
      </div></div>
      <div class="doc-section">${sectionHeading('8. HIGIENIZAÇÃO E SANITIZAÇÃO')}
      <div class="extended-higiene" id="higiene-container"></div></div>
    </div>

    <!-- Pág.6: Riscos · Registros · Não conformidades · Treinamento -->
    <div class="print-page page-break" data-print-page="6">
      <div class="doc-section">${sectionHeading('9. RISCOS E PROTEÇÃO')}
      <div class="card-grid-4" id="riscos-container"></div></div>
      ${renderStringList('10. REGISTROS OBRIGATÓRIOS', 'preLavagem.registros', d.registros)}
      ${renderStringList('11. NÃO CONFORMIDADES', 'preLavagem.naoConformidades', d.naoConformidades)}
      ${renderStringList('12. TREINAMENTO', 'preLavagem.treinamento', d.treinamento)}
    </div>

    <!-- Pág.7: só Referência Rápida -->
    <div class="print-page page-break" data-print-page="7">
      ${sectionHeading('REFERÊNCIA RÁPIDA')}
      <table class="summary-table"><thead><tr><th>Item</th><th>Valor</th></tr></thead><tbody id="resumo-body"></tbody></table>
      ${photoSlot('pop-geral', 'preLavagem.pop.fotos.geral', 'Foto geral da sala de pré-lavagem', true)}
      ${photoSlot('pop-bancada', 'preLavagem.pop.fotos.bancada', 'Foto da bancada com caçapa e ferramentas', true)}
      ${photoSlot('pop-maquina', 'preLavagem.pop.fotos.maquina', 'Foto da máquina MLM 152', true)}
    </div>
  `;

  renderFlow(el.querySelector('#flow-container'), d.fluxo);
  renderCritical(el.querySelector('#critical-container'), d.controlesCriticos);
  fillProcessoDetalhado(el.querySelector('#processo-detalhado'), d.processoDetalhado);
  renderListItems(el.querySelector('#aprovado-list'), d.folhas.aprovado, 'preLavagem.folhas.aprovado');
  renderListItems(el.querySelector('#reprovado-list'), d.folhas.reprovado, 'preLavagem.folhas.reprovado');
  renderHigieneExtended(el.querySelector('#higiene-container'), d.higienizacao);
  renderRiscos(el.querySelector('#riscos-container'), d.riscos);
  renderResumo(el.querySelector('#resumo-body'), d.resumo);

  bindEditableFields(el);
  bindCritToggles(el);
  bindPhotos(el);
  bindLogo();
}

function renderFlow(container, fluxo, basePath = 'preLavagem.fluxo') {
  if (!container) return;
  const steps = fluxo || [];
  container.innerHTML = steps.map((step, i) => `
    ${i > 0 ? '<span class="flow-arrow" aria-hidden="true">›</span>' : ''}
    <div class="flow-step">
      <div class="flow-step-icon">${renderIcon(step.icon, 40)}</div>
      <div class="flow-step-label">${fieldInput(`${basePath}.${i}.titulo`, step.titulo, 'field-flow-title')}</div>
      <div class="flow-step-sub">${fieldCompact(`${basePath}.${i}.sub`, step.sub, 'field-flow-sub')}</div>
    </div>`).join('');
}

function renderCritical(container, items, basePath = 'preLavagem.controlesCriticos') {
  if (!container) return;
  const boxes = (items || []).map((c, i) => `
    <div class="critical-box">
      ${renderIcon(c.icon, 40)}
      ${fieldInput(`${basePath}.${i}.valor`, c.valor, 'field-on-dark field-critical-val')}
      ${fieldCompact(`${basePath}.${i}.label`, c.label, 'field-critical-lbl')}
    </div>`).join('');
  if (container.classList.contains('critical-grid')) {
    container.innerHTML = boxes;
  } else {
    container.innerHTML = `
      <div class="section-title plain">CONTROLES CRÍTICOS</div>
      <div class="critical-grid">${boxes}</div>`;
  }
}

function renderListItems(ul, items, basePath) {
  ul.innerHTML = items.map((t, i) => `
    <li>${fieldInput(`${basePath}.${i}`, t, 'leaf-criteria')}</li>`).join('');
}

function renderHigiene(container, items) {
  const colors = ['#0d6efd','#fd7e14','#fd7e14','#6c757d'];
  container.innerHTML = items.map((h, i) => `
    <div class="info-card" style="background:${colors[i]}">
      ${renderIcon(h.icon, 36)}
      <input class="doc-input editable" data-path="preLavagem.higienizacao.${i}.item" value="${esc(h.item)}" style="color:#fff;font-weight:700;text-align:center;font-size:.8rem;background:transparent">
      <input class="doc-input editable" data-path="preLavagem.higienizacao.${i}.produto" value="${esc(h.produto)}" style="color:#fff;text-align:center;font-size:.7rem;background:transparent">
    </div>`).join('');
}

function renderRiscos(container, items, basePath = 'preLavagem.riscos') {
  if (!container) return;
  const colors = ['#dc3545', '#fd7e14', '#0d6efd', '#6f42c1', '#198754'];
  container.innerHTML = (items || []).map((r, i) => `
    <div class="info-card" style="background:${colors[i % colors.length]}">
      ${renderIcon(r.icon, 36)}
      ${fieldCompact(`${basePath}.${i}.titulo`, r.titulo, 'field-card-title')}
      ${fieldCompact(`${basePath}.${i}.acao`, r.acao || r.sub || '', 'field-card-sub')}
    </div>`).join('');
}

function renderResumo(tbody, items, basePath = 'preLavagem.resumo') {
  if (!tbody) return;
  tbody.innerHTML = (items || []).map((r, i) => `
    <tr>
      <td>${fieldInput(`${basePath}.${i}.item`, r.item)}</td>
      <td>${fieldCompact(`${basePath}.${i}.valor`, r.valor)}</td>
    </tr>`).join('');
}

// ── Render FIT ──
function renderFit(index) {
  ensureState();
  const fit = state.preLavagem.fits[index];
  const el = document.getElementById(`view-fit${index + 1}`);
  if (!fit || !el) {
    console.error('FIT não encontrada:', index);
    return;
  }
  state.doc = { codigo: fit.codigo, titulo: fit.titulo };

  const isFit001 = index === 0;
  const isFit002 = index === 1;
  const isFit003 = index === 2;

  const headerBlock = `
    <div class="doc-header-wrap">${docHeader(fit.codigo, fit.titulo, 'FICHA DE INSTRUÇÃO DE TRABALHO', `preLavagem.fits.${index}.codigo`, `preLavagem.fits.${index}.titulo`)}</div>
    <p class="ref-line">POP de referência: POP-PL-001 · Setor: Pré-Lavagem</p>`;

  const stepsBlock = `
    <div class="print-keep">
      ${sectionBanner('PASSO A PASSO')}
      <div class="fit-steps" id="fit-steps-${index}"></div>
    </div>`;

  const criticalBlock = isFit002
    ? `<div class="print-keep">${renderCriticalPanel(state.preLavagem.controlesCriticos)}</div>`
    : '';

  const epiBlock = renderEpiPanel();

  const lembreteBlock = `
    <div class="print-keep lembrete-panel">
      ${sectionBanner('LEMBRETE RÁPIDO')}
      <div class="mini-cards" id="fit-cards-${index}"></div>
    </div>`;

  const posterShell = (body) => `
    <div class="fit-poster">
      <div class="fit-hero">
        <div class="fit-code">${esc(fit.codigo)}</div>
        <div class="fit-title">${esc(fit.titulo)}</div>
      </div>
      <div class="fit-poster-body">${body}</div>
    </div>`;

  const restBlock = `
    <div class="doc-header-wrap">${docHeader(fit.codigo, fit.titulo, 'FICHA DE INSTRUÇÃO DE TRABALHO', `preLavagem.fits.${index}.codigo`, `preLavagem.fits.${index}.titulo`)}</div>
    ${photoSlot(`fit${index}-foto`, `preLavagem.fits.${index}.foto`, 'Foto real do posto — clique para substituir o ícone genérico', true)}
    <div class="section-title plain">OBJETIVO</div>
    ${fieldArea(`preLavagem.fits.${index}.objetivo`, fit.objetivo, 'field-block', 2)}
    <div class="section-title plain">ANTES DE COMEÇAR</div>
    <div class="check-list" id="fit-antes-${index}"></div>
    <div id="fit-criticos-${index}"></div>
    <div class="print-keep fit-rest-tail">
      <div id="fit-problemas-${index}"></div>
      <div class="fit-closing">
        <div class="register-box">
          📋 ${fieldCompact(`preLavagem.fits.${index}.registrar`, fit.registrar, 'field-register')}
        </div>
        <p class="contact-line">
          Dúvida ou desvio → <input class="doc-input inline editable" data-path="meta.gerente" value="${esc(state.meta.gerente)}" style="font-weight:700;color:var(--critical);background:transparent">
        </p>
      </div>
    </div>`;

  if (isFit001) {
    el.innerHTML = `
    <!-- FIT-PL-001 pág.1: Passo a passo · EPI · Lembrete rápido -->
    <div class="print-page" data-print-page="fit1-1">
      ${headerBlock}
      ${posterShell(`
        <div class="fit-ops-sheet">
          ${sectionBanner('PASSO A PASSO')}
          <div class="fit-steps" id="fit-steps-${index}"></div>
          <div class="print-keep epi-lembrete-block">
            ${renderEpiPanel()}
            <div class="lembrete-panel">
              ${sectionBanner('LEMBRETE RÁPIDO')}
              <div class="mini-cards" id="fit-cards-${index}"></div>
            </div>
          </div>
        </div>`)}
    </div>
    <!-- FIT-PL-001 pág.2: restante -->
    <div class="print-page page-break" data-print-page="fit1-2">
      ${restBlock}
    </div>`;
  } else if (isFit002) {
    el.innerHTML = `
    <!-- FIT-PL-002 pág.1: Passo a passo -->
    <div class="print-page" data-print-page="fit2-1">
      ${headerBlock}
      ${posterShell(stepsBlock)}
    </div>
    <!-- FIT-PL-002 pág.2: Controles críticos · EPI · Lembrete -->
    <div class="print-page page-break" data-print-page="fit2-2">
      ${posterShell(`${criticalBlock}${epiBlock}${lembreteBlock}`)}
    </div>
    <!-- FIT-PL-002 pág.3: restante -->
    <div class="print-page page-break" data-print-page="fit2-3">
      ${restBlock}
    </div>`;
  } else if (isFit003) {
    el.innerHTML = `
    <!-- FIT-PL-003 pág.1: Passo a passo -->
    <div class="print-page" data-print-page="fit3-1">
      ${headerBlock}
      ${posterShell(stepsBlock)}
    </div>
    <!-- FIT-PL-003 pág.2: EPI · Lembrete -->
    <div class="print-page page-break" data-print-page="fit3-2">
      ${posterShell(`${epiBlock}${lembreteBlock}`)}
    </div>
    <!-- FIT-PL-003 pág.3: restante -->
    <div class="print-page page-break" data-print-page="fit3-3">
      ${restBlock}
    </div>`;
  } else {
    el.innerHTML = `
    ${headerBlock}
    ${posterShell(`${stepsBlock}${epiBlock}${lembreteBlock}`)}
    ${restBlock}`;
  }

  const antesEl = el.querySelector(`#fit-antes-${index}`);
  antesEl.innerHTML = (fit.antesDeComecar || []).map((item, i) => `
    <div class="check-item">
      ${renderIcon(item.icon, 24)}
      ${fieldCompact(`preLavagem.fits.${index}.antesDeComecar.${i}.texto`, item.texto, 'field-check')}
    </div>`).join('');

  const stepsEl = el.querySelector(`#fit-steps-${index}`);
  stepsEl.innerHTML = `
    <p class="crit-toggle-hint no-print">Clique em <strong>CRÍTICO</strong> ou <strong>OK</strong> para alternar.</p>
    ${(fit.passos || []).map((p, i) => `
    <div class="fit-step ${p.critico ? 'critical' : ''}">
      <div class="num">${i + 1}</div>
      <div class="icon-box">${renderIcon(p.icon, 28)}</div>
      ${fieldCompact(`preLavagem.fits.${index}.passos.${i}.texto`, p.texto, 'step-text')}
      ${critToggleBadge(`preLavagem.fits.${index}.passos.${i}.critico`, !!p.critico)}
    </div>`).join('')}`;

  const cardsEl = el.querySelector(`#fit-cards-${index}`);
  cardsEl.innerHTML = (fit.cards || []).map((c, i) => `
    <div class="mini-card ${MINI_CARD_COLORS[i % MINI_CARD_COLORS.length]}">
      <div class="mini-card-icon">${renderIcon(c.icon, 36)}</div>
      ${fieldCompact(`preLavagem.fits.${index}.cards.${i}.titulo`, c.titulo, 'field-card-title')}
      ${fieldCompact(`preLavagem.fits.${index}.cards.${i}.sub`, c.sub, 'field-card-sub')}
    </div>`).join('');

  const critEl = el.querySelector(`#fit-criticos-${index}`);
  if (critEl && fit.pontosCriticos?.length) {
    critEl.innerHTML = sectionBanner('PONTOS CRÍTICOS', 'critical') +
      renderPontosCriticos(fit.pontosCriticos, `preLavagem.fits.${index}.pontosCriticos`);
  }

  const probEl = el.querySelector(`#fit-problemas-${index}`);
  if (probEl && fit.problemasComuns?.length) {
    probEl.innerHTML = sectionBanner('PROBLEMAS COMUNS', 'warning') +
      renderProblemasTable(`preLavagem.fits.${index}.problemasComuns`, fit.problemasComuns, false);
  }

  bindEditableFields(el);
  bindCritToggles(el);
  bindPhotos(el);
  bindLogo();
}

// ── Render Cartaz ──
function renderCartaz() {
  const d = state.preLavagem;
  const el = document.getElementById('view-cartaz');
  state.doc = { codigo: 'CARTAZ-PL-001', titulo: 'Pré-Lavagem — Cartaz de Parede' };

  el.innerHTML = `
    <div class="print-page" data-print-page="cartaz-1">
      <div class="cartaz">
        <div class="doc-header-wrap">${docHeader('CARTAZ-PL-001', 'Pré-Lavagem — Cartaz de Parede', 'FIXAR NA SALA')}</div>
        <div class="fit-poster">
          <div class="fit-hero">
            <div class="fit-code">CARTAZ OPERACIONAL</div>
            <div class="fit-title">Pré-Lavagem — Nunca esquecer</div>
          </div>
          <div class="fit-poster-body">
            ${sectionBanner('FLUXO DO PROCESSO')}
            <div class="flow-row" id="cartaz-flow"></div>
            ${renderCriticalPanel(d.controlesCriticos)}
          </div>
        </div>
      </div>
    </div>
    <div class="print-page page-break" data-print-page="cartaz-2">
      <div class="cartaz">
        <div class="doc-header-wrap">${docHeader('CARTAZ-PL-001', 'Pré-Lavagem — Cartaz de Parede', 'FIXAR NA SALA')}</div>
        <div class="fit-poster">
          <div class="fit-poster-body">
            ${renderEpiPanel()}
            <div class="leaf-compare">
              <div class="leaf-box good"><h4>✔ APROVADO</h4>${renderIcon('folhaBoa',56)}<ul>${d.folhas.aprovado.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div>
              <div class="leaf-box bad"><h4>✘ DESCARTAR</h4>${renderIcon('folhaRuim',56)}<ul>${d.folhas.reprovado.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div>
            </div>
            <div class="register-box">📋 REG-PL-001 + REG-PL-002 · Dúvida → ${esc(state.meta.gerente)}</div>
          </div>
        </div>
        ${photoSlot('cartaz-foto', 'preLavagem.pop.fotos.geral', 'Foto da equipe ou da sala — ideal para plastificar', true)}
      </div>
    </div>
  `;
  renderFlow(el.querySelector('#cartaz-flow'), d.fluxo);
  bindEditableFields(el);
  bindPhotos(el);
  bindLogo();
}

// ── Render Formulários ──
function renderFormularios() {
  const el = document.getElementById('view-formularios');
  el.innerHTML = `
    <div class="doc-header-wrap">${docHeader('REG-PL-001', 'Registro Diário de Pré-Lavagem', 'FORMULÁRIO')}</div>
    <div class="critical-grid" style="margin-bottom:1rem">
      ${state.preLavagem.controlesCriticos.map(c => `
        <div class="critical-box" style="padding:.5rem">
          ${renderIcon(c.icon, 28)}
          <div class="val" style="font-size:1rem">${esc(c.valor)}</div>
          <div class="lbl">${esc(c.label)}</div>
        </div>`).join('')}
    </div>
    <table class="form-table form-table--reg001">
      <colgroup>
        <col class="col-data">
        <col class="col-operador">
        <col class="col-hora">
        <col class="col-produto">
        <col class="col-descarte">
        <col class="col-obs">
      </colgroup>
      <thead><tr>
        <th>Data</th><th>Operador</th><th>Hora</th><th>Produto</th><th>Descarte (kg)</th><th>Observação</th>
      </tr></thead>
      <tbody>${Array(15).fill(0).map(()=>'<tr>'+Array(6).fill('<td>&nbsp;</td>').join('')+'</tr>').join('')}</tbody>
    </table>
    <div class="register-box">Descarte = folhas ruins + talo · NÃO incluir raízes</div>

    <div class="page-break"></div>
    <div class="doc-header-wrap">${docHeader('REG-PL-002', 'Higienização por Turno', 'FORMULÁRIO')}</div>
    <div class="card-grid-4" style="margin-bottom:1rem">
      ${state.preLavagem.higienizacao.map(h => `
        <div class="info-card" style="background:#fd7e14">
          ${renderIcon(h.icon, 32)}
          <div class="card-title">${esc(h.item)}</div>
          <div class="card-sub">${esc(h.produto)}</div>
        </div>`).join('')}
    </div>
    <table class="form-table">
      <thead><tr><th>Data</th><th>Turno</th><th>Operador</th><th>Bancada</th><th>Facas</th><th>Máquina</th><th>Piso</th><th>Visto</th></tr></thead>
      <tbody>${Array(12).fill(0).map(()=>'<tr>'+Array(8).fill('<td>&nbsp;</td>').join('')+'</tr>').join('')}</tbody>
    </table>

    <div class="page-break"></div>
    <div class="doc-header-wrap">${docHeader('TRE-PL-001', 'Ficha de Treinamento — Pré-Lavagem', 'FORMULÁRIO')}</div>
    <div class="flow-row" id="treino-flow"></div>
    <table class="summary-table">
      <thead><tr><th>Conteúdo programático</th><th>Teoria ☐</th><th>Prática ☐</th><th>OK ☐</th></tr></thead>
      <tbody>
        ${state.preLavagem.treinamentoTopics.map((t, i) => `
          <tr>
            <td>${fieldCompact(`preLavagem.treinamentoTopics.${i}`, t)}</td>
            <td style="text-align:center">☐</td><td style="text-align:center">☐</td><td style="text-align:center">☐</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <p style="margin-top:1rem">Colaborador: _________________________ Data: ____/____/________</p>
    <p>Gerente: _________________________ Resultado: ☐ Aprovado ☐ Retreinar</p>
  `;
  renderFlow(el.querySelector('#treino-flow'), state.preLavagem.fluxo);
  bindEditableFields(el);
  bindLogo();
}

// ── Config ──
function renderConfig() {
  const el = document.getElementById('view-config');
  el.innerHTML = `
    <div class="config-panel">
      <h2>Configurações da Empresa</h2>
      <p class="config-hint">
        Setores no menu: <strong>Pré-Lavagem</strong>, <strong>Lavagem, Enxágue e Pré-secagem</strong>, <strong>Secagem</strong> e <strong>Embalagem</strong>.
        Campos editáveis em todos os documentos; use Restaurar padrão se o conteúdo local estiver desatualizado.
      </p>
      <label>Nome da empresa</label>
      <input class="doc-input editable" data-path="empresa.nome" value="${esc(state.empresa.nome)}">
      <label>Versão dos documentos</label>
      <input class="doc-input editable" data-path="meta.versao" value="${esc(state.meta.versao)}">
      <label>Data</label>
      <input class="doc-input editable" data-path="meta.data" value="${esc(state.meta.data)}">
      <label>Responsável</label>
      <input class="doc-input editable" data-path="meta.responsavel" value="${esc(state.meta.responsavel)}">
      <label>Gerente (autoriza desvios)</label>
      <input class="doc-input editable" data-path="meta.gerente" value="${esc(state.meta.gerente)}">
      <label>Aprovador</label>
      <input class="doc-input editable" data-path="meta.aprovador" value="${esc(state.meta.aprovador)}">
      <p style="margin-top:1.25rem;font-size:.82rem;color:var(--text-muted)">
        Todos os campos nos documentos são editáveis — clique e digite. Fotos e logo são salvas automaticamente no navegador.
        Use Exportar JSON para backup ou transferir para outro computador.
      </p>
    </div>
  `;
  bindEditableFields(el);
}

// ── Setores novos (Lavagem / Secagem / Embalagem) ──
function sectorDraftNote() {
  return `<p class="sector-draft-note no-print">Documentos alinhados às FITs do setor — todos os campos são editáveis.</p>`;
}

function renderSectorPop(sectorKey, viewId) {
  const d = state[sectorKey];
  const el = document.getElementById(viewId);
  if (!d || !el) return;
  const base = sectorKey;
  state.doc = { codigo: d.pop.codigo, titulo: d.pop.titulo };
  const fitCodes = (d.fits || []).map((f) => `${f.codigo} — ${f.titulo}`).join(' · ');

  el.innerHTML = `
    ${sectorDraftNote()}
    <div class="print-page" data-print-page="${sectorKey}-pop-1">
      <div class="doc-header-wrap">${docHeader(d.pop.codigo, d.pop.titulo, 'PROCEDIMENTO OPERACIONAL PADRÃO', `${base}.pop.codigo`, `${base}.pop.titulo`)}</div>
      ${renderTextBlock('1. OBJETIVO', `${base}.pop.objetivo`)}
      ${renderStringList('2. ESCOPO', `${base}.pop.escopo`, d.pop.escopo)}
      ${renderStringList('3. REFERÊNCIAS', `${base}.pop.referencias`, d.pop.referencias)}
      <p class="ref-line">FITs do setor: ${esc(fitCodes || '—')}</p>
    </div>
    <div class="print-page page-break" data-print-page="${sectorKey}-pop-2">
      ${renderDefinicoes(d.definicoes, `${base}.definicoes`)}
      ${renderResponsabilidades(d.responsabilidades, `${base}.responsabilidades`)}
      ${renderUtensilios(d.utensilios, `${base}.utensilios`, `${base}.pop.maquina`, d.pop.maquina)}
    </div>
    <div class="print-page page-break" data-print-page="${sectorKey}-pop-3">
      <div class="recipientes-row">
        <div class="recipiente-card entrada">
          ${renderIcon(
            sectorKey === 'embalagem' ? 'bancada'
              : sectorKey === 'secagem' ? 'cacapaBranca'
                : sectorKey === 'plantioAlface' ? 'folhaBoa'
                  : sectorKey === 'plantioMicroverdes' ? 'folhaBoa'
                    : 'cestoAzul',
            56,
          )}
          ${fieldCompact(`${base}.pop.entradaRecipiente`, d.pop.entradaRecipiente, 'field-recipiente')}
        </div>
        <span class="flow-arrow">→</span>
        <div class="recipiente-card saida">
          ${renderIcon(
            sectorKey === 'embalagem' ? 'etiqueta'
              : sectorKey === 'secagem' ? 'bancada'
                : sectorKey === 'plantioAlface' ? 'bancada'
                  : sectorKey === 'plantioMicroverdes' ? 'tesoura'
                    : 'cacapaBranca',
            56,
          )}
          ${fieldCompact(`${base}.pop.saidaRecipiente`, d.pop.saidaRecipiente, 'field-recipiente')}
        </div>
      </div>
      <div id="${sectorKey}-flow" class="flow-row"></div>
      <div id="${sectorKey}-critical"></div>
    </div>
    <div class="print-page page-break" data-print-page="${sectorKey}-pop-4">
      <div id="${sectorKey}-processo"></div>
    </div>
    <div class="print-page page-break" data-print-page="${sectorKey}-pop-5">
      ${renderEpiPanel()}
      <div class="leaf-compare">
        <div class="leaf-box good"><h4>✔ APROVADO</h4>${renderIcon('folhaBoa',48)}<ul id="${sectorKey}-aprovado"></ul></div>
        <div class="leaf-box bad"><h4>✘ DESCARTAR</h4>${renderIcon('folhaRuim',48)}<ul id="${sectorKey}-reprovado"></ul></div>
      </div>
      <div class="doc-section">${sectionHeading('HIGIENIZAÇÃO E SANITIZAÇÃO')}
      <div class="extended-higiene" id="${sectorKey}-higiene"></div></div>
    </div>
    <div class="print-page page-break" data-print-page="${sectorKey}-pop-6">
      <div class="doc-section">${sectionHeading('RISCOS E PROTEÇÃO')}
      <div class="card-grid-4" id="${sectorKey}-riscos"></div></div>
      ${renderStringList('REGISTROS OBRIGATÓRIOS', `${base}.registros`, d.registros)}
      ${renderStringList('NÃO CONFORMIDADES', `${base}.naoConformidades`, d.naoConformidades)}
      ${renderStringList('TREINAMENTO', `${base}.treinamento`, d.treinamento)}
      <table class="summary-table"><thead><tr><th>Item</th><th>Valor</th></tr></thead><tbody id="${sectorKey}-resumo"></tbody></table>
    </div>`;

  renderFlow(el.querySelector(`#${sectorKey}-flow`), d.fluxo, `${base}.fluxo`);
  renderCritical(el.querySelector(`#${sectorKey}-critical`), d.controlesCriticos, `${base}.controlesCriticos`);
  fillSectorProcesso(el.querySelector(`#${sectorKey}-processo`), d.processoDetalhado, `${base}.processoDetalhado`);
  renderListItems(el.querySelector(`#${sectorKey}-aprovado`), d.folhas.aprovado, `${base}.folhas.aprovado`);
  renderListItems(el.querySelector(`#${sectorKey}-reprovado`), d.folhas.reprovado, `${base}.folhas.reprovado`);
  renderHigieneExtended(el.querySelector(`#${sectorKey}-higiene`), d.higienizacao, `${base}.higienizacao`);
  renderRiscos(el.querySelector(`#${sectorKey}-riscos`), d.riscos, `${base}.riscos`);
  renderResumo(el.querySelector(`#${sectorKey}-resumo`), d.resumo, `${base}.resumo`);
  bindEditableFields(el);
  bindCritToggles(el);
  bindLogo();
}

function fillSectorProcesso(container, items, basePath) {
  if (!container) return;
  container.innerHTML = `
    <div class="print-keep-head">
      <div class="section-title plain">DESCRIÇÃO DO PROCESSO</div>
    </div>
    <p class="crit-toggle-hint no-print">Clique em <strong>CRÍTICO</strong> ou <strong>OK</strong> para alternar.</p>
    <div class="fit-steps processo-steps">
    ${(items || []).map((p, i) => `
    <div class="fit-step ${p.critico ? 'critical' : ''}">
      <div class="num">${i + 1}</div>
      <div class="icon-box">${renderIcon(p.icon, 28)}</div>
      ${fieldCompact(`${basePath}.${i}.texto`, p.texto, 'step-text')}
      ${critToggleBadge(`${basePath}.${i}.critico`, !!p.critico)}
    </div>`).join('')}
    </div>`;
}

function renderSectorFit(sectorKey, fitIndex, viewId, layout = 'ops') {
  const d = state[sectorKey];
  const fit = d?.fits?.[fitIndex];
  const el = document.getElementById(viewId);
  if (!fit || !el) return;
  const base = `${sectorKey}.fits.${fitIndex}`;
  state.doc = { codigo: fit.codigo, titulo: fit.titulo };

  const headerBlock = `
    <div class="doc-header-wrap">${docHeader(fit.codigo, fit.titulo, 'FICHA DE INSTRUÇÃO DE TRABALHO', `${base}.codigo`, `${base}.titulo`)}</div>
    <p class="ref-line">POP de referência: ${esc(d.pop.codigo)} · Setor: ${esc(SECTOR_NAV.find((s) => s.key === sectorKey)?.label || sectorKey)}</p>`;

  const stepsBlock = `
    <div class="print-keep">
      ${sectionBanner('PASSO A PASSO')}
      <div class="fit-steps" id="${viewId}-steps"></div>
    </div>`;
  const epiBlock = renderEpiPanel();
  const lembreteBlock = `
    <div class="print-keep lembrete-panel">
      ${sectionBanner('LEMBRETE RÁPIDO')}
      <div class="mini-cards" id="${viewId}-cards"></div>
    </div>`;
  const posterShell = (body) => `
    <div class="fit-poster">
      <div class="fit-hero"><div class="fit-code">${esc(fit.codigo)}</div><div class="fit-title">${esc(fit.titulo)}</div></div>
      <div class="fit-poster-body">${body}</div>
    </div>`;
  const restBlock = `
    <div class="doc-header-wrap">${docHeader(fit.codigo, fit.titulo, 'FICHA DE INSTRUÇÃO DE TRABALHO', `${base}.codigo`, `${base}.titulo`)}</div>
    ${photoSlot(`${viewId}-foto`, `${base}.foto`, 'Foto real do posto — clique para substituir', true)}
    <div class="section-title plain">OBJETIVO</div>
    ${fieldArea(`${base}.objetivo`, fit.objetivo, 'field-block', 2)}
    <div class="section-title plain">ANTES DE COMEÇAR</div>
    <div class="check-list" id="${viewId}-antes"></div>
    <div id="${viewId}-criticos"></div>
    <div class="print-keep fit-rest-tail">
      <div id="${viewId}-problemas"></div>
      <div class="fit-closing">
        <div class="register-box">📋 ${fieldCompact(`${base}.registrar`, fit.registrar, 'field-register')}</div>
        <p class="contact-line">Dúvida ou desvio → <input class="doc-input inline editable" data-path="meta.gerente" value="${esc(state.meta.gerente)}" style="font-weight:700;color:var(--critical);background:transparent"></p>
      </div>
    </div>`;

  if (layout === 'steps-first') {
    el.innerHTML = `
      ${sectorDraftNote()}
      <div class="print-page" data-print-page="${viewId}-1">${headerBlock}${posterShell(stepsBlock)}</div>
      <div class="print-page page-break" data-print-page="${viewId}-2">${posterShell(`${epiBlock}${lembreteBlock}`)}</div>
      <div class="print-page page-break" data-print-page="${viewId}-3">${restBlock}</div>`;
  } else {
    el.innerHTML = `
      ${sectorDraftNote()}
      <div class="print-page" data-print-page="${viewId}-1">
        ${headerBlock}
        ${posterShell(`
          <div class="fit-ops-sheet">
            ${sectionBanner('PASSO A PASSO')}
            <div class="fit-steps" id="${viewId}-steps"></div>
            <div class="print-keep epi-lembrete-block">
              ${renderEpiPanel()}
              <div class="lembrete-panel">
                ${sectionBanner('LEMBRETE RÁPIDO')}
                <div class="mini-cards" id="${viewId}-cards"></div>
              </div>
            </div>
          </div>`)}
      </div>
      <div class="print-page page-break" data-print-page="${viewId}-2">${restBlock}</div>`;
  }

  el.querySelector(`#${viewId}-antes`).innerHTML = (fit.antesDeComecar || []).map((item, i) => `
    <div class="check-item">
      ${renderIcon(item.icon, 24)}
      ${fieldCompact(`${base}.antesDeComecar.${i}.texto`, item.texto, 'field-check')}
    </div>`).join('');

  el.querySelector(`#${viewId}-steps`).innerHTML = `
    <p class="crit-toggle-hint no-print">Clique em <strong>CRÍTICO</strong> ou <strong>OK</strong> para alternar.</p>
    ${(fit.passos || []).map((p, i) => `
    <div class="fit-step ${p.critico ? 'critical' : ''}">
      <div class="num">${i + 1}</div>
      <div class="icon-box">${renderIcon(p.icon, 28)}</div>
      ${fieldCompact(`${base}.passos.${i}.texto`, p.texto, 'step-text')}
      ${critToggleBadge(`${base}.passos.${i}.critico`, !!p.critico)}
    </div>`).join('')}`;

  el.querySelector(`#${viewId}-cards`).innerHTML = (fit.cards || []).map((c, i) => `
    <div class="mini-card ${MINI_CARD_COLORS[i % MINI_CARD_COLORS.length]}">
      <div class="mini-card-icon">${renderIcon(c.icon, 32)}</div>
      ${fieldCompact(`${base}.cards.${i}.titulo`, c.titulo, 'field-card-title')}
      ${fieldCompact(`${base}.cards.${i}.sub`, c.sub, 'field-card-sub')}
    </div>`).join('');

  const critEl = el.querySelector(`#${viewId}-criticos`);
  if (critEl && fit.pontosCriticos?.length) {
    critEl.innerHTML = sectionBanner('PONTOS CRÍTICOS', 'critical') +
      renderPontosCriticos(fit.pontosCriticos, `${base}.pontosCriticos`);
  }
  const probEl = el.querySelector(`#${viewId}-problemas`);
  if (probEl && fit.problemasComuns?.length) {
    probEl.innerHTML = sectionBanner('PROBLEMAS COMUNS', 'warning') +
      renderProblemasTable(`${base}.problemasComuns`, fit.problemasComuns, false);
  }

  bindEditableFields(el);
  bindCritToggles(el);
  bindPhotos(el);
  bindLogo();
}

function renderSectorCartaz(sectorKey, viewId) {
  const d = state[sectorKey];
  const el = document.getElementById(viewId);
  if (!d || !el) return;
  state.doc = { codigo: `CARTAZ-${d.pop.codigo.split('-')[1]}-001`, titulo: `${d.pop.titulo} — Cartaz` };
  const code = state.doc.codigo;
  const fitLine = (d.fits || []).map((f) => f.codigo).join(' · ');
  const regLine = (d.registros || []).join(' · ');

  el.innerHTML = `
    ${sectorDraftNote()}
    <div class="print-page" data-print-page="${viewId}-1">
      <div class="cartaz">
        <div class="doc-header-wrap">${docHeader(code, d.pop.titulo, 'FIXAR NA SALA')}</div>
        <div class="fit-poster">
          <div class="fit-hero">
            <div class="fit-code">CARTAZ OPERACIONAL · ${esc(fitLine)}</div>
            <div class="fit-title">${esc(d.pop.titulo)}</div>
          </div>
          <div class="fit-poster-body">
            ${sectionBanner('FLUXO DO PROCESSO')}
            <div class="flow-row" id="${viewId}-flow"></div>
            ${renderCriticalPanel(d.controlesCriticos, `${sectorKey}.controlesCriticos`)}
          </div>
        </div>
      </div>
    </div>
    <div class="print-page page-break" data-print-page="${viewId}-2">
      <div class="cartaz">
        <div class="doc-header-wrap">${docHeader(code, d.pop.titulo, 'FIXAR NA SALA')}</div>
        <div class="fit-poster">
          <div class="fit-poster-body">
            ${renderEpiPanel()}
            <div class="doc-section">${sectionHeading('RISCOS')}
            <div class="card-grid-4" id="${viewId}-riscos"></div></div>
            <div class="register-box">📋 ${esc(regLine || 'Registrar no formulário do setor')} · Dúvida → ${esc(state.meta.gerente)}</div>
          </div>
        </div>
      </div>
    </div>`;
  renderFlow(el.querySelector(`#${viewId}-flow`), d.fluxo);
  renderRiscos(el.querySelector(`#${viewId}-riscos`), d.riscos, `${sectorKey}.riscos`);
  bindEditableFields(el);
  bindLogo();
}

function sectorFormHeaders(sectorKey) {
  if (sectorKey === 'lavagem') {
    return ['Data', 'Operador', 'Hora', 'Produto', 'LHM 350', 'Enxágue 50 L', '30–45 s', 'Pré-sec. 1–2 min', 'Obs'];
  }
  if (sectorKey === 'secagem') {
    return ['Data', 'Operador', 'Hora', 'Produto', 'Entrada OK', 'Vel. mín.', '2+2 min', 'Bancada', 'Obs'];
  }
  if (sectorKey === 'plantioAlface') {
    return ['Data', 'Operador', 'Lote', 'Variedade', 'Higiene', 'Semear', 'Escuro', 'NFT', 'Obs'];
  }
  if (sectorKey === 'plantioMicroverdes') {
    return ['Data', 'Operador', 'Espécie', 'g/m²', 'Higiene', 'Semear', 'Escuro', '30 g', 'Obs'];
  }
  if (sectorKey === 'torresProducao') {
    return ['Data/hora', 'Torre/caixa', 'Fase', 'EC', 'pH', 'Correção (A+B / água / KOH)', 'H₂O₂', 'Raízes OK?', 'Operador', 'Obs'];
  }
  return ['Data', 'Operador', 'Hora', 'Produto', 'Pedido / Mix', 'Qtd', 'Descarte', 'Selagem OK', 'Obs'];
}

/** Larguras % das colunas do registro diário (soma ≈ 100). */
function sectorFormColWidths(sectorKey, colCount) {
  if (sectorKey === 'plantioAlface' || sectorKey === 'plantioMicroverdes') {
    return [9, 12, 10, 12, 10, 10, 9, 9, 19];
  }
  if (sectorKey === 'torresProducao') {
    return [10, 10, 8, 6, 6, 16, 7, 9, 10, 18];
  }
  if (colCount === 9) {
    return [8, 11, 7, 12, 10, 12, 10, 12, 18];
  }
  return null;
}

function sectorFormHint(sectorKey) {
  if (sectorKey === 'lavagem') {
    return 'LHM 350: água na marcação · Enxágue: 50 L + 250 g × 3 · Imersão 30–45 s · Pré-secagem 1–2 min nas caçapas brancas.';
  }
  if (sectorKey === 'secagem') {
    return 'Entrada: conferir pré-secagem (FIT-LV-002) · CTD ECO: velocidade mínima · ciclo 2+2 min (agitar o cesto no intervalo) · carga sem completar o cesto.';
  }
  if (sectorKey === 'plantioAlface') {
    return 'Higiene 1 ml/L (FIT-PA-001) · Placa SECA → 1/célula → etiquetar → molhar (FIT-PA-002) · Escuro 24–48 h (FIT-PA-003) · Berçário → NFT com espuma (FIT-PA-004).';
  }
  if (sectorKey === 'plantioMicroverdes') {
    return 'Higiene 1 ml/L · Placa SECA · g/m² · Molhar após · Blackout máx. 1–2 d · LED 14–18 h · Colheita: papel toalha · 30 g/pote · fechar · refrigerar.';
  }
  if (sectorKey === 'torresProducao') {
    return 'EC/pH por fase · Correção A+B iguais ou água · KOH pH 5,5–6,5 · H₂O₂ a cada 2 d (310 L: 1 ml/1 L · 500 L: 1,5 ml/1 L) · Raízes OK · Colheita sem lavagem → embalagem.';
  }
  return 'Seleção: critério FIT-PL-001 + umidade ≤ 10% · Embalagem conforme pedido · Máx. 15 sem selar · Selagem: vácuo 2 s · temp. 1,8 s · aquecimento BAIXA · até 4 por ciclo.';
}

function renderSectorForms(sectorKey, viewId) {
  const d = state[sectorKey];
  const el = document.getElementById(viewId);
  if (!d || !el) return;
  const prefix = d.pop.codigo.split('-')[1]; // LV / SC / EM
  const regCode = `REG-${prefix}-001`;
  const higCode = `REG-${prefix}-002`;
  const treCode = `TRE-${prefix}-001`;
  const headers = sectorFormHeaders(sectorKey);
  const cols = headers.length;
  const widths = sectorFormColWidths(sectorKey, cols);
  const tableClass = widths
    ? 'form-table form-table--reg001 form-table--wide'
    : 'form-table form-table--reg001';
  const colgroup = widths
    ? `<colgroup>${widths.map((w) => `<col style="width:${w}%">`).join('')}</colgroup>`
    : '';

  el.innerHTML = `
    ${sectorDraftNote()}
    <div class="doc-header-wrap">${docHeader(regCode, `Registro Diário — ${d.pop.titulo}`, 'FORMULÁRIO')}</div>
    <div class="critical-grid" style="margin-bottom:1rem">
      ${d.controlesCriticos.map((c) => `
        <div class="critical-box" style="padding:.5rem">
          ${renderIcon(c.icon, 28)}
          <div class="val" style="font-size:1rem">${esc(c.valor)}</div>
          <div class="lbl">${esc(c.label)}</div>
        </div>`).join('')}
    </div>
    <table class="${tableClass}">
      ${colgroup}
      <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
      <tbody>${Array(12).fill(0).map(() => `<tr>${Array(cols).fill('<td>&nbsp;</td>').join('')}</tr>`).join('')}</tbody>
    </table>
    <div class="register-box">${esc(sectorFormHint(sectorKey))} · Dúvida → ${esc(state.meta.gerente)}</div>

    <div class="page-break"></div>
    <div class="doc-header-wrap">${docHeader(higCode, `Higienização por Turno — ${d.pop.titulo}`, 'FORMULÁRIO')}</div>
    <div class="extended-higiene" id="${viewId}-higiene" style="margin-bottom:1rem"></div>
    <table class="form-table">
      <thead><tr>
        <th>Data</th><th>Turno</th><th>Operador</th><th>Mãos / EPI</th><th>Bancadas</th><th>Equipamentos</th><th>Utensílios</th><th>Piso</th><th>Visto</th>
      </tr></thead>
      <tbody>${Array(10).fill(0).map(() => `<tr>${Array(9).fill('<td>&nbsp;</td>').join('')}</tr>`).join('')}</tbody>
    </table>
    <div class="register-box">Higienizar as mãos: início, retorno ao posto, após descarte e troca de atividade · Sanitizar bancadas e ferramentas no início do turno e quando necessário.</div>

    <div class="page-break"></div>
    <div class="doc-header-wrap">${docHeader(treCode, `Ficha de Treinamento — ${d.pop.titulo}`, 'FORMULÁRIO')}</div>
    <div class="flow-row" id="${viewId}-treino-flow"></div>
    <table class="summary-table">
      <thead><tr><th>Conteúdo programático</th><th>Teoria ☐</th><th>Prática ☐</th><th>OK ☐</th></tr></thead>
      <tbody>
        ${(d.treinamentoTopics || []).map((t, i) => `
          <tr>
            <td>${fieldCompact(`${sectorKey}.treinamentoTopics.${i}`, t)}</td>
            <td style="text-align:center">☐</td><td style="text-align:center">☐</td><td style="text-align:center">☐</td>
          </tr>`).join('')}
      </tbody>
    </table>
    <p style="margin-top:1rem">Colaborador: _________________________ Data: ____/____/________</p>
    <p>Gerente: _________________________ Resultado: ☐ Aprovado ☐ Retreinar</p>
  `;
  renderHigieneExtended(el.querySelector(`#${viewId}-higiene`), d.higienizacao, `${sectorKey}.higienizacao`);
  renderFlow(el.querySelector(`#${viewId}-treino-flow`), d.fluxo);
  bindEditableFields(el);
  bindLogo();
}


function placaTipoClass(tipo) {
  if (tipo === 'PROIBIDO') return 'placa-tipo--proibido';
  if (tipo === 'ATENÇÃO') return 'placa-tipo--atencao';
  if (tipo === 'OBRIGATÓRIO') return 'placa-tipo--obrigatorio';
  return 'placa-tipo--geral';
}

/** Placa BPF de parede (A4) — uma folha por documento */
function renderPlacaBpf(index) {
  if (typeof PLACAS_BPF === 'undefined') return;
  const placa = PLACAS_BPF[index];
  if (!placa) return;
  const viewKey = placa.id.replace(/^placa-/, 'bpf-');
  const fotoKey = placa.id.replace(/^placa-/, '');
  const el = document.getElementById(`view-${viewKey}`);
  if (!el) {
    console.error('View de placa BPF não encontrada:', viewKey);
    return;
  }
  state.doc = { codigo: placa.codigo, titulo: placa.titulo };
  ensurePlacasBpfFotos();

  const heroKind = ({
    'OBRIGATÓRIO': 'obrigatorio',
    'PROIBIDO': 'proibido',
    'ATENÇÃO': 'atencao',
  })[placa.tipo] || 'geral';
  const tipoCls = placaTipoClass(placa.tipo);
  const heroPath = `placasBpf.fotos.${fotoKey}.hero`;
  const heroHint = placa.fotoHint || 'Foto ilustrativa — clique para enviar';
  const hasStepPhotos = Array.isArray(placa.passos) && placa.passos.some((p) => p.fotoHint);

  let body = '';

  body += `
    <figure class="placa-foto-destaque">
      ${photoSlot(`${viewKey}-hero`, heroPath, heroHint, true, true)}
      <figcaption class="placa-foto-caption no-print">${esc(heroHint)}</figcaption>
    </figure>`;

  if (placa.passos?.length) {
    body += `
      <div class="placa-passos ${hasStepPhotos ? 'placa-passos--com-foto' : ''}">
        ${placa.passos.map((p, i) => {
          const stepPhoto = p.fotoHint
            ? `<div class="placa-passo-foto">
                ${photoSlot(`${viewKey}-p${i}`, `placasBpf.fotos.${fotoKey}.passos.${i}`, p.fotoHint, false, true)}
              </div>`
            : '';
          return `
          <div class="placa-passo ${stepPhoto ? 'placa-passo--com-foto' : ''}">
            <div class="num">${i + 1}</div>
            <div class="icon-box">${renderIcon(p.icon, 40)}</div>
            <div class="placa-passo-text print-text-fixed">${esc(p.texto)}</div>
            ${stepPhoto}
          </div>`;
        }).join('')}
      </div>`;
  }

  if (placa.proibidos?.length || placa.permitidos?.length) {
    body += `<div class="placa-split">`;
    if (placa.proibidos?.length) {
      body += `
        <div class="placa-col placa-col--proibido">
          <h3>✘ PROIBIDO</h3>
          <ul>
            ${placa.proibidos.map((p) => `
              <li>${renderIcon(p.icon, 28)}<span class="print-text-fixed">${esc(p.texto)}</span></li>`).join('')}
          </ul>
        </div>`;
    }
    if (placa.permitidos?.length) {
      body += `
        <div class="placa-col placa-col--permitido">
          <h3>✔ PERMITIDO</h3>
          <ul>
            ${placa.permitidos.map((p) => `
              <li>${renderIcon(p.icon, 28)}<span class="print-text-fixed">${esc(p.texto)}</span></li>`).join('')}
          </ul>
        </div>`;
    }
    body += `</div>`;
  }

  if (placa.regras?.length) {
    body += `
      <div class="placa-regras">
        ${placa.regras.map((r) => `
          <div class="placa-regra">
            ${renderIcon(r.icon, 40)}
            <strong>${esc(r.titulo)}</strong>
            <p class="print-text-fixed">${esc(r.texto)}</p>
          </div>`).join('')}
      </div>`;
  }

  if (placa.lembretes?.length) {
    body += `
      <div class="mini-cards placa-lembretes">
        ${placa.lembretes.map((c, i) => `
          <div class="mini-card ${MINI_CARD_COLORS[i % MINI_CARD_COLORS.length]}">
            <div class="mini-card-icon">${renderIcon(c.icon, 36)}</div>
            <strong>${esc(c.titulo)}</strong>
            <span class="print-text-fixed">${esc(c.sub)}</span>
          </div>`).join('')}
      </div>`;
  }

  el.innerHTML = `
    <div class="print-page" data-print-page="${viewKey}">
      <div class="placa-sheet tema-${esc(placa.tema)}">
        <div class="doc-header-wrap">${docHeader(placa.codigo, placa.titulo, placa.tipo, '_bpf.codigo', '_bpf.titulo')}</div>
        <div class="placa-hero placa-hero--${heroKind}">
          <span class="placa-tipo ${tipoCls}">${esc(placa.tipo)}</span>
          <div class="placa-hero-title">${esc(placa.titulo)}</div>
        </div>
        <p class="placa-destaque">${esc(placa.destaque)}</p>
        <div class="placa-body">${body}</div>
        <div class="register-box">Fazendas UP · BPF · Dúvida → ${esc(state.meta.gerente)}</div>
      </div>
    </div>`;
  bindPhotos(el);
  bindLogo();
}

function renderAll() {
  ensureState();
  const views = [
    ['pop', renderPop],
    ['fit1', () => renderFit(0)],
    ['fit2', () => renderFit(1)],
    ['fit3', () => renderFit(2)],
    ['cartaz', renderCartaz],
    ['formularios', renderFormularios],
    ['lv-pop', () => renderSectorPop('lavagem', 'view-lv-pop')],
    ['lv-fit0', () => renderSectorFit('lavagem', 0, 'view-lv-fit0', 'steps-first')],
    ['lv-fit1', () => renderSectorFit('lavagem', 1, 'view-lv-fit1', 'ops')],
    ['lv-cartaz', () => renderSectorCartaz('lavagem', 'view-lv-cartaz')],
    ['lv-forms', () => renderSectorForms('lavagem', 'view-lv-forms')],
    ['sc-pop', () => renderSectorPop('secagem', 'view-sc-pop')],
    ['sc-fit0', () => renderSectorFit('secagem', 0, 'view-sc-fit0', 'steps-first')],
    ['sc-fit1', () => renderSectorFit('secagem', 1, 'view-sc-fit1', 'ops')],
    ['sc-fit2', () => renderSectorFit('secagem', 1, 'view-sc-fit1', 'ops')],
    ['sc-cartaz', () => renderSectorCartaz('secagem', 'view-sc-cartaz')],
    ['sc-forms', () => renderSectorForms('secagem', 'view-sc-forms')],
    ['em-pop', () => renderSectorPop('embalagem', 'view-em-pop')],
    ['em-fit0', () => renderSectorFit('embalagem', 0, 'view-em-fit0', 'ops')],
    ['em-fit1', () => renderSectorFit('embalagem', 1, 'view-em-fit1', 'ops')],
    ['em-cartaz', () => renderSectorCartaz('embalagem', 'view-em-cartaz')],
    ['em-forms', () => renderSectorForms('embalagem', 'view-em-forms')],
    ['pa-pop', () => renderSectorPop('plantioAlface', 'view-pa-pop')],
    ['pa-fit0', () => renderSectorFit('plantioAlface', 0, 'view-pa-fit0', 'ops')],
    ['pa-fit1', () => renderSectorFit('plantioAlface', 1, 'view-pa-fit1', 'ops')],
    ['pa-fit2', () => renderSectorFit('plantioAlface', 2, 'view-pa-fit2', 'ops')],
    ['pa-fit3', () => renderSectorFit('plantioAlface', 3, 'view-pa-fit3', 'ops')],
    ['pa-cartaz', () => renderSectorCartaz('plantioAlface', 'view-pa-cartaz')],
    ['pa-forms', () => renderSectorForms('plantioAlface', 'view-pa-forms')],
    ['pm-pop', () => renderSectorPop('plantioMicroverdes', 'view-pm-pop')],
    ['pm-fit0', () => renderSectorFit('plantioMicroverdes', 0, 'view-pm-fit0', 'ops')],
    ['pm-fit1', () => renderSectorFit('plantioMicroverdes', 1, 'view-pm-fit1', 'ops')],
    ['pm-fit2', () => renderSectorFit('plantioMicroverdes', 2, 'view-pm-fit2', 'ops')],
    ['pm-fit3', () => renderSectorFit('plantioMicroverdes', 3, 'view-pm-fit3', 'ops')],
    ['pm-fit4', () => renderSectorFit('plantioMicroverdes', 4, 'view-pm-fit4', 'ops')],
    ['pm-cartaz', () => renderSectorCartaz('plantioMicroverdes', 'view-pm-cartaz')],
    ['pm-forms', () => renderSectorForms('plantioMicroverdes', 'view-pm-forms')],
    ['tr-pop', () => renderSectorPop('torresProducao', 'view-tr-pop')],
    ['tr-fit0', () => renderSectorFit('torresProducao', 0, 'view-tr-fit0', 'ops')],
    ['tr-fit1', () => renderSectorFit('torresProducao', 1, 'view-tr-fit1', 'ops')],
    ['tr-fit2', () => renderSectorFit('torresProducao', 2, 'view-tr-fit2', 'ops')],
    ['tr-fit3', () => renderSectorFit('torresProducao', 3, 'view-tr-fit3', 'ops')],
    ['tr-fit4', () => renderSectorFit('torresProducao', 4, 'view-tr-fit4', 'ops')],
    ['tr-fit5', () => renderSectorFit('torresProducao', 5, 'view-tr-fit5', 'ops')],
    ['tr-fit6', () => renderSectorFit('torresProducao', 6, 'view-tr-fit6', 'ops')],
    ['tr-cartaz', () => renderSectorCartaz('torresProducao', 'view-tr-cartaz')],
    ['tr-forms', () => renderSectorForms('torresProducao', 'view-tr-forms')],
    ['bpf-maos', () => renderPlacaBpf(0)],
    ['bpf-adornos', () => renderPlacaBpf(1)],
    ['bpf-celular', () => renderPlacaBpf(2)],
    ['bpf-saude', () => renderPlacaBpf(3)],
    ['bpf-higiene', () => renderPlacaBpf(4)],
    ['bpf-regras', () => renderPlacaBpf(5)],
    ['config', renderConfig],
  ];
  for (const [name, fn] of views) {
    try {
      fn();
    } catch (err) {
      console.error(`Erro ao renderizar ${name}:`, err);
      const el = document.getElementById(`view-${name}`);
      if (el) {
        el.innerHTML = `<div class="render-error">
          <p><strong>Erro ao carregar ${name}</strong></p>
          <p>${esc(err.message)}</p>
          <p>Clique em <strong>Restaurar padrão</strong> no menu lateral.</p>
        </div>`;
      }
    }
  }
  showView(currentView);
  activateNavForView(currentView);
}
