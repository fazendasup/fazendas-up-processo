/**
 * Minimamente processados — legumes (batata, cenoura, beterraba, repolho, cebola)
 * POP-LG-001 + FIT-LG-001 a 005
 * PAA 80 mg/L · 90 s · 0–4 °C · peel-to-pack ≤30 min
 */
(function initLegumesSectors() {
  if (typeof DEFAULT_DATA === 'undefined' || typeof makeSectorSkeleton !== 'function') return;

  DEFAULT_DATA.legumesProcessados = makeSectorSkeleton({
    codigo: 'POP-LG-001',
    titulo: 'Lavagem e Minimamente Processados — Legumes',
    objetivo:
      'Padronizar recepção, corte, sanitização com ácido peracético (PAA), banho antioxidante, centrifugação e embalagem de batata, cenoura, beterraba, repolho e cebola, com zona suja×limpa, frio 0–4 °C do corte em diante e peel-to-pack ≤30 min.',
    escopo: [
      'Produtos: batata, cenoura, beterraba, repolho e cebola — cada um com FIT própria (FIT-LG-001 a 005).',
      'Abrange: recepção → descasque/corte → PAA 80 mg/L 90 s → enxágue → banho → centrifuga → embalagem.',
      'Regras transversais: PAA em tanque separado; após PAA enxágue água potável 0–4 °C; banho depois (sem enxágue, salvo FIT); beterraba e cebola nunca compartilham tanque.',
      'Não abrange: pré-lavagem de folhosas (POP-PL-001), LHM 350 de folhas (POP-LV-001) nem NFT.',
    ],
    referencias: [
      'RDC nº 216/2004 e RDC nº 275/2002 (BPF).',
      'IN 211/2023 cat. 04.11 refrigerado — ascórbico: verificar base legal / SKU congelado.',
      'FIT-LG-001 Batata · FIT-LG-002 Cenoura · FIT-LG-003 Beterraba · FIT-LG-004 Repolho · FIT-LG-005 Cebola.',
      'Rótulo hortifrúti do ácido peracético (coadjuvante — não listar como ingrediente).',
    ],
    entrada: 'Legume in natura (recepção / seleção)',
    saida: 'Embalagem selada ≤4 °C · peel-to-pack ≤30 min',
    maquina: 'Cortadora (discos E/H) · tanque PAA · tanques de banho · centrífuga · seladora/vácuo conforme SKU',
    controlesCriticos: [
      { valor: '80 mg/L', label: 'PAA · 90 s · 0–4 °C', icon: 'hipoclorito' },
      { valor: '0–4 °C', label: 'Frio do corte → pack', icon: 'termometro' },
      { valor: '≤30 min', label: 'Peel-to-pack', icon: 'timer' },
      { valor: '≤4 °C', label: 'Produto na selagem', icon: 'termometro' },
      { valor: 'E/H', label: 'Disco faca (sem Z/V)', icon: 'faca' },
    ],
    fluxo: [
      { titulo: 'Recepção', sub: 'Zona suja', icon: 'inspecao' },
      { titulo: 'Corte', sub: '0–4 °C · disco E/H', icon: 'faca' },
      { titulo: 'PAA', sub: '80 mg/L · 90 s', icon: 'hipoclorito' },
      { titulo: 'Banho', sub: 'Antioxidante · FIT', icon: 'agua' },
      { titulo: 'Pack', sub: '≤4 °C · ≤30 min', icon: 'etiqueta' },
    ],
    processoDetalhado: [
      { icon: 'alerta', texto: 'Regras transversais: zona suja × limpa; do corte em diante 0–4 °C; selagem com produto ≤4 °C; peel-to-pack ≤30 min. Discos: preferir faca E/H; não usar ralador Z/V no processo validado (salvo SKU ralo de cenoura).', critico: true },
      { icon: 'hipoclorito', texto: 'PAA: tanque separado; 80 mg/L; 90 s; 0–4 °C. Medir antes do lote e a cada 30 min. Descartar se turvo/amido. Não misturar cítrico, ascórbico ou cálcio no tanque de PAA. Seguir rótulo hortifrúti. PAA = coadjuvante → não listar como ingrediente.', critico: true },
      { icon: 'agua', texto: 'Após PAA: enxágue água potável 0–4 °C (tempo na FIT). Banho antioxidante depois. Ordem do banho: dissolver CaCl₂ primeiro (exotérmico) → esfriar ≤4 °C → adicionar ácidos. CaCl₂ di-hidratado = 1,32 × dose anidra.', critico: true },
      { icon: 'etiqueta', texto: 'Rótulo: declarar cítrico, ascórbico e cloreto de cálcio quando permanecerem e funcionarem. IN 211/2023 cat. 04.11 refrigerado: ascórbico não autorizado (só congelado 100 mg/kg) — onde a FIT usa AA, marcar “verificar base legal / SKU congelado”.', critico: true },
      { icon: 'faca', texto: 'BATATA (FIT-LG-001): pré-lavagem (±5 °C da polpa) → descasque (manual preferível) → gelo 0–2 °C (≤30 s abrasivo / ≤60 s manual) → corte H7/cubo se houver → enxágue → PAA 90 s → enxágue 30–45 s → banho 90 s (cítrico 10 + AA 10 + Ca 5 g/L) → centrifuga → vácuo barreira ~1 mbar. Validade piso 5 °C: inteira faca 5–7 d; abrasivo 3–5 d; cortada 3–4 d.', critico: false },
      { icon: 'faca', texto: 'CENOURA (FIT-LG-002): lavar → descasque → corte H7>E3 (Z5 só ralo) → enxágue → PAA → enxágue 30–45 s → banho (H7/E3: cítrico 10 g/L 90 s; Z5: cítrico 15 + Ca 5 g/L 5 min) → centrifuga curta face úmida → PP/PE + ar + furos (2–3/200 g). Piso ~7 d a 4 °C. Defeito-chave: face branca.', critico: false },
      { icon: 'faca', texto: 'BETERRABA (FIT-LG-003): tanque exclusivo. Lavar → descasque → enxágue curto → corte E3/H7 → enxágue pós-corte só 30–45 s → PAA → enxágue 30–45 s → banho 5 min (cítrico 2 g/L; sem AA) → centrifuga ~1 min face úmida → PP/PE + ar + 3–4 furos/200 g · pack escuro. Piso ~4 d a 5 °C.', critico: false },
      { icon: 'faca', texto: 'REPOLHO (FIT-LG-004): limpeza → corte E3 3 mm (retirar talo) → enxágue → PAA → enxágue → banho 3 min (cítrico 10 g/L; Ca 5 opc.) → centrifuga sem esmagar → PE/PP + ar + 2–4 furos · headspace ~2 L ar/kg · O₂ ≥5%. Câmara alvo 0 °C. Piso ~7 d micro a 5 °C. Não imprimir 14/22 d.', critico: false },
      { icon: 'faca', texto: 'CEBOLA (FIT-LG-005): tanque exclusivo. Seleção → casca/raiz/colo → pré-lavagem → corte E3 → enxágue 1 (30–60 s) → PAA → enxágue 2 (30–45 s) → banho 3 min (cítrico 10 + AA 10 + Ca 5 g/L) → centrifuga seca → PP/bandeja + 1–2 furos/200 g. Imprimir 7 d até micro.', critico: false },
      { icon: 'registro', texto: 'Validar microbiologia (mesófilos, E. coli, Salmonella, L. monocytogenes 25 g) dias 0, 3, 5 e 7 antes de imprimir validade além do piso. Códigos de validade e banhos separados por produto.', critico: true },
    ],
    fits: [
      makeFitSkeleton({
        codigo: 'FIT-LG-001',
        titulo: 'Batata — posto (recepção → embalagem)',
        objetivo:
          'Processar batata inteira ou cortada (H7/cubo) com PAA 80 mg/L, banho cítrico+AA+Ca e vácuo em saco alta barreira.',
        antesDeComecar: [
          { icon: 'touca', texto: 'EPIs: touca, luvas, avental, botas.' },
          { icon: 'hipoclorito', texto: 'Tanque PAA pronto: 80 mg/L · 0–4 °C · medido (lote + a cada 30 min).' },
          { icon: 'agua', texto: 'Banho 10 L: 100 g cítrico + 100 g AA + 50 g Ca anidro — Ca primeiro, esfriar ≤4 °C, depois ácidos. ⚠️ AA: verificar base legal / SKU congelado.' },
          { icon: 'termometro', texto: 'Câmara/posto 0–4 °C do corte em diante. Peel-to-pack ≤30 min.' },
        ],
        passos: [
          { icon: 'inspecao', texto: 'Recepção: rejeitar podre, verde excessivo, dano grave.', critico: true },
          { icon: 'agua', texto: 'Pré-lavagem: água ~±5 °C da temperatura da polpa.', critico: false },
          { icon: 'faca', texto: 'Descasque: manual preferível. Abrasivo só se necessário (banho obrigatório).', critico: true },
          { icon: 'termometro', texto: 'Gelo 0–2 °C: ≤30 s abrasivo / ≤60 s manual.', critico: true },
          { icon: 'faca', texto: 'Corte se SKU: H7 ou cubo ~10 mm. Evitar E1/E3/Z/V.', critico: true },
          { icon: 'agua', texto: 'Enxágue → PAA 80 mg/L · 90 s · 0–4 °C → enxágue 30–45 s.', critico: true },
          { icon: 'agua', texto: 'Banho antioxidante 90 s · 0–4 °C · sem enxágue posterior.', critico: true },
          { icon: 'maquina', texto: 'Centrifuga: sem água livre; bordas intactas; validar rpm.', critico: true },
          { icon: 'etiqueta', texto: 'Embalagem: saco alta barreira (ex. Aliprot EVOH) · vácuo ~1 mbar (0,5–10) · pacote plano. Sem PP furado. Produto ≤4 °C.', critico: true },
          { icon: 'registro', texto: 'Controles: ppm PAA · °C · tempo gelo · pesagem ±2% · O₂ residual · foto cor · odor. REG-LG-001.', critico: true },
        ],
        pontosCriticos: [
          'Banho 10 L: 100 + 100 + 50 g · 90 s · sem enxágue.',
          'Vácuo barreira ~1 mbar — não usar PP furado.',
          'Validade piso 5 °C: inteira faca 5–7 d · abrasivo 3–5 d · cortada 3–4 d (códigos separados).',
          'AA no rótulo: verificar base legal / SKU congelado (IN 211/2023).',
        ],
        cards: [
          { icon: 'hipoclorito', titulo: 'PAA', sub: '80 mg/L · 90 s' },
          { icon: 'agua', titulo: 'Banho 10 L', sub: '100+100+50 g' },
          { icon: 'etiqueta', titulo: 'Vácuo', sub: '~1 mbar' },
          { icon: 'timer', titulo: 'Piso', sub: '3–7 d' },
        ],
        problemasComuns: [
          { problema: 'Escurecimento forte', acao: 'Conferir tempo gelo, banho e peel-to-pack ≤30 min.' },
          { problema: 'PAA turvo/amido', acao: 'Descartar solução; não seguir o lote.' },
          { problema: 'Água livre no pack', acao: 'Revalidar centrifuga/rpm.' },
        ],
        registrar: 'REG-LG-001: batata · SKU · disco · ppm PAA · °C · tempos · validade código',
      }),
      makeFitSkeleton({
        codigo: 'FIT-LG-002',
        titulo: 'Cenoura — posto (recepção → embalagem)',
        objetivo:
          'Processar cenoura H7/E3 (ou Z5 ralo sob demanda) com PAA, banho cítrico e embalagem PP/PE com ar e microfuros — face úmida.',
        antesDeComecar: [
          { icon: 'faca', texto: 'Disco: H7 preferencial · E3 moeda · Z5 só se cliente exigir ralo. Sem E1/V.' },
          { icon: 'hipoclorito', texto: 'PAA 80 mg/L · 0–4 °C · medido.' },
          { icon: 'agua', texto: 'Banho 10 L H7/E3: 100 g cítrico (90 s). Z5: 150 g cítrico + 50 g Ca (5 min).' },
        ],
        passos: [
          { icon: 'agua', texto: 'Lavar → descasque → corte (H7>E3).', critico: true },
          { icon: 'agua', texto: 'Enxágue 0–4 °C → PAA 80 mg/L · 90 s → enxágue 30–45 s.', critico: true },
          { icon: 'agua', texto: 'Banho conforme disco (90 s ou 5 min Z5) · sem enxágue.', critico: true },
          { icon: 'maquina', texto: 'Centrifuga curta: face ainda úmida — não secar fosco (evita face branca).', critico: true },
          { icon: 'etiqueta', texto: 'PP/PE + ar + microfuros 0,18 mm · uma face · terço superior · 200 g: 2–3 furos. Sem vácuo. Sem Aliprot. O₂ alvo 5–15%.', critico: true },
          { icon: 'registro', texto: 'Registrar REG-LG-001. Piso H7/E3 ~7 d a 4 °C (validar micro).', critico: true },
        ],
        pontosCriticos: [
          'Defeito-chave: face branca — não secar demais.',
          'Z5: banho 5 min · cítrico 15 g/L + Ca 5 g/L · validade mais curta.',
          'Sem vácuo / sem Aliprot.',
        ],
        cards: [
          { icon: 'faca', titulo: 'Disco', sub: 'H7 > E3' },
          { icon: 'agua', titulo: 'Banho 10 L', sub: '100 g cítr.' },
          { icon: 'etiqueta', titulo: 'Furos', sub: '2–3 / 200 g' },
          { icon: 'timer', titulo: 'Piso', sub: '~7 d' },
        ],
        problemasComuns: [
          { problema: 'Face branca', acao: 'Reduzir centrifuga; manter face úmida.' },
          { problema: 'Usou Aliprot/vácuo', acao: 'Parar: trocar para PP/PE + ar + furos.' },
        ],
        registrar: 'REG-LG-001: cenoura · disco · ppm PAA · face úmida · furos',
      }),
      makeFitSkeleton({
        codigo: 'FIT-LG-003',
        titulo: 'Beterraba — posto (recepção → embalagem)',
        objetivo:
          'Processar beterraba E3/H7 com enxágues curtos (pigmento), PAA, banho cítrico leve e pack permeável escuro. Tanque exclusivo.',
        antesDeComecar: [
          { icon: 'alerta', texto: 'Tanque exclusivo — nunca compartilhar com cebola.' },
          { icon: 'faca', texto: 'Disco E3 fatia ou H7 palito (código de validade próprio). Sem Z/V.' },
          { icon: 'agua', texto: 'Banho 10 L: 20 g cítrico · 5 min · sem AA · sem Ca.' },
        ],
        passos: [
          { icon: 'agua', texto: 'Lavar → descasque → enxágue curto → corte.', critico: true },
          { icon: 'timer', texto: 'Enxágue pós-corte só 30–45 s (pigmento solúvel).', critico: true },
          { icon: 'hipoclorito', texto: 'PAA 80 mg/L · 90 s → enxágue 30–45 s.', critico: true },
          { icon: 'agua', texto: 'Banho 5 min · cítrico 2 g/L · sem enxágue.', critico: true },
          { icon: 'maquina', texto: 'Centrifuga ~1 min · face úmida.', critico: true },
          { icon: 'etiqueta', texto: 'PP/PE + ar + 3–4 furos 0,18 mm / 200 g · O₂ 5–15% · sem vácuo · sem luz forte.', critico: true },
          { icon: 'registro', texto: 'REG-LG-001. Piso fatia/cubo ~4 d a 5 °C — não copiar 6 d sem laudo.', critico: true },
        ],
        pontosCriticos: [
          'Tanque exclusivo (mancha).',
          'Sem AA (risco a betalaína).',
          'Enxágue pós-corte curto 30–45 s.',
        ],
        cards: [
          { icon: 'alerta', titulo: 'Tanque', sub: 'Exclusivo' },
          { icon: 'agua', titulo: 'Banho 10 L', sub: '20 g cítr. · 5 min' },
          { icon: 'etiqueta', titulo: 'Furos', sub: '3–4 / 200 g' },
          { icon: 'timer', titulo: 'Piso', sub: '~4 d' },
        ],
        problemasComuns: [
          { problema: 'Desbotamento forte', acao: 'Enxágue pós-corte ≤45 s; pack escuro.' },
          { problema: 'Tanque compartilhado', acao: 'Parar lote; higienizar; isolar beterraba.' },
        ],
        registrar: 'REG-LG-001: beterraba · E3/H7 · tanque exclusivo · ppm PAA',
      }),
      makeFitSkeleton({
        codigo: 'FIT-LG-004',
        titulo: 'Repolho — posto (recepção → embalagem)',
        objetivo:
          'Processar repolho em tiras E3 3 mm (salada) com PAA, banho cítrico e embalagem permeável com headspace e O₂ ≥5%.',
        antesDeComecar: [
          { icon: 'faca', texto: 'Disco E3 · retirar talo. H7 só SKU palito grosso separado. Sem Z/V/E1.' },
          { icon: 'agua', texto: 'Banho 10 L: 100 g cítrico (± 50 g Ca se amolecer) · 3 min. Rótulo “só repolho”: omitir cítrico.' },
          { icon: 'termometro', texto: 'Câmara alvo 0 °C · operação ≤2 °C (alarme).' },
        ],
        passos: [
          { icon: 'inspecao', texto: 'Limpeza → corte E3 3 mm · retirar talo.', critico: true },
          { icon: 'agua', texto: 'Enxágue 0–4 °C → PAA 80 mg/L · 90 s → enxágue.', critico: true },
          { icon: 'agua', texto: 'Banho 3 min (cítrico 10 g/L).', critico: true },
          { icon: 'maquina', texto: 'Centrifuga: água solta fora, sem esmagar (validar rpm/tempo).', critico: true },
          { icon: 'etiqueta', texto: 'PE/PP + ar + 2–4 furos / 200 g · headspace folgado (~2 L ar/kg) · O₂ ≥5% (alarme <3–5%). Sem vácuo.', critico: true },
          { icon: 'registro', texto: 'REG-LG-001. Piso ~7 d micro a 5 °C. Não imprimir 14/22 d.', critico: true },
        ],
        pontosCriticos: [
          'Retirar talo.',
          'O₂ ≥5% · câmara alvo 0 °C.',
          'Não imprimir 14/22 d neste SKU 3 mm.',
        ],
        cards: [
          { icon: 'faca', titulo: 'Disco', sub: 'E3 · sem talo' },
          { icon: 'agua', titulo: 'Banho 10 L', sub: '100 g cítr. · 3 min' },
          { icon: 'etiqueta', titulo: 'O₂', sub: '≥ 5%' },
          { icon: 'timer', titulo: 'Piso', sub: '~7 d' },
        ],
        problemasComuns: [
          { problema: 'Esmagamento', acao: 'Reduzir carga/tempo de centrifuga.' },
          { problema: 'O₂ baixo no pack', acao: 'Mais furos/headspace; alarme <3–5%.' },
        ],
        registrar: 'REG-LG-001: repolho · E3 · ppm PAA · O₂ · câmara °C',
      }),
      makeFitSkeleton({
        codigo: 'FIT-LG-005',
        titulo: 'Cebola — posto (recepção → embalagem)',
        objetivo:
          'Processar cebola E3 fatia 3 mm com duplo enxágue, PAA, banho cítrico+AA+Ca e pack permeável. Tanque exclusivo.',
        antesDeComecar: [
          { icon: 'alerta', texto: 'Tanque exclusivo — nunca compartilhar com beterraba (odor).' },
          { icon: 'faca', texto: 'Disco E3. Cubo 10 mm só sob demanda. Sem E1/Z/V/H7.' },
          { icon: 'agua', texto: 'Banho 10 L: 100 g cítrico + 100 g AA + 50 g Ca — Ca primeiro, esfriar, ácidos. ⚠️ AA: verificar base legal / SKU congelado.' },
        ],
        passos: [
          { icon: 'inspecao', texto: 'Seleção → retirar casca/raiz/colo → pré-lavagem → corte E3.', critico: true },
          { icon: 'agua', texto: 'Enxágue 1: 30–60 s (tirar suco).', critico: true },
          { icon: 'hipoclorito', texto: 'PAA 80 mg/L · 90 s → enxágue 2: 30–45 s.', critico: true },
          { icon: 'agua', texto: 'Banho 3 min · sem enxágue.', critico: true },
          { icon: 'maquina', texto: 'Centrifuga até sem água livre.', critico: true },
          { icon: 'etiqueta', texto: 'PP/bandeja + ar · 1–2 furos 0,18 mm / 200 g · O₂ ≥2–5%. Vácuo parcial só se medido; não Aliprot 1 mbar como 1ª opção.', critico: true },
          { icon: 'registro', texto: 'REG-LG-001. Imprimir 7 d até micro (qualidade fatia pode ir além com laudo).', critico: true },
        ],
        pontosCriticos: [
          'Tanque exclusivo (odor).',
          'Banho 10 L: 100+100+50 g · 3 min.',
          'Imprimir conservador 7 d até micro.',
        ],
        cards: [
          { icon: 'alerta', titulo: 'Tanque', sub: 'Exclusivo' },
          { icon: 'agua', titulo: 'Banho 10 L', sub: '100+100+50 g' },
          { icon: 'etiqueta', titulo: 'Furos', sub: '1–2 / 200 g' },
          { icon: 'timer', titulo: 'Imprimir', sub: '7 d' },
        ],
        problemasComuns: [
          { problema: 'Odor residual no tanque', acao: 'Higienizar; nunca misturar com beterraba.' },
          { problema: 'Água livre no pack', acao: 'Refazer centrifuga.' },
        ],
        registrar: 'REG-LG-001: cebola · E3 · tanque exclusivo · ppm PAA · validade 7 d',
      }),
    ],
    resumoExtra: [
      { item: 'PAA', valor: '80 mg/L · 90 s · 0–4 °C · tanque separado' },
      { item: 'Frio', valor: 'Corte→pack 0–4 °C · selagem ≤4 °C · peel-to-pack ≤30 min' },
      { item: 'Tanques', valor: 'Beterraba ≠ cebola · banhos por produto' },
      { item: 'Micro', valor: 'Dias 0/3/5/7 antes de validade > piso' },
    ],
  });

  Object.assign(DEFAULT_DATA.legumesProcessados, {
    pop: {
      ...DEFAULT_DATA.legumesProcessados.pop,
      produtos: 'Batata · Cenoura · Beterraba · Repolho · Cebola',
      capacidade: 'Conforme demanda de vendas / SKU',
      origem: 'Fornecedor / estoque in natura',
      equipe: '1 operador por posto / turno',
    },
    definicoes: [
      { termo: 'PAA', definicao: 'Ácido peracético 80 mg/L · 90 s · 0–4 °C em tanque separado — coadjuvante, não listar no rótulo.' },
      { termo: 'Peel-to-pack', definicao: 'Tempo máximo de 30 min entre descasque/corte e embalagem fechada.' },
      { termo: 'Banho antioxidante', definicao: 'Solução após o enxágue do PAA (cítrico ± AA ± Ca conforme FIT); em geral sem enxágue posterior.' },
      { termo: 'Disco E/H', definicao: 'Corte tipo faca validado. Z/V (ralador) fora do processo validado, salvo SKU ralo de cenoura.' },
      { termo: 'Validade de piso', definicao: 'Prazo máximo imprimível até laudo micro dias 0, 3, 5 e 7.' },
    ],
    folhas: {
      aprovado: [
        'Cor e odor típicos do legume',
        'Sem podridão ou dano grave',
        'Temperatura ≤4 °C na selagem',
        'Embalagem e furos/vácuo conforme FIT',
      ],
      reprovado: [
        'Podre, odor off, face branca (cenoura) extrema',
        'Água livre anormal no pack',
        'PAA fora de ppm / tanque turvo',
        'Peel-to-pack > 30 min ou produto >4 °C na selagem',
      ],
    },
    utensilios: [
      { nome: 'EPIs', icon: 'touca' },
      { nome: 'Cortadora (discos E/H)', icon: 'faca' },
      { nome: 'Tanque PAA + kit ppm', icon: 'hipoclorito' },
      { nome: 'Tanques de banho (por produto)', icon: 'agua' },
      { nome: 'Centrífuga', icon: 'maquina' },
      { nome: 'Balança (±2%)', icon: 'inspecao' },
      { nome: 'Embalagens / seladora', icon: 'etiqueta' },
      { nome: 'Timer / termômetro', icon: 'timer' },
    ],
    riscos: [
      { icon: 'corte', titulo: 'CORTE', acao: 'Luvas; lâminas afiadas; disco travado; faca no suporte.' },
      { icon: 'quimico', titulo: 'QUÍMICO', acao: 'PAA e ácidos: EPI; não misturar PAA com cítrico/AA/Ca; dosar com balança.' },
      { icon: 'pisoMolhado', titulo: 'PISO MOLHADO', acao: 'Botas; secar; sinalizar.' },
      { icon: 'alerta', titulo: 'CONTAMINAÇÃO CRUZADA', acao: 'Beterraba e cebola: tanques e utensílios exclusivos.' },
    ],
    registros: [
      'REG-LG-001 — Lote, produto, disco, ppm PAA, °C, tempos, banho, embalagem, validade.',
      'REG-LG-002 — Higienização de tanques e posto.',
      'TRE-LG-001 — Treinamento POP-LG-001 e FIT-LG-001 a 005.',
    ],
    naoConformidades: [
      'PAA fora de faixa ou tanque turvo: interromper, descartar solução, registrar.',
      'Tanque compartilhado beterraba/cebola: parar, higienizar, avaliar lote.',
      'Validade impressa > piso sem micro 0/3/5/7: reter lote.',
      'Desvio de POP: somente com autorização da Gerente Karla Maia.',
    ],
  });

  if (typeof applyFoodSafetyToSector === 'function') {
    applyFoodSafetyToSector(DEFAULT_DATA.legumesProcessados);
  }
  if (typeof refreshSectorTrainingTopics === 'function') {
    refreshSectorTrainingTopics(DEFAULT_DATA.legumesProcessados);
  }
})();
