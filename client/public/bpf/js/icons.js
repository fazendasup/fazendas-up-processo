/**
 * Ícones operacionais — SVG inline (imprime e funciona em file://)
 * Cores pensadas para contraste AA no fundo do badge; em cards escuros
 * o CSS força branco via currentColor.
 */
const ICON_MAP = {
  logo:         { icon: 'lucide:sprout',                color: '#1B5E20', bg: '#E8F5E9' },
  tesoura:      { icon: 'lucide:scissors',              color: '#37474F', bg: '#ECEFF1' },
  faca:         { icon: 'mdi:knife',                    color: '#37474F', bg: '#ECEFF1' },
  copoDosador:  { icon: 'mdi:beaker-outline',           color: '#BF360C', bg: '#FBE9E7' },
  cacapaPreta:  { icon: 'mdi:package-variant-closed',   color: '#212121', bg: '#ECEFF1' },
  cacapaBranca: { icon: 'mdi:package-variant',          color: '#546E7A', bg: '#ECEFF1' },
  cestoAzul:    { icon: 'mdi:basket-fill',              color: '#0D47A1', bg: '#E3F2FD' },
  organico:     { icon: 'mdi:compost',                  color: '#33691E', bg: '#F1F8E9' },
  reciclagem:   { icon: 'mdi:recycle',                  color: '#0D47A1', bg: '#E3F2FD' },
  timer:        { icon: 'lucide:timer',                 color: '#B71C1C', bg: '#FFEBEE' },
  mop:          { icon: 'mdi:bucket-outline',           color: '#4E342E', bg: '#EFEBE9' },
  suporte:      { icon: 'mdi:knife-military',           color: '#37474F', bg: '#ECEFF1' },
  alcool:       { icon: 'mdi:hand-wash-outline',        color: '#0D47A1', bg: '#E3F2FD' },
  borrifador:   { icon: 'mdi:spray-bottle',             color: '#0D47A1', bg: '#E3F2FD' },
  maquina:      { icon: 'mdi:dishwasher',               color: '#263238', bg: '#ECEFF1' },
  hipoclorito:  { icon: 'mdi:bottle-tonic-plus',        color: '#E65100', bg: '#FFF3E0' },
  termometro:   { icon: 'lucide:thermometer-snowflake', color: '#B71C1C', bg: '#FFEBEE' },
  bancada:      { icon: 'mdi:countertop-outline',       color: '#37474F', bg: '#ECEFF1' },
  lavagem:      { icon: 'mdi:water-sync',               color: '#01579B', bg: '#E1F5FE' },
  descarte:     { icon: 'lucide:trash-2',               color: '#455A64', bg: '#ECEFF1' },
  saco:         { icon: 'mdi:shopping-outline',         color: '#455A64', bg: '#ECEFF1' },
  agua:         { icon: 'lucide:droplets',              color: '#01579B', bg: '#E1F5FE' },
  seta:         { icon: 'lucide:arrow-right',           color: '#2E7D32', bg: '#E8F5E9' },
  fornecedor:   { icon: 'mdi:truck-delivery-outline',   color: '#37474F', bg: '#ECEFF1' },
  folhaBoa:     { icon: 'lucide:leaf',                  color: '#1B5E20', bg: '#E8F5E9' },
  folhaRuim:    { icon: 'mdi:leaf-off',                 color: '#B71C1C', bg: '#FFEBEE' },
  maços:        { icon: 'mdi:leaf-circle',              color: '#1B5E20', bg: '#E8F5E9' },
  touca:        { icon: 'mdi:chef-hat',                 color: '#0D47A1', bg: '#E3F2FD' },
  luvas:        { icon: 'mdi:hand-back-left',           color: '#0D47A1', bg: '#E3F2FD' },
  avental:      { icon: 'mdi:tshirt-crew',              color: '#0D47A1', bg: '#E3F2FD' },
  botas:        { icon: 'mdi:shoe-print',               color: '#0D47A1', bg: '#E3F2FD' },
  check:        { icon: 'lucide:circle-check-big',      color: '#1B5E20', bg: '#E8F5E9' },
  xmark:        { icon: 'lucide:circle-x',              color: '#B71C1C', bg: '#FFEBEE' },
  alerta:       { icon: 'lucide:triangle-alert',        color: '#E65100', bg: '#FFF3E0' },
  registro:     { icon: 'lucide:clipboard-list',        color: '#1B5E20', bg: '#E8F5E9' },
  corte:        { icon: 'lucide:scissors',              color: '#B71C1C', bg: '#FFEBEE' },
  quimico:      { icon: 'mdi:flask-outline',            color: '#E65100', bg: '#FFF3E0' },
  pisoMolhado:  { icon: 'mdi:water-alert',              color: '#01579B', bg: '#E1F5FE' },
  inspecao:     { icon: 'mdi:eye-check-outline',        color: '#263238', bg: '#ECEFF1' },
  balanca:      { icon: 'lucide:scale',                 color: '#37474F', bg: '#ECEFF1' },
  etiqueta:     { icon: 'lucide:tag',                   color: '#F57F17', bg: '#FFF8E1' },
  equipe:       { icon: 'mdi:account-group-outline',    color: '#37474F', bg: '#ECEFF1' },
  mao:          { icon: 'mdi:hand-wash-outline',        color: '#0D47A1', bg: '#E3F2FD' },
  celular:      { icon: 'mdi:cellphone-off',            color: '#B71C1C', bg: '#FFEBEE' },
  adornos:      { icon: 'mdi:ring',                     color: '#B71C1C', bg: '#FFEBEE' },
  doente:       { icon: 'mdi:emoticon-sick-outline',    color: '#E65100', bg: '#FFF3E0' },
  comida:       { icon: 'mdi:food-off',                 color: '#B71C1C', bg: '#FFEBEE' },
  foto:         { icon: 'mdi:camera-off',               color: '#B71C1C', bg: '#FFEBEE' },
};

/** Cache de SVG baixado do Iconify (chave = nome lógico) */
const ICON_SVG = {};
let iconsReady = false;

function iconCdnUrl(cfg, size) {
  const [prefix, name] = cfg.icon.split(':');
  // Sempre pede preto; normalizamos para currentColor no preload
  return `https://api.iconify.design/${prefix}/${name}.svg?color=${encodeURIComponent('#000000')}&height=${size}`;
}

/** Faz o SVG herdar a cor do .icon-wrap (currentColor). */
function normalizeSvgColor(svg) {
  return svg
    .replace(/fill="(?!none)[^"]*"/gi, 'fill="currentColor"')
    .replace(/stroke="(?!none)[^"]*"/gi, 'stroke="currentColor"')
    .replace(/style="([^"]*)"/gi, (_, style) => {
      const next = style
        .replace(/fill:\s*[^;]+/gi, 'fill:currentColor')
        .replace(/stroke:\s*[^;]+/gi, 'stroke:currentColor');
      return `style="${next}"`;
    });
}

async function preloadIcons(timeoutMs = 4000) {
  const entries = Object.entries(ICON_MAP);
  const perIconMs = Math.min(2500, timeoutMs);

  const loadOne = async ([key, cfg]) => {
    try {
      const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), perIconMs) : null;
      const res = await fetch(iconCdnUrl(cfg, 48), ctrl ? { signal: ctrl.signal } : undefined);
      if (timer) clearTimeout(timer);
      if (!res.ok) {
        console.warn('Ícone HTTP falhou:', key, cfg.icon, res.status);
        return;
      }
      let svg = await res.text();
      if (!svg.includes('<svg') || svg.length < 40) {
        console.warn('Ícone vazio:', key, cfg.icon);
        return;
      }
      svg = normalizeSvgColor(svg);
      svg = svg.replace('<svg', '<svg class="icon-svg"');
      ICON_SVG[key] = svg;
    } catch (e) {
      console.warn('Ícone não carregou:', key, e);
    }
  };

  // Nunca bloquear a UI: se a CDN travar, segue com fallback <img>
  await Promise.race([
    Promise.all(entries.map(loadOne)),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  iconsReady = true;
  return ICON_SVG;
}

function renderIcon(name, size = 48) {
  const cfg = ICON_MAP[name];
  const pad = size <= 28 ? 4 : size <= 36 ? 5 : 6;
  const box = size + pad * 2;
  if (!cfg) {
    return `<span class="icon-wrap icon-missing-wrap" style="width:${box}px;height:${box}px;min-width:${box}px;min-height:${box}px" title="Ícone ausente: ${name}">
      <span class="icon-missing">?</span>
    </span>`;
  }

  const svg = ICON_SVG[name];
  if (svg) {
    const sized = svg
      .replace(/width="[^"]*"/, `width="${size}"`)
      .replace(/height="[^"]*"/, `height="${size}"`);
    const withSize = /width="/.test(sized)
      ? sized
      : sized.replace('<svg', `<svg width="${size}" height="${size}"`);
    return `<span class="icon-wrap" data-icon="${name}" style="background:${cfg.bg || '#f4f6f8'};width:${box}px;height:${box}px;min-width:${box}px;min-height:${box}px;padding:${pad}px;color:${cfg.color}">${withSize}</span>`;
  }

  // Fallback enquanto o preload não terminou: <img> com a cor do mapa
  const [prefix, iname] = cfg.icon.split(':');
  const src = `https://api.iconify.design/${prefix}/${iname}.svg?color=${encodeURIComponent(cfg.color)}&height=${size}`;
  return `<span class="icon-wrap" data-icon="${name}" style="background:${cfg.bg || '#f4f6f8'};width:${box}px;height:${box}px;min-width:${box}px;min-height:${box}px;padding:${pad}px;color:${cfg.color}">
    <img class="icon-img" src="${src}" width="${size}" height="${size}" alt="" decoding="async">
  </span>`;
}

if (typeof module !== 'undefined') module.exports = { ICON_MAP, ICON_SVG, preloadIcons, renderIcon };
