/**
 * Sala de Plantio — Alface (hidroponia) e Microverdes (indoor)
 * Substrato: espuma biodegradável (sem pré-tratamento químico)
 * Fluxo: placa SECA → semeadeira → molhar DEPOIS do semeio
 * FITs: instrução operacional (“como fazer”), no estilo Lavagem/LHM
 */
(function initPlantioSectors() {
  if (typeof DEFAULT_DATA === 'undefined') return;

  DEFAULT_DATA.plantioAlface = makeSectorSkeleton({
    codigo: 'POP-PA-001',
    titulo: 'Plantio de Alface — Maternidade Hidropônica',
    objetivo:
      'Padronizar a produção de mudas de alface em espuma biodegradável (sem pré-tratamento químico), conforme as FIT-PA-001 a 004: higienização com ácido peracético 1 ml/L, semeadura a seco na máquina, molhar após o semeio, germinação em escuro (24–48 h) e berçário até o transplantio para NFT com a espuma.',
    escopo: [
      'Abrange a sequência das FITs: FIT-PA-001 (higienização 1 ml/L), FIT-PA-002 (placa seca → semeadeira → 1 peletizada/célula → etiquetar → molhar), FIT-PA-003 (escuro 24–48 h · 22–25 °C · UR 70–80 %), FIT-PA-004 (berçário e transplantio NFT).',
      'Substrato: espuma biodegradável — entra SECA na semeadeira; molhar somente após o semeio. Sem lavagem alcalina nem pré-tratamento químico da placa.',
      'Não abrange: operação contínua das bancadas NFT após o transplantio, colheita de alface adulta nem microverdes (POP-PM-001).',
    ],
    referencias: [
      'RDC nº 216/2004 e RDC nº 275/2002 (BPF).',
      'FIT-PA-001 a FIT-PA-004 (instrução operacional deste POP).',
      'Ácido peracético 1 ml/L — higienização de bancadas, ferramentas e semeadeira (borrifador).',
      'Manual do sistema NFT / berçário e da máquina semeadeira (unidade).',
    ],
    entrada: 'Semente peletizada de alface + placa biodegradável seca',
    saida: 'Muda pronta (3–4 folhas · 5–8 cm · raízes) com espuma → NFT',
    maquina: 'Máquina semeadeira + câmara de germinação (escuro) + berçário iluminado',
    controlesCriticos: [
      { valor: '1 ml/L', label: 'Ác. peracético (higiene)', icon: 'hipoclorito' },
      { valor: 'Seca', label: 'Placa na semeadeira', icon: 'check' },
      { valor: '1/célula', label: 'Semente peletizada', icon: 'folhaBoa' },
      { valor: 'Após semeio', label: 'Molhar espuma', icon: 'agua' },
      { valor: '24–48 h', label: 'Escuro · 22–25 °C', icon: 'timer' },
    ],
    fluxo: [
      { titulo: 'Higienizar', sub: '1 ml/L borrifador', icon: 'borrifador' },
      { titulo: 'Semear', sub: 'Seca → molhar após', icon: 'folhaBoa' },
      { titulo: 'Escuro', sub: '24–48 h', icon: 'timer' },
      { titulo: 'Berçário', sub: 'Luz + SN', icon: 'bancada' },
      { titulo: 'NFT', sub: 'Com espuma', icon: 'seta' },
    ],
    processoDetalhado: [
      { icon: 'borrifador', texto: 'Higienização (FIT-PA-001): preparar ácido peracético 1 ml/L no borrifador. Limpar sujeira de bancadas, bandejas, ferramentas e semeadeira; borrifar; secar. Registrar no REG-PA-002. Só então iniciar o semeio.', critico: true },
      { icon: 'folhaBoa', texto: 'Semeadura (FIT-PA-002): placa íntegra e SECA na máquina → abastecer peletizada → acionar ciclo → conferir 1 semente/célula → etiquetar (variedade, lote, data, operador) → molhar até úmida por igual (sem poça) → escorrer excesso → encaixar suporte se usar → levar na hora ao escuro. Nunca molhar antes da semeadeira.', critico: true },
      { icon: 'timer', texto: 'Germinação (FIT-PA-003): escuro 24–48 h (ou até emergência). Manter 22–25 °C e UR 70–80 %. Se a espuma secar, borrifar água pura (sem SN concentrada). Anotar entrada/saída no REG-PA-001.', critico: true },
      { icon: 'bancada', texto: 'Berçário (FIT-PA-004): receber emergidas sob luz, sem empilhar. Irrigar com água ou SN diluída (EC ~0,8–1,0 mS/cm). Inspecionar falha, fungo e estiolamento.', critico: false },
      { icon: 'seta', texto: 'Transplantio NFT (FIT-PA-004): quando 3–4 folhas verdadeiras, ~5–8 cm e raízes na espuma, encaixar o cubo de espuma no canal — não remover a espuma. Registrar transplantio no REG-PA-001.', critico: true },
    ],
    fits: [
      makeFitSkeleton({
        codigo: 'FIT-PA-001',
        titulo: 'Higienização — Bancadas, ferramentas e semeadeira',
        objetivo:
          'Limpar o posto e sanitizar bancadas, ferramentas e semeadeira com ácido peracético 1 ml/L no borrifador, antes de qualquer semeio.',
        antesDeComecar: [
          { icon: 'hipoclorito', texto: 'Ter ácido peracético, água limpa, borrifador identificado, panos limpos e escova.' },
          { icon: 'alerta', texto: 'Semeadeira desligada e sem placa dentro.' },
        ],
        passos: [
          { icon: 'hipoclorito', texto: 'Preparar a solução no borrifador: 1 ml de ácido peracético para cada 1 L de água (ex.: 5 ml em 5 L). Não usar concentrado puro.', critico: true },
          { icon: 'bancada', texto: 'Limpar restos de semente/espuma da bancada. Borrifar 1 ml/L e espalhar com pano limpo (sem voltar o pano sujo). Deixar secar.', critico: true },
          { icon: 'cestoAzul', texto: 'Limpar bandejas e ferramentas. Borrifar 1 ml/L, espalhar e deixar secar.', critico: true },
          { icon: 'inspecao', texto: 'Na semeadeira: limpar partes que tocam placa/semente (escovar resíduos). Borrifar 1 ml/L nas superfícies de contato. Sem poça. Deixar secar.', critico: true },
          { icon: 'mop', texto: 'Secar poça no piso do posto, se houver.', critico: false },
          { icon: 'check', texto: 'Conferir tudo limpo e seco. Só então iniciar a FIT-PA-002.', critico: true },
          { icon: 'registro', texto: 'Marcar no REG-PA-002: data, turno, 1 ml/L, itens e visto.', critico: true },
        ],
        pontosCriticos: [
          'Dosagem: 1 ml/L — só no borrifador.',
          'Ordem: limpar sujeira → borrifar → secar → semear.',
          'Início de turno e ao trocar variedade: limpar a semeadeira.',
        ],
        cards: [
          { icon: 'hipoclorito', titulo: '1 ml/L', sub: 'No borrifador' },
          { icon: 'bancada', titulo: 'Limpar', sub: 'Depois borrifar' },
          { icon: 'inspecao', titulo: 'Semeadeira', sub: 'Secar' },
          { icon: 'folhaBoa', titulo: 'Próximo', sub: 'FIT-PA-002' },
        ],
        problemasComuns: [
          { problema: 'Esqueceu de dosar (usou água só ou concentrado)', acao: 'Refazer: 1 ml/L no borrifador; sanitizar de novo.' },
          { problema: 'Ainda tem semente na máquina', acao: 'Desligar; escovar; borrifar 1 ml/L; secar; só depois ligar.' },
          { problema: 'Bancada ainda molhada de solução', acao: 'Esperar secar ou secar com pano limpo antes de apoiar placa.' },
          { problema: 'Pano sujo reusado na área limpa', acao: 'Trocar o pano; borrifar 1 ml/L de novo.' },
        ],
        registrar: 'REG-PA-002: data · turno · 1 ml/L ☐ · bancada ☐ · ferramentas ☐ · semeadeira ☐ · visto',
      }),
      makeFitSkeleton({
        codigo: 'FIT-PA-002',
        titulo: 'Semeadura na máquina — Placa seca e molhar após',
        objetivo:
          'Colocar a placa SECA na semeadeira, semear 1 peletizada por célula e, só depois, molhar a espuma até ficar úmida por igual.',
        antesDeComecar: [
          { icon: 'borrifador', texto: 'Posto e semeadeira higienizados (FIT-PA-001).' },
          { icon: 'folhaBoa', texto: 'Sementes peletizadas da variedade do lote, identificadas.' },
          { icon: 'inspecao', texto: 'Placas de espuma íntegras e SECAS (sem molhar antes).' },
          { icon: 'agua', texto: 'Água limpa e mangueira/regador/spray prontos — só para DEPOIS do semeio.' },
          { icon: 'etiqueta', texto: 'Etiquetas de lote / caneta no posto.' },
        ],
        passos: [
          { icon: 'inspecao', texto: 'Pegar a placa: sem rasgo, sem célula amassada, SECA ao toque. Danificada ou molhada → trocar.', critico: true },
          { icon: 'folhaBoa', texto: 'Abastecer o funil/reservatório com semente peletizada do lote. Conferir variedade na embalagem.', critico: true },
          { icon: 'bancada', texto: 'Encaixar a placa SECA na semeadeira alinhada (células no ponto de queda). Acionar o ciclo e acompanhar até o fim.', critico: true },
          { icon: 'folhaBoa', texto: 'Retirar a placa. Conferir 1 semente/célula: tirar a mais com pinça; completar vazia. Só então molhar.', critico: true },
          { icon: 'etiqueta', texto: 'Etiquetar (variedade, lote, data, operador) — ainda com a placa manuseável.', critico: true },
          { icon: 'agua', texto: 'Molhar por cima até a espuma escurecer e ficar úmida por igual. Escorrer excesso (sem poça). Se usar suporte, encaixar agora segurando pelas bordas.', critico: true },
          { icon: 'timer', texto: 'Levar na hora ao escuro (FIT-PA-003). Não deixar secar na bancada.', critico: true },
          { icon: 'registro', texto: 'REG-PA-001: variedade · lote · placas · operador · molhou após ☐', critico: true },
        ],
        pontosCriticos: [
          'Seca na máquina → conferir 1/célula → molhar → escuro.',
          'Nunca molhar antes da semeadeira.',
          '1 peletizada por célula.',
        ],
        cards: [
          { icon: 'check', titulo: 'Seca', sub: 'Na máquina' },
          { icon: 'folhaBoa', titulo: '1/célula', sub: 'Conferir' },
          { icon: 'agua', titulo: 'Molhar', sub: 'Depois' },
          { icon: 'timer', titulo: 'Escuro', sub: 'Na hora' },
        ],
        problemasComuns: [
          { problema: 'Placa já veio molhada', acao: 'Não colocar na máquina. Trocar por placa seca.' },
          { problema: 'Muitas células vazias', acao: 'Parar; conferir funil/ajuste da máquina; completar à mão; chamar manutenção se repetir.' },
          { problema: '2 sementes na mesma célula', acao: 'Remover a extra com pinça antes de molhar.' },
          { problema: 'Esqueceu de molhar', acao: 'Molhar imediatamente. Não levar ao escuro com espuma seca.' },
          { problema: 'Poça de água na bandeja', acao: 'Escorrer o excesso; a espuma deve ficar úmida, não alagada.' },
        ],
        registrar: 'REG-PA-001: variedade · lote · placas · operador · molhou após ☐',
      }),
      makeFitSkeleton({
        codigo: 'FIT-PA-003',
        titulo: 'Germinação — Câmara escura',
        objetivo:
          'Colocar as bandejas já semeadas e molhadas no escuro, controlar tempo/clima e tirar quando emergir (24–48 h).',
        antesDeComecar: [
          { icon: 'timer', texto: 'Ter como anotar hora de entrada (relógio/cronômetro + REG-PA-001).' },
          { icon: 'termometro', texto: 'Conferir termo-higrômetro da câmara: alvo 22–25 °C e UR 70–80 %.' },
          { icon: 'agua', texto: 'Bandejas já molhadas na FIT-PA-002. Spray de água limpa à mão.' },
        ],
        passos: [
          { icon: 'inspecao', texto: 'Antes de entrar: espuma úmida. Se secou, molhar na bancada e só então levar.', critico: true },
          { icon: 'timer', texto: 'Colocar no escuro (porta/cortina fechada). Anotar data/hora e lote.', critico: true },
          { icon: 'termometro', texto: 'Manter 22–25 °C e UR 70–80 %. Ajustar ou avisar a gerente se ficar fora.', critico: true },
          { icon: 'agua', texto: 'A cada turno: se a superfície clareou, borrifar água pura (sem encharcar). Sem SN concentrada.', critico: true },
          { icon: 'folhaBoa', texto: 'Entre 24 e 48 h (ou ao emergir): tirar e levar ao berçário (FIT-PA-004). Não passar de 48 h sem avaliar.', critico: true },
          { icon: 'registro', texto: 'REG-PA-001: saída · emergência (uniforme/falhas/fungo).', critico: true },
        ],
        pontosCriticos: [
          'Só entra semeada e molhada.',
          '24–48 h · 22–25 °C · UR 70–80 %.',
          'Água pura na germinação.',
        ],
        cards: [
          { icon: 'timer', titulo: '24–48 h', sub: 'Escuro' },
          { icon: 'termometro', titulo: '22–25 °C', sub: 'UR 70–80 %' },
          { icon: 'agua', titulo: 'Água pura', sub: 'Se secar' },
          { icon: 'bancada', titulo: 'Próximo', sub: 'Berçário' },
        ],
        problemasComuns: [
          { problema: 'Espuma seca no meio do período', acao: 'Borrifar água pura; anotar desvio. Se a placa não reabsorver, avaliar descarte.' },
          { problema: 'Emergência desigual aos 48 h', acao: 'Levar as boas ao berçário; dar mais 12–24 h nas atrasadas ou descartar células falhas.' },
          { problema: 'Fungo/alga na superfície', acao: 'Separar a bandeja; chamar a gerente; reforçar higienização e ventilação.' },
          { problema: 'Porta da câmara aberta / luz entrando', acao: 'Fechar; anotar; não contar como ciclo padrão se ficou tempo demais na luz.' },
        ],
        registrar: 'REG-PA-001: entrada · saída · temp/UR · ocorrências',
      }),
      makeFitSkeleton({
        codigo: 'FIT-PA-004',
        titulo: 'Berçário iluminado — Muda para NFT',
        objetivo:
          'Cuidar da muda no berçário até ficar pronta e transplantar com a espuma para o canal NFT.',
        antesDeComecar: [
          { icon: 'bancada', texto: 'Berçário com luz ligada (LED ou natural difuso).' },
          { icon: 'agua', texto: 'Água ou SN diluída pronta (EC ~0,8–1,0 mS/cm — padrão da unidade).' },
          { icon: 'inspecao', texto: 'Saber o critério: 3–4 folhas verdadeiras · 5–8 cm · raízes na espuma.' },
        ],
        passos: [
          { icon: 'folhaBoa', texto: 'Receber do escuro (FIT-PA-003). Colocar sob luz, sem empilhar.', critico: true },
          { icon: 'agua', texto: 'Irrigar com água ou SN diluída (EC ~0,8–1,0) até úmida — sem poça e sem secar.', critico: true },
          { icon: 'inspecao', texto: 'Inspecionar no turno: falha, fungo, amarelo, estiolamento. Segregar célula ruim.', critico: true },
          { icon: 'folhaBoa', texto: 'Pronto quando: 3–4 folhas verdadeiras · ~5–8 cm · raiz na espuma (em geral 14–25 dias).', critico: true },
          { icon: 'seta', texto: 'Segurar o cubo de espuma (não puxar a folha). Encaixar no NFT com a espuma — não remover.', critico: true },
          { icon: 'registro', texto: 'REG-PA-001: transplantio · qtd · operador · destino NFT.', critico: true },
        ],
        pontosCriticos: [
          'Luz suficiente (esticou = falta de luz).',
          'Espuma vai junto no NFT.',
          'Critério: 3–4 folhas · 5–8 cm · raízes.',
        ],
        cards: [
          { icon: 'bancada', titulo: 'Luz', sub: 'Sem empilhar' },
          { icon: 'agua', titulo: 'SN / água', sub: 'Úmida' },
          { icon: 'folhaBoa', titulo: '3–4 folhas', sub: '5–8 cm' },
          { icon: 'seta', titulo: 'NFT', sub: 'Com espuma' },
        ],
        problemasComuns: [
          { problema: 'Muda estiolada (fina e pálida)', acao: 'Aproximar da luz / aumentar iluminação; anotar.' },
          { problema: 'Espuma seca no berçário', acao: 'Irrigar na hora; ajustar rotina de molhar.' },
          { problema: 'Chegou o dia e a muda ainda é pequena', acao: 'Esperar 2–3 dias; checar SN, luz e temperatura.' },
          { problema: 'Tentou tirar a espuma no transplantio', acao: 'Parar: a espuma fica com a muda no NFT.' },
        ],
        registrar: 'REG-PA-001: berçário · transplantio NFT · qtd · operador · lote',
      }),
    ],
    resumoExtra: [
      { item: 'Higienização', valor: 'Ác. peracético 1 ml/L (FIT-PA-001)' },
      { item: 'Semeadura', valor: 'Placa seca · 1/célula · molhar após (FIT-PA-002)' },
      { item: 'Germinação', valor: 'Escuro 24–48 h · 22–25 °C · UR 70–80 %' },
      { item: 'Saída', valor: 'NFT com espuma (critério muda pronta)' },
    ],
  });

  Object.assign(DEFAULT_DATA.plantioAlface, {
    pop: {
      ...DEFAULT_DATA.plantioAlface.pop,
      produtos: 'Alface (variedades conforme calendário)',
      capacidade: 'Conforme demanda de mudas NFT',
      origem: 'Sementes peletizadas',
      equipe: '1 operador por posto / turno',
    },
    definicoes: [
      { termo: 'Espuma biodegradável', definicao: 'Substrato inerte sem pré-tratamento químico; entra SECA na semeadeira e é molhada só depois do semeio (FIT-PA-002).' },
      { termo: 'Máquina semeadeira', definicao: 'Equipamento que recebe a placa seca e deposita 1 semente peletizada por célula.' },
      { termo: 'Ácido peracético 1 ml/L', definicao: 'Solução de higienização: 1 ml de ácido peracético por 1 L de água, aplicada com borrifador (FIT-PA-001).' },
      { termo: 'Semente peletizada', definicao: 'Semente revestida para deposição precisa — 1 unidade por célula.' },
      { termo: 'Câmara de germinação', definicao: 'Ambiente escuro 24–48 h · 22–25 °C · UR 70–80 % (FIT-PA-003).' },
      { termo: 'Muda pronta', definicao: '3–4 folhas verdadeiras, ~5–8 cm, raízes na espuma — critério de transplantio NFT (FIT-PA-004).' },
    ],
    folhas: {
      aprovado: [
        '1 semente/célula e germinação uniforme',
        'Folhas verdadeiras íntegras, coloração verde',
        'Raiz visível na espuma; muda no critério NFT',
        'Sem fungo, mofo ou estiolamento severo',
      ],
      reprovado: [
        'Célula vazia, dobra de semente não corrigida ou falha de germinação',
        'Estiolamento severo (falta de luz no berçário)',
        'Fungo, mofo ou alga na placa',
        'Folhas amareladas ou deformadas',
      ],
    },
    utensilios: [
      { nome: 'EPIs', icon: 'touca' },
      { nome: 'Borrifador + ác. peracético 1 ml/L', icon: 'hipoclorito' },
      { nome: 'Placas espuma biodegradável', icon: 'bancada' },
      { nome: 'Máquina semeadeira', icon: 'inspecao' },
      { nome: 'Bandejas suporte', icon: 'cestoAzul' },
      { nome: 'Sementes peletizadas', icon: 'etiqueta' },
      { nome: 'Regador / spray (após semeio)', icon: 'borrifador' },
      { nome: 'Cronômetro / termo-higrômetro', icon: 'timer' },
      { nome: 'Etiquetas de lote', icon: 'etiqueta' },
    ],
    higienizacao: [
      { icon: 'mao', item: 'Mãos', produto: 'Álcool gel', frequencia: 'Início, retorno, após descarte e troca de atividade' },
      { icon: 'bancada', item: 'Bancadas / bandejas / ferramentas', produto: 'Ácido peracético 1 ml/L (borrifador)', frequencia: 'Início do turno e a cada lote (FIT-PA-001)' },
      { icon: 'inspecao', item: 'Máquina semeadeira', produto: 'Ácido peracético 1 ml/L (borrifador)', frequencia: 'Início do turno / entre variedades (FIT-PA-001)' },
      { icon: 'inspecao', item: 'Câmara e berçário', produto: 'Ácido peracético 1 ml/L (borrifador)', frequencia: 'Fim de turno / quando necessário' },
      { icon: 'mop', item: 'Piso', produto: 'Conforme procedimento', frequencia: 'Fim de turno' },
    ],
    riscos: [
      { icon: 'agua', titulo: 'ORDEM', acao: 'Placa seca na máquina; molhar só depois do semeio (FIT-PA-002).' },
      { icon: 'folhaRuim', titulo: 'CONTAMINAÇÃO', acao: 'Parar; higienizar com 1 ml/L (FIT-PA-001); segregar fungo.' },
      { icon: 'termometro', titulo: 'CLIMA', acao: 'Escuro: 22–25 °C · UR 70–80 % (FIT-PA-003).' },
      { icon: 'seta', titulo: 'NFT', acao: 'Só no critério de muda; espuma vai junto (FIT-PA-004).' },
    ],
    naoConformidades: [
      'Operar sem higienização 1 ml/L (FIT-PA-001): parar e sanitizar; registrar.',
      'Molhar a espuma antes da semeadura: parar; usar placa seca; corrigir (FIT-PA-002).',
      'Células vazias ou 2+ sementes sem correção antes de molhar: corrigir ou ressemear.',
      'Levar ao escuro sem molhar após o semeio: molhar na hora; anotar desvio.',
      'Escuro fora de 24–48 h / clima fora do alvo sem registro: corrigir e anotar (FIT-PA-003).',
      'Transplantar antes do critério (3–4 folhas · 5–8 cm · raízes): aguardar ou descartar mudas fracas.',
      'Remover a espuma no transplantio NFT: não permitido — espuma permanece com a muda.',
      'Sem EPI ou sem higienizar as mãos: interromper e corrigir.',
      'Desvio do procedimento: só com autorização da Gerente Karla Maia.',
    ],
    registros: [
      'REG-PA-001 — Plantio: variedade, lote, semeadura, molhou após ☐, escuro (entrada/saída), berçário, transplantio NFT.',
      'REG-PA-002 — Higienização: 1 ml/L ☐, bancada, ferramentas, semeadeira, visto (FIT-PA-001).',
    ],
    treinamento: [
      'Treinamento obrigatório no POP-PA-001 e FIT-PA-001 a 004 antes de operar sem supervisão.',
      'Praticar na ordem: higienização 1 ml/L → placa seca na máquina → molhar após → escuro → berçário → NFT com espuma.',
      'Registrar na ficha TRE-PA-001.',
    ],
  });

  DEFAULT_DATA.plantioMicroverdes = makeSectorSkeleton({
    codigo: 'POP-PM-001',
    titulo: 'Plantio de Microverdes — Indoor',
    objetivo:
      'Padronizar microverdes em espuma biodegradável indoor, conforme as FIT-PM-001 a 005: higienização com ácido peracético 1 ml/L, semeadura a seco (g/m²), molhar após o semeio, germinação/blackout (máx. 1–2 dias), cultivo LED, colheita e acondicionamento em pote de 30 g com papel toalha, refrigerado para entrega.',
    escopo: [
      'Abrange a sequência das FITs: FIT-PM-001 (higienização 1 ml/L), FIT-PM-002 (pesar g/m² → placa seca → semeadeira → molhar → empilhar), FIT-PM-003 (escuro/blackout máx. 1–2 dias), FIT-PM-004 (LED 14–18 h), FIT-PM-005 (corte → pote com papel toalha → 30 g → fechar → refrigerar → descarte da espuma).',
      'Substrato: espuma plana SECA na semeadeira; molhar somente após o semeio. Sem pré-tratamento químico.',
      'Sementes nuas, sem peletização e sem tratamento químico.',
      'Não abrange: mudas de alface (POP-PA-001) nem expedição logística após a saída do refrigerado da unidade.',
    ],
    referencias: [
      'RDC nº 216/2004 e RDC nº 275/2002 (BPF).',
      'FIT-PM-001 a FIT-PM-005 (instrução operacional deste POP).',
      'Ácido peracético 1 ml/L — higienização (borrifador).',
      'Tabela de densidade g/m² por espécie (unidade).',
      'Manual da máquina semeadeira (unidade).',
      'POP-PA-001 — setor irmão (alface); ambientes separados.',
    ],
    entrada: 'Sementes nuas + placa biodegradável plana seca',
    saida: 'Potes 30 g (papel toalha) fechados → refrigeração / entrega',
    maquina: 'Máquina semeadeira + câmara germinação + estante LED indoor + refrigerado',
    controlesCriticos: [
      { valor: '1 ml/L', label: 'Ác. peracético (higiene)', icon: 'hipoclorito' },
      { valor: 'Seca', label: 'Placa na semeadeira', icon: 'check' },
      { valor: 'g/m²', label: 'Densidade (espécie)', icon: 'balanca' },
      { valor: '1–2 dias', label: 'Blackout máx.', icon: 'timer' },
      { valor: '30 g', label: 'Pote + refrigerar', icon: 'balanca' },
    ],
    fluxo: [
      { titulo: 'Higienizar', sub: '1 ml/L borrifador', icon: 'borrifador' },
      { titulo: 'Semear', sub: 'Seca → molhar após', icon: 'folhaBoa' },
      { titulo: 'Escuro', sub: 'Máx. 1–2 d', icon: 'timer' },
      { titulo: 'LED', sub: '14–18 h', icon: 'bancada' },
      { titulo: 'Colheita', sub: '30 g · refrigerar', icon: 'folhaBoa' },
    ],
    processoDetalhado: [
      { icon: 'borrifador', texto: 'Higienização (FIT-PM-001): preparar ácido peracético 1 ml/L no borrifador. Limpar bancada, balança, bandejas, ferramentas e semeadeira; borrifar; secar; tarar balança. Registrar REG-PM-002. Só então semear.', critico: true },
      { icon: 'folhaBoa', texto: 'Semeadura (FIT-PM-002): pesar semente nua (g/m² da tabela) → placa SECA na máquina → distribuição uniforme → corrigir falhas/montes → molhar (sem poça) → empilhar leve → etiquetar → levar ao escuro. Nunca molhar antes da semeadeira.', critico: true },
      { icon: 'timer', texto: 'Germinação/blackout (FIT-PM-003): pilha no escuro · 21–24 °C · UR 70–80 %. Blackout/pilha no máximo 1–2 dias. Ao germinar ou no limite: desempilhar e ir ao LED. Registrar tempos no REG-PM-001.', critico: true },
      { icon: 'bancada', texto: 'Cultivo LED (FIT-PM-004): fotoperíodo 14–18 h · ~21 °C · UR ~50 %. Irrigar sem poça permanente. Inspecionar mofo e bordas secas. No ponto comercial → colheita.', critico: false },
      { icon: 'folhaBoa', texto: 'Colheita e pote (FIT-PM-005): inspecionar bandeja → cortar acima da espuma → papel toalha no fundo do pote → 30 g por pote → fechar → refrigerar na hora para entrega → descartar espuma usada. Registrar nº de potes no REG-PM-001.', critico: true },
    ],
    fits: [
      makeFitSkeleton({
        codigo: 'FIT-PM-001',
        titulo: 'Higienização — Bancadas, ferramentas e semeadeira',
        objetivo:
          'Limpar o posto e sanitizar bancadas, balança, ferramentas e semeadeira com ácido peracético 1 ml/L no borrifador, antes de semear microverdes.',
        antesDeComecar: [
          { icon: 'hipoclorito', texto: 'Ter ácido peracético, água limpa, borrifador identificado, panos limpos e escova.' },
          { icon: 'alerta', texto: 'Semeadeira desligada, sem placa e sem semente no caminho.' },
        ],
        passos: [
          { icon: 'hipoclorito', texto: 'Preparar no borrifador: 1 ml de ácido peracético para cada 1 L de água. Não usar concentrado puro.', critico: true },
          { icon: 'bancada', texto: 'Limpar bancada e balança. Borrifar 1 ml/L, espalhar com pano limpo e deixar secar. Tarar a balança depois de seca.', critico: true },
          { icon: 'cestoAzul', texto: 'Limpar bandejas e ferramentas (inclui faca/tesoura se for colher no turno). Borrifar 1 ml/L e secar.', critico: true },
          { icon: 'inspecao', texto: 'Limpar a semeadeira (troca de espécie = limpeza completa). Borrifar 1 ml/L nas partes de contato. Secar.', critico: true },
          { icon: 'mop', texto: 'Secar poça no piso, se houver.', critico: false },
          { icon: 'check', texto: 'Conferir limpo e seco. Só então iniciar a FIT-PM-002.', critico: true },
          { icon: 'registro', texto: 'REG-PM-002: data · turno · 1 ml/L · itens · visto.', critico: true },
        ],
        pontosCriticos: [
          'Dosagem: 1 ml/L — só no borrifador.',
          'Ordem: limpar → borrifar → secar → semear.',
          'Troca de espécie: limpar a semeadeira por completo.',
        ],
        cards: [
          { icon: 'hipoclorito', titulo: '1 ml/L', sub: 'No borrifador' },
          { icon: 'bancada', titulo: 'Bancada', sub: '+ balança' },
          { icon: 'inspecao', titulo: 'Semeadeira', sub: 'Secar' },
          { icon: 'folhaBoa', titulo: 'Próximo', sub: 'FIT-PM-002' },
        ],
        problemasComuns: [
          { problema: 'Dosagem errada', acao: 'Refazer: 1 ml/L no borrifador; sanitizar de novo.' },
          { problema: 'Semente anterior na máquina', acao: 'Parar; limpar; borrifar 1 ml/L; secar; só depois abastecer a nova espécie.' },
          { problema: 'Resto de semente na balança', acao: 'Limpar, borrifar 1 ml/L, secar e tarar de novo.' },
          { problema: 'Pano sujo na área limpa', acao: 'Trocar o pano e borrifar 1 ml/L de novo.' },
        ],
        registrar: 'REG-PM-002: data · turno · 1 ml/L ☐ · bancada ☐ · balança ☐ · semeadeira ☐ · visto',
      }),
      makeFitSkeleton({
        codigo: 'FIT-PM-002',
        titulo: 'Semeadura na máquina — Placa seca e molhar após',
        objetivo:
          'Pesar a semente, semear placa SECA na máquina na densidade g/m² e molhar só depois do semeio.',
        antesDeComecar: [
          { icon: 'borrifador', texto: 'Posto e semeadeira higienizados (FIT-PM-001).' },
          { icon: 'balanca', texto: 'Balança limpa e tarada. Tabela g/m² da espécie no posto.' },
          { icon: 'folhaBoa', texto: 'Sementes nuas do lote, sem tratamento químico.' },
          { icon: 'inspecao', texto: 'Placas planas íntegras e SECAS.' },
          { icon: 'agua', texto: 'Água/regador prontos — só para DEPOIS do semeio.' },
        ],
        passos: [
          { icon: 'inspecao', texto: 'Placa plana íntegra e SECA. Danificada ou molhada → trocar.', critico: true },
          { icon: 'balanca', texto: 'Tarar e pesar a semente nua (g/m² × área da placa, tabela do posto). Colocar no funil. Conferir espécie/lote.', critico: true },
          { icon: 'maquina', texto: 'Encaixar a placa SECA, acionar o ciclo e acompanhar. Distribuição uniforme, sem montes nem falhas grandes.', critico: true },
          { icon: 'inspecao', texto: 'Corrigir falhas/aglomerados à mão (luvas limpas). Não enterrar (exceto beterraba/acelga se o posto cobrir fino).', critico: true },
          { icon: 'agua', texto: 'Molhar por cima até úmida por igual (sem poça). Empilhar com peso leve. Etiquetar (espécie, lote, g/m², data, operador).', critico: true },
          { icon: 'timer', texto: 'Levar ao escuro (FIT-PM-003). Não deixar secar na bancada.', critico: true },
          { icon: 'registro', texto: 'REG-PM-001: espécie · g/m² · peso · lote · molhou após ☐', critico: true },
        ],
        pontosCriticos: [
          'Pesar → seca na máquina → molhar → empilhar → escuro.',
          'Nunca molhar antes da semeadeira.',
          'Semente nua · densidade g/m² anotada.',
        ],
        cards: [
          { icon: 'balanca', titulo: 'Pesar', sub: 'g/m²' },
          { icon: 'check', titulo: 'Seca', sub: 'Na máquina' },
          { icon: 'agua', titulo: 'Molhar', sub: 'Depois' },
          { icon: 'timer', titulo: 'Escuro', sub: 'Na hora' },
        ],
        problemasComuns: [
          { problema: 'Placa molhada antes da máquina', acao: 'Trocar por placa seca.' },
          { problema: 'Peso errado na balança', acao: 'Descartar/ajustar o lote; pesar de novo; anotar.' },
          { problema: 'Montes de semente', acao: 'Espalhar antes de molhar; senão nasce aglomerado e mofa.' },
          { problema: 'Esqueceu de molhar', acao: 'Molhar na hora; não seguir com espuma seca.' },
          { problema: 'Poça na bandeja', acao: 'Escorrer o excesso.' },
        ],
        registrar: 'REG-PM-001: espécie · g/m² · peso · lote · operador · molhou após ☐',
      }),
      makeFitSkeleton({
        codigo: 'FIT-PM-003',
        titulo: 'Germinação e blackout',
        objetivo:
          'Manter as bandejas já molhadas e empilhadas no escuro até germinar, sem ultrapassar 1–2 dias de blackout/pilha, e então enviar ao LED.',
        antesDeComecar: [
          { icon: 'timer', texto: 'Saber o tempo típico da espécie e o limite de blackout (máx. 1–2 dias empilhada no escuro).' },
          { icon: 'termometro', texto: 'Alvo: 21–24 °C · UR 70–80 %.' },
          { icon: 'agua', texto: 'Bandejas já molhadas e empilhadas (FIT-PM-002).' },
        ],
        passos: [
          { icon: 'inspecao', texto: 'Conferir umidade. Se secou na bancada, molhar de novo antes do escuro.', critico: true },
          { icon: 'timer', texto: 'Levar a pilha ao escuro, fechar a luz e anotar a hora de entrada.', critico: true },
          { icon: 'termometro', texto: 'Manter 21–24 °C e UR 70–80 %.', critico: true },
          { icon: 'alerta', texto: 'A pilha no escuro (blackout) dura no máximo 1–2 dias. Contar na etiqueta. Não “deixar mais um dia” sem ordem.', critico: true },
          { icon: 'folhaBoa', texto: 'Ao germinar ou no limite de 1–2 dias: desempilhar e levar ao LED (FIT-PM-004). Aclimatar com luz gradual se o posto usar.', critico: true },
          { icon: 'registro', texto: 'REG-PM-001: entrada · horas de blackout · saída · ocorrências.', critico: true },
        ],
        pontosCriticos: [
          'Só entra semeada, molhada e empilhada.',
          'Blackout/pilha: máximo 1–2 dias.',
          '21–24 °C · UR 70–80 % no escuro.',
          'Depois: LED (clima diferente).',
        ],
        cards: [
          { icon: 'timer', titulo: 'Escuro', sub: 'Anotar hora' },
          { icon: 'alerta', titulo: 'Máx. 1–2 d', sub: 'Blackout' },
          { icon: 'termometro', titulo: '21–24 °C', sub: 'UR 70–80 %' },
          { icon: 'bancada', titulo: 'Próximo', sub: 'LED' },
        ],
        problemasComuns: [
          { problema: 'Blackout passou de 2 dias', acao: 'Expor à luz na hora; separar lote fraco; corrigir a rotina.' },
          { problema: 'Mofo na base', acao: 'Segregar bandeja; baixar UR; ventilar; reforçar higienização.' },
          { problema: 'Não germinou no tempo da espécie', acao: 'Conferir umidade, temperatura e qualidade da semente; avisar a gerente.' },
        ],
        registrar: 'REG-PM-001: entrada escuro · blackout (h) · saída · ocorrências',
      }),
      makeFitSkeleton({
        codigo: 'FIT-PM-004',
        titulo: 'Cultivo indoor — Estante LED',
        objetivo:
          'Colocar as bandejas germinadas na estante LED, acertar luz/clima/irrigação e conduzir até o ponto de colheita.',
        antesDeComecar: [
          { icon: 'bancada', texto: 'Estante LED ligada; timer/fotoperíodo 14–18 h/dia.' },
          { icon: 'termometro', texto: 'Alvo no cultivo: ~21 °C · UR ~50 %.' },
          { icon: 'agua', texto: 'Saber como o posto irriga (subirrigação ou spray) e se usa SN diluída.' },
        ],
        passos: [
          { icon: 'folhaBoa', texto: 'Receber do escuro (FIT-PM-003). Desempilhar. Colocar no LED com espaço para luz e ar.', critico: true },
          { icon: 'bancada', texto: 'Timer 14–18 h/dia. Ajustar altura se esticar ou queimar.', critico: true },
          { icon: 'termometro', texto: 'Cultivo: ~21 °C · UR ~50 % (mais seco que a germinação).', critico: true },
          { icon: 'agua', texto: 'Irrigar no horário do posto até úmida (subirrigação: tempo padrão e esvaziar excesso). Sem poça permanente.', critico: true },
          { icon: 'inspecao', texto: 'Olhar mofo, bordas secas e cor. Segregar suspeita. No ponto → FIT-PM-005.', critico: true },
          { icon: 'registro', texto: 'REG-PM-001: entrada LED · ocorrências.', critico: false },
        ],
        pontosCriticos: [
          'Fotoperíodo 14–18 h.',
          'UR ~50 % no cultivo.',
          'Irrigar sem secar bordas e sem encharcar.',
        ],
        cards: [
          { icon: 'bancada', titulo: 'LED', sub: '14–18 h' },
          { icon: 'termometro', titulo: '~21 °C', sub: 'UR ~50 %' },
          { icon: 'agua', titulo: 'Irrigar', sub: 'Sem poça' },
          { icon: 'folhaBoa', titulo: 'Próximo', sub: 'Colheita' },
        ],
        problemasComuns: [
          { problema: 'Bordas secas', acao: 'Aumentar irrigação ou tempo de subirrigação; checar vento direto no LED.' },
          { problema: 'Muda esticada', acao: 'Aproximar do LED ou aumentar horas/intensidade.' },
          { problema: 'Amarelamento', acao: 'Conferir SN, luz e UR; ajustar e anotar.' },
          { problema: 'Mofo na estante', acao: 'Segregar; limpar prateleira; reduzir UR; não molhar em excesso.' },
        ],
        registrar: 'REG-PM-001: entrada LED · irrigação · operador · lote',
      }),
      makeFitSkeleton({
        codigo: 'FIT-PM-005',
        titulo: 'Colheita, pote 30 g e refrigeração',
        objetivo:
          'Colher no ponto, acondicionar 30 g por pote com papel toalha no fundo, fechar, refrigerar para entrega e descartar a espuma usada.',
        antesDeComecar: [
          { icon: 'folhaBoa', texto: 'Bandeja no ponto: cotilédones abertos, cor boa, sem mofo.' },
          { icon: 'tesoura', texto: 'Faca ou tesoura sanitizada com ác. peracético 1 ml/L (FIT-PM-001).' },
          { icon: 'balanca', texto: 'Balança limpa e tarada.' },
          { icon: 'etiqueta', texto: 'Potes de embalagem limpos, papel toalha e tampa/fechamento disponíveis.' },
          { icon: 'reciclagem', texto: 'Saber onde vai a espuma usada (compostagem/resíduo).' },
        ],
        passos: [
          { icon: 'inspecao', texto: 'Olhar a bandeja. Mofo, odor ruim ou produto estragado → não colher para venda; descartar e anotar.', critico: true },
          { icon: 'folhaBoa', texto: 'Cortar acima da espuma com faca/tesoura limpa (1 ml/L). Não arrancar com raiz/espuma no produto.', critico: true },
          { icon: 'etiqueta', texto: 'Preparar o pote: colocar papel toalha limpo no fundo (absorve umidade). Pote higienizado/limpo.', critico: true },
          { icon: 'balanca', texto: 'Pesar e colocar 30 g de microverde por pote (tara do pote+papel, se necessário). Não comprimir demais o produto.', critico: true },
          { icon: 'check', texto: 'Fechar o pote corretamente (tampa firme, sem folga).', critico: true },
          { icon: 'termometro', texto: 'Levar na hora ao refrigerado de armazenamento para entrega. Não deixar potes fechados em temperatura ambiente.', critico: true },
          { icon: 'reciclagem', texto: 'Levar a espuma usada ao descarte/compostagem. Não deixar na estante.', critico: true },
          { icon: 'borrifador', texto: 'Limpar a bancada de colheita. Se continuar, borrifar 1 ml/L na ferramenta e secar.', critico: false },
          { icon: 'registro', texto: 'REG-PM-001: espécie · nº potes · 30 g ☐ · refrigerado ☐ · descarte · operador · lote.', critico: true },
        ],
        pontosCriticos: [
          'Só colhe bandeja aprovada.',
          'Papel toalha no fundo do pote (absorção de umidade).',
          '30 g por pote — fechar e refrigerar na hora.',
          'Corte acima da espuma · ferramenta com 1 ml/L · descartar espuma.',
        ],
        cards: [
          { icon: 'folhaBoa', titulo: 'Cortar', sub: 'Acima da espuma' },
          { icon: 'etiqueta', titulo: 'Pote', sub: 'Papel toalha' },
          { icon: 'balanca', titulo: '30 g', sub: 'Por pote' },
          { icon: 'termometro', titulo: 'Frio', sub: 'Entrega' },
        ],
        problemasComuns: [
          { problema: 'Pote sem papel toalha', acao: 'Abrir (se ainda na bancada), colocar o papel e fechar de novo antes de refrigerar.' },
          { problema: 'Peso diferente de 30 g', acao: 'Ajustar na balança; não enviar fora do padrão sem autorização.' },
          { problema: 'Pote ficou fora da geladeira', acao: 'Levar ao refrigerado na hora; anotar desvio; avaliar se ainda está apto.' },
          { problema: 'Mofo na colheita', acao: 'Descartar o lote; não embalar; investigar UR e higiene.' },
          { problema: 'Ferramenta suja', acao: 'Parar; limpar; borrifar 1 ml/L; secar; só então continuar.' },
        ],
        registrar: 'REG-PM-001: potes · 30 g · refrigerado · descarte · operador · lote',
      }),
    ],
    resumoExtra: [
      { item: 'Higienização', valor: 'Ác. peracético 1 ml/L (FIT-PM-001)' },
      { item: 'Semeadura', valor: 'g/m² · placa seca · molhar após (FIT-PM-002)' },
      { item: 'Escuro / LED', valor: 'Blackout máx. 1–2 d · LED 14–18 h' },
      { item: 'Colheita', valor: '30 g/pote · papel toalha · refrigerado' },
    ],
  });

  Object.assign(DEFAULT_DATA.plantioMicroverdes, {
    pop: {
      ...DEFAULT_DATA.plantioMicroverdes.pop,
      produtos: 'Microverdes (espécies conforme calendário)',
      capacidade: 'Conforme demanda comercial',
      origem: 'Sementes nuas certificadas',
      equipe: '1 operador por posto / turno',
    },
    definicoes: [
      { termo: 'Espuma biodegradável', definicao: 'Substrato plano sem pré-tratamento; entra SECA na semeadeira e é molhada só depois do semeio (FIT-PM-002).' },
      { termo: 'Ácido peracético 1 ml/L', definicao: 'Solução de higienização: 1 ml por 1 L de água no borrifador (FIT-PM-001).' },
      { termo: 'Densidade (g/m²)', definicao: 'Gramas de semente nua por m² de placa — tabela do posto (FIT-PM-002).' },
      { termo: 'Blackout', definicao: 'Pilha no escuro após o semeio — máximo 1–2 dias antes do LED (FIT-PM-003).' },
      { termo: 'Cultivo LED', definicao: 'Estante iluminada 14–18 h/dia · ~21 °C · UR ~50 % (FIT-PM-004).' },
      { termo: 'Pote 30 g', definicao: 'Pote com papel toalha no fundo, 30 g de produto, fechado e refrigerado para entrega (FIT-PM-005).' },
    ],
    folhas: {
      aprovado: [
        'Cotilédones abertos e uniformes',
        'Cor típica da espécie',
        'Sem mofo ou odor',
        'Sem estiolamento excessivo',
      ],
      reprovado: [
        'Mofo ou filamento na base',
        'Estiolamento excessivo (cai ao toque)',
        'Aglomerado irregular',
        'Amarelamento ou murcha',
      ],
    },
    utensilios: [
      { nome: 'EPIs', icon: 'touca' },
      { nome: 'Borrifador + ác. peracético 1 ml/L', icon: 'hipoclorito' },
      { nome: 'Placas espuma biodegradável (planas)', icon: 'bancada' },
      { nome: 'Máquina semeadeira', icon: 'inspecao' },
      { nome: 'Bandejas planas', icon: 'cestoAzul' },
      { nome: 'Balança', icon: 'balanca' },
      { nome: 'Sementes nuas', icon: 'folhaBoa' },
      { nome: 'Estante LED indoor', icon: 'bancada' },
      { nome: 'Tesoura / faca de colheita', icon: 'tesoura' },
      { nome: 'Potes + papel toalha + tampa', icon: 'etiqueta' },
      { nome: 'Etiquetas de lote', icon: 'etiqueta' },
    ],
    higienizacao: [
      { icon: 'mao', item: 'Mãos', produto: 'Álcool gel', frequencia: 'Início, retorno, após descarte e troca de atividade' },
      { icon: 'bancada', item: 'Bancada / balança / bandejas', produto: 'Ácido peracético 1 ml/L (borrifador)', frequencia: 'Início do turno e a cada lote (FIT-PM-001)' },
      { icon: 'inspecao', item: 'Máquina semeadeira', produto: 'Ácido peracético 1 ml/L (borrifador)', frequencia: 'Início do turno / entre espécies (FIT-PM-001)' },
      { icon: 'tesoura', item: 'Faca/tesoura de colheita', produto: 'Ácido peracético 1 ml/L (borrifador)', frequencia: 'Entre lotes e fim de turno (FIT-PM-005)' },
      { icon: 'bancada', item: 'Estante LED / bancada de colheita', produto: 'Ácido peracético 1 ml/L (borrifador)', frequencia: 'Fim de turno' },
      { icon: 'mop', item: 'Piso', produto: 'Conforme procedimento', frequencia: 'Fim de turno' },
    ],
    riscos: [
      { icon: 'agua', titulo: 'ORDEM', acao: 'Placa seca na máquina; molhar só depois (FIT-PM-002).' },
      { icon: 'folhaRuim', titulo: 'MOFO', acao: 'Segregar; 1 ml/L (FIT-PM-001); não colher/embalar.' },
      { icon: 'alerta', titulo: 'BLACKOUT', acao: 'Pilha no escuro: máximo 1–2 dias (FIT-PM-003).' },
      { icon: 'corte', titulo: 'COLHEITA', acao: 'Papel toalha · 30 g/pote · fechar · refrigerar na hora (FIT-PM-005).' },
    ],
    naoConformidades: [
      'Operar sem higienização 1 ml/L (FIT-PM-001): parar e sanitizar; registrar.',
      'Molhar antes da semeadura: parar; placa seca; corrigir (FIT-PM-002).',
      'Semente peletizada/tratada: não utilizar — só nua.',
      'g/m² fora do padrão sem registro: corrigir e anotar.',
      'Blackout/pilha > 2 dias: segregar ou descartar; corrigir (FIT-PM-003).',
      'Colheita com mofo: descartar; não embalar.',
      'Pote sem papel toalha, peso ≠ 30 g ou sem refrigerar: corrigir antes da entrega; anotar (FIT-PM-005).',
      'Sem EPI ou sem higienizar mãos: interromper e corrigir.',
      'Desvio: só com autorização da Gerente Karla Maia.',
    ],
    registros: [
      'REG-PM-001 — Microverdes: espécie, g/m², semeadura, molhou após ☐, blackout (h), LED, nº potes 30 g, refrigerado ☐, descarte.',
      'REG-PM-002 — Higienização: 1 ml/L ☐, bancada, balança, semeadeira, visto (FIT-PM-001).',
    ],
    treinamento: [
      'Treinamento obrigatório no POP-PM-001 e FIT-PM-001 a 005 antes de operar sem supervisão.',
      'Praticar na ordem: higienização 1 ml/L → semeadura seca/molhar após → blackout → LED → colheita 30 g com papel toalha e refrigeração.',
      'Registrar na ficha TRE-PM-001.',
    ],
  });

  applyFoodSafetyToSector(DEFAULT_DATA.plantioAlface);
  applyFoodSafetyToSector(DEFAULT_DATA.plantioMicroverdes);
  refreshSectorTrainingTopics(DEFAULT_DATA.plantioAlface);
  refreshSectorTrainingTopics(DEFAULT_DATA.plantioMicroverdes);
})();
