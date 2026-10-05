/** Dados completos — Pré-Lavagem Fazendas UP */
const DEFAULT_DATA = {
  empresa: { nome: 'Fazendas UP', logo: null },
  meta: {
    versao: '01',
    data: '23/08/2026',
    responsavel: 'Karla Maia',
    aprovador: 'Karla Maia',
    gerente: 'Karla Maia',
  },
  /** Arte ilustrada das placas BPF (SVG original em assets/placas/art/) — upload do usuário sobrescreve */
  placasBpf: {
    fotos: {
      maos: {
        hero: 'assets/placas/art/maos-hero.svg',
        passos: [
          'assets/placas/art/maos-passo-0.svg',
          'assets/placas/art/maos-passo-1.svg',
          'assets/placas/art/maos-passo-2.svg',
          'assets/placas/art/maos-passo-3.svg',
          'assets/placas/art/maos-passo-4.svg',
          'assets/placas/art/maos-passo-5.svg',
        ],
      },
      adornos: { hero: 'assets/placas/art/adornos-hero.svg' },
      celular: { hero: 'assets/placas/art/celular-hero.svg' },
      saude: { hero: 'assets/placas/art/saude-hero.svg' },
      higiene: {
        hero: 'assets/placas/art/higiene-hero.svg',
        passos: [
          'assets/placas/art/higiene-passo-0.svg',
          'assets/placas/art/higiene-passo-1.svg',
          'assets/placas/art/higiene-passo-2.svg',
          'assets/placas/art/higiene-passo-3.svg',
          'assets/placas/art/higiene-passo-4.svg',
          'assets/placas/art/higiene-passo-5.svg',
        ],
      },
      regras: { hero: 'assets/placas/art/regras-hero.svg' },
    },
  },
  preLavagem: {
    pop: {
      codigo: 'POP-PL-001',
      titulo: 'Pré-Lavagem de Hortaliças',
      objetivo:
        'Padronizar o recebimento, preparação, desfolhagem, seleção e sanitização inicial das hortaliças (alface, manjericão e rúcula) provenientes de fornecedor externo, garantindo qualidade, higiene e rastreabilidade antes do envio ao setor de Lavagem.',
      escopo: [
        'Produtos: alface, manjericão e rúcula — mesmo procedimento para todos.',
        'Capacidade operacional: até 100 kg por demanda diária, conforme solicitação de vendas.',
        'Volume variável conforme variedades solicitadas para o dia seguinte.',
        'Não abrange: lavagem final, enxágue, centrifugação, embalagem e expedição.',
      ],
      referencias: [
        'RDC nº 216/2004 e RDC nº 275/2002 (BPF — referência normativa).',
        'Manual do equipamento MLM 152.',
        'FIT-PL-001, FIT-PL-002 e FIT-PL-003.',
        'REG-PL-001, REG-PL-002 e TRE-PL-001.',
      ],
      produtos: 'Alface · Rúcula · Manjericão',
      capacidade: 'Até 100 kg/dia (variável conforme vendas)',
      origem: 'Fornecedor externo',
      equipe: '1 operador por turno',
      maquina: 'MLM 152 — até 300 kg/h',
      entradaRecipiente: 'Caçapa preta (hortaliças embaladas em saco)',
      saidaRecipiente: 'Cesto azul (máx. 2 ciclos) → Lavagem',
      fotos: { fluxo: null, geral: null, bancada: null, maquina: null },
    },

    definicoes: [
      { termo: 'Caçapa preta', definicao: 'Recipiente de entrada para hortaliças recebidas do fornecedor.' },
      { termo: 'Cesto azul', definicao: 'Recipiente de saída com produto pré-lavado (máx. 2 ciclos de 5 maços). Ao completar o 2º ciclo, envia-se ao setor de Lavagem.' },
      { termo: 'Maço', definicao: 'Unidade de processamento = 1 produto na máquina (máx. 5 maços por ciclo de 2 min).' },
      { termo: 'Pré-lavagem', definicao: 'Na MLM 152: desfolhagem na água (até 5 maços/ciclo em 2 min), seleção, descarte de talo/folhas ruins e sanitização; cesto azul troca a cada 2 ciclos.' },
      { termo: 'Produto reprovado', definicao: 'Folhas amareladas, manchadas, murchas ou muito quebradas/rasgadas; talos descartáveis.' },
      { termo: 'Turno', definicao: 'Período de trabalho em que o operador executa as atividades da sala.' },
    ],

    responsabilidades: [
      { funcao: 'Operador de Pré-Lavagem', descricao: 'Executar POP e FITs; registrar horários e descartes; manter higiene pessoal e do ambiente.' },
      { funcao: 'Gerente (Karla Maia)', descricao: 'Aprovar desvios, paradas de processo e revisões; validar treinamentos.' },
      { funcao: 'Qualidade (quando designado)', descricao: 'Monitorar registros e indicadores de descarte.' },
    ],

    utensilios: [
      { nome: 'Tesoura', icon: 'tesoura' },
      { nome: 'Faca de corte', icon: 'faca' },
      { nome: 'Copos dosadores', icon: 'copoDosador' },
      { nome: 'Caçapas pretas', icon: 'cacapaPreta' },
      { nome: 'Cestos azuis', icon: 'cestoAzul' },
      { nome: 'Lixeira orgânica', icon: 'organico' },
      { nome: 'Lixeira reciclável', icon: 'reciclagem' },
      { nome: 'Timer / relógio', icon: 'timer' },
      { nome: 'MOP + balde', icon: 'mop' },
      { nome: 'Suportes p/ EPI e facas', icon: 'suporte' },
      { nome: 'Borrifador álcool gel', icon: 'borrifador' },
    ],

    controlesCriticos: [
      { valor: '5°C', label: 'Temperatura da água', icon: 'termometro' },
      { valor: '70 mg/L', label: 'Ácido peracético', icon: 'hipoclorito' },
      { valor: '2 min', label: 'Tempo de contato', icon: 'timer' },
      { valor: '5 maços', label: 'Máximo por ciclo', icon: 'maços' },
      { valor: '2 ciclos', label: 'Máx. por cesto azul', icon: 'cestoAzul' },
    ],

    fluxo: [
      { titulo: 'Entrada', sub: 'Caçapa preta + saco', icon: 'cacapaPreta' },
      { titulo: 'Bancada', sub: 'Desembalagem + corte raízes', icon: 'bancada' },
      { titulo: 'MLM 152', sub: '5 maços na água · 2 min · desfolha', icon: 'maquina' },
      { titulo: 'Saída', sub: 'Cesto azul · 2 ciclos', icon: 'cestoAzul' },
      { titulo: 'Lavagem', sub: 'Troca a cada 2 ciclos', icon: 'lavagem' },
    ],

    processoDetalhado: [
      { icon: 'cacapaPreta', texto: 'Receber hortaliças do fornecedor em caçapas pretas, embaladas em sacos.' },
      { icon: 'saco', texto: 'Na bancada, retirar sacos e descartar na lixeira de RECICLÁVEL.' },
      { icon: 'tesoura', texto: 'Cortar para separar a raiz com tesoura ou faca; descartar raízes no lixo orgânico.' },
      { icon: 'inspecao', texto: 'Conferir integridade do maço antes de enviar à máquina.' },
      { icon: 'maquina', texto: 'Ligar MLM 152: tomada → válvula do chuveiro 45° → deságue fechado → botão verde LIGA.' },
      { icon: 'maços', texto: 'Colocar no máximo 5 maços na água; desfolhar na água (cima→baixo na base); folhas soltas ficam na água.' },
      { icon: 'timer', texto: 'Ciclo de 2 minutos; só ao final dos 5 maços retirar folhas para caçapa limpa.' },
      { icon: 'organico', texto: 'Folhas ruins e talos no recipiente de descarte para pesagem (sem raízes).' },
      { icon: 'cestoAzul', texto: 'Transferir produto aprovado para o cesto azul (máx. 2 ciclos de 5 maços por cesto).' },
      { icon: 'lavagem', texto: 'A cada 2 ciclos: trocar o cesto azul, identificar e enviar imediatamente ao setor de Lavagem.' },
      { icon: 'registro', texto: 'Registrar hora, operador e descarte (folhas ruins + talo, sem raízes) no REG-PL-001.' },
    ],

    folhas: {
      aprovado: ['Cor e textura de produto fresco', 'Sem manchas', 'Sem murchamento excessivo', 'Folha íntegra'],
      reprovado: ['Amarelada', 'Manchada', 'Murcha', 'Muito quebrada ou rasgada'],
    },

    higienizacao: [
      { item: 'Mãos', produto: 'Álcool em gel + luvas', icon: 'mao', frequencia: 'Antes do trabalho e após descartes' },
      { item: 'Bancadas', produto: 'Álcool em gel (borrifador)', icon: 'borrifador', frequencia: 'A cada turno e quando necessário' },
      { item: 'Facas/Tesouras', produto: 'Ácido peracético 70 mg/L', icon: 'tesoura', frequencia: 'Final de cada turno' },
      { item: 'Máquina MLM 152', produto: 'Ácido peracético 70 mg/L', icon: 'maquina', frequencia: 'Final de cada turno' },
      { item: 'Piso', produto: 'MOP + balde', icon: 'mop', frequencia: 'Quando necessário; manter seco' },
    ],

    riscos: [
      { titulo: 'CORTE', acao: 'Luvas; lâminas afiadas; cortar afastando o corpo; faca no suporte após uso.', icon: 'corte' },
      { titulo: 'QUÍMICO', acao: 'EPIs; dosar com copo medidor; não misturar produtos; enxaguar se contato com pele/olhos.', icon: 'quimico' },
      { titulo: 'PISO MOLHADO', acao: 'Botas antiderrapantes; limpar vazamentos; sinalizar área; não correr.', icon: 'pisoMolhado' },
    ],

    registros: [
      'REG-PL-001 — Hora, operador, produto, descarte folhas + talo (kg).',
      'REG-PL-002 — Higienização por turno (bancada, facas, máquina, piso).',
      'TRE-PL-001 — Treinamento obrigatório do operador.',
    ],

    naoConformidades: [
      'Produto reprovado após processo: segregar e descartar.',
      'Falha no tempo de contato (menos de 2 min) ou excesso de maços: interromper e corrigir.',
      'Mais de 2 ciclos no mesmo cesto azul: trocar o cesto e enviar à Lavagem imediatamente.',
      'Produto no chão após lavagem: lavar novamente antes de aprovar.',
      'Parada ou desvio do POP: somente com autorização da Gerente Karla Maia.',
      'Registrar ocorrências no REG-PL-001 (campo observações).',
    ],

    treinamento: [
      'Treinamento mínimo obrigatório antes de operar sem supervisão.',
      'Conteúdo: POP-PL-001, FIT-PL-001 a 003, EPIs, ácido peracético 70 mg/L, seleção e registros.',
      'Registrar treinamento na ficha TRE-PL-001 e controle de RH.',
    ],

    resumo: [
      { item: 'Equipamento', valor: 'Máquina MLM 152 (até 300 kg/h)' },
      { item: 'Entrada', valor: 'Caçapa preta — saco plástico → reciclável' },
      { item: 'Saída', valor: 'Cesto azul → setor Lavagem' },
      { item: 'Responsável desvio', valor: 'Karla Maia (Gerente)' },
      { item: 'Registros', valor: 'REG-PL-001 · REG-PL-002 · TRE-PL-001' },
      { item: 'FITs vinculadas', valor: 'FIT-PL-001 · 002 · 003' },
      { item: 'Descarte registrado', valor: 'Folhas ruins + talo (NÃO incluir raízes)' },
      { item: 'Produto reprovado', valor: 'Descarte — não vai para Lavagem' },
    ],

    fits: [
      {
        codigo: 'FIT-PL-001',
        titulo: 'Desembalagem, Corte de Raízes e Descarte',
        objetivo:
          'Preparar os maços recebidos do fornecedor, removendo embalagens e raízes antes da pré-lavagem na máquina MLM 152.',
        foto: null,
        antesDeComecar: [
          { icon: 'touca', texto: 'Conferir EPIs: touca, luvas, avental e botas.' },
          { icon: 'mao', texto: 'Higienizar as mãos com álcool em gel.' },
          { icon: 'cacapaPreta', texto: 'Separar caçapa preta de entrada na bancada.' },
          { icon: 'tesoura', texto: 'Tesoura/faca limpas e lixeira orgânica identificada.' },
          { icon: 'reciclagem', texto: 'Lixeira de recicláveis identificada para sacos.' },
        ],
        passos: [
          { icon: 'cacapaPreta', texto: 'Posicionar caçapa preta na bancada de trabalho.', critico: false },
          { icon: 'saco', texto: 'Retirar cada maço do saco plástico sem danificar as folhas.', critico: false },
          { icon: 'reciclagem', texto: 'Descartar saco na lixeira de RECICLÁVEL.', critico: true },
          { icon: 'inspecao', texto: 'Inspecionar maço; segregar folhas claramente reprovadas.', critico: false },
          { icon: 'tesoura', texto: 'Cortar para separar a raiz com tesoura ou faca, afastando as mãos do corpo.', critico: false },
          { icon: 'organico', texto: 'Descartar raízes no lixo orgânico (NÃO contabilizar no peso de descarte).', critico: true },
          { icon: 'cacapaPreta', texto: 'Colocar maços com raiz separada em caçapa limpa para a máquina.', critico: false },
          { icon: 'borrifador', texto: 'Manter bancada organizada; limpar resíduos com álcool gel.', critico: false },
        ],
        pontosCriticos: [
          'Sacos sempre na lixeira RECICLÁVEL — nunca misturar com produto aprovado.',
          'Raízes no lixo orgânico — não incluir no registro de descarte.',
          'Faca/tesoura no suporte após uso — risco de corte.',
        ],
        cards: [
          { icon: 'reciclagem', titulo: 'Saco', sub: 'Reciclável' },
          { icon: 'tesoura', titulo: 'Corte', sub: 'Tesoura/faca' },
          { icon: 'organico', titulo: 'Raízes', sub: 'Lixo orgânico' },
          { icon: 'inspecao', titulo: 'Inspeção', sub: 'Antes da máquina' },
        ],
        problemasComuns: [
          { problema: 'Saco rasgado com folhas danificadas', acao: 'Segregar folhas danificadas; avaliar se maço segue.' },
          { problema: 'Faca/tesoura cega', acao: 'Trocar ou afiar — lâmina cega aumenta risco de acidente.' },
          { problema: 'Produto muito sujo na entrada', acao: 'Informar supervisor; cuidado extra na seleção.' },
        ],
        registrar: 'REG-PL-001: hora início/fim · operador · descarte folhas+talo (kg)',
      },
      {
        codigo: 'FIT-PL-002',
        titulo: 'Operação da Máquina MLM 152 e Sanitização',
        objetivo:
          'Ligar e regular a MLM 152, processar no máximo 5 maços por ciclo (2 min) com desfolhagem na água e sanitização; a cada 2 ciclos, trocar o cesto azul e enviar à Lavagem.',
        foto: null,
        antesDeComecar: [
          { icon: 'touca', texto: 'EPIs: touca, luvas, avental e botas.' },
          { icon: 'mao', texto: 'Higienizar as mãos com álcool em gel.' },
          { icon: 'maquina', texto: 'Máquina conectada na tomada ao lado do equipamento.' },
          { icon: 'termometro', texto: 'Água da máquina a 5°C.' },
          { icon: 'hipoclorito', texto: 'Ácido peracético dosado: 70 mg/L de água (copo dosador).' },
          { icon: 'timer', texto: 'Timer/relógio disponível e funcionando.' },
          { icon: 'maços', texto: 'Até 5 maços já com a raiz separada (corte na bancada).' },
          { icon: 'cacapaPreta', texto: 'Caçapa limpa pronta para receber as folhas aprovadas ao final do ciclo.' },
          { icon: 'organico', texto: 'Recipiente de descarte (folhas ruins + talo) pronto para pesagem.' },
          { icon: 'cestoAzul', texto: 'Cesto azul limpo na saída — no máximo 2 ciclos por cesto.' },
        ],
        passos: [
          { icon: 'maquina', texto: 'Conectar a máquina na tomada ao lado do equipamento (se ainda não estiver).', critico: true },
          { icon: 'agua', texto: 'Abrir a válvula do chuveiro em 45°.', critico: true },
          { icon: 'agua', texto: 'Verificar se a válvula de deságue está FECHADA; fechar se estiver aberta.', critico: true },
          { icon: 'maquina', texto: 'No painel, pressionar o botão verde LIGA. Para parar, usar o botão vermelho DESLIGA.', critico: true },
          { icon: 'termometro', texto: 'Confirmar temperatura da água: 5°C.', critico: true },
          { icon: 'hipoclorito', texto: 'Confirmar ácido peracético: 70 mg/L de água na máquina.', critico: true },
          { icon: 'timer', texto: 'Iniciar o cronômetro — o ciclo completo (5 maços) deve durar 2 minutos.', critico: true },
          { icon: 'maços', texto: 'Colocar no máximo 5 maços DENTRO DA ÁGUA da máquina.', critico: true },
          { icon: 'folhaBoa', texto: 'Desfolhar na água: remover a folha na base da seção com o caule, de cima para baixo, para danificar o mínimo possível o tecido.', critico: true },
          { icon: 'agua', texto: 'À medida que as folhas se soltam, colocá-las DENTRO DA ÁGUA — não retirar ainda para a caçapa.', critico: true },
          { icon: 'organico', texto: 'Folhas ruins e talos: descartar no recipiente de descarte (para pesagem). Não misturar com aprovado.', critico: true },
          { icon: 'timer', texto: 'Só após finalizar os 5 maços: retirar as folhas da água para a caçapa limpa (fim do ciclo de 2 min).', critico: true },
          { icon: 'cestoAzul', texto: 'Transferir o produto aprovado da caçapa limpa para o cesto azul de saída.', critico: false },
          { icon: 'cestoAzul', texto: 'Contar os ciclos no cesto azul: no máximo 2 ciclos (5 maços × 2 min cada). Ao completar o 2º ciclo, trocar o cesto e enviar à Lavagem; colocar cesto azul limpo vazio.', critico: true },
          { icon: 'agua', texto: 'Produto que cair no chão após a lavagem: lavar novamente antes de aprovar.', critico: true },
          { icon: 'maquina', texto: 'Repetir o ciclo para os próximos maços (sempre respeitando 2 ciclos/cesto). Ao encerrar o turno: botão vermelho DESLIGA.', critico: false },
        ],
        pontosCriticos: [
          'Tomada conectada → válvula do chuveiro a 45° → deságue FECHADO → botão verde LIGA.',
          'Máximo 5 maços por ciclo, todos dentro da água · ciclo = 2 minutos.',
          'Folhas soltas ficam na água até o fim dos 5 maços; só então vão para a caçapa limpa.',
          'Desfolhar na base (folha + caule), movimento de cima para baixo.',
          'Cesto azul: no máximo 2 ciclos (≈10 maços). A cada 2 ciclos → trocar cesto e enviar à Lavagem.',
          'Água 5°C · ácido peracético 70 mg/L.',
          'Folhas ruins + talo → recipiente de pesagem (não incluir raízes).',
        ],
        cards: [
          { icon: 'maços', titulo: '5 maços', sub: 'Por ciclo · 2 min' },
          { icon: 'cestoAzul', titulo: '2 ciclos', sub: 'Por cesto azul' },
          { icon: 'lavagem', titulo: 'Trocar', sub: 'Enviar à Lavagem' },
          { icon: 'folhaBoa', titulo: 'Desfolha', sub: 'Cima → baixo' },
        ],
        problemasComuns: [
          { problema: 'Máquina não liga', acao: 'Conferir tomada ao lado; válvula do chuveiro a 45°; deságue fechado; botão verde LIGA.' },
          { problema: 'Mais de 5 maços no ciclo', acao: 'Remover excedente; novo ciclo com no máximo 5 maços e 2 min.' },
          { problema: 'Mais de 2 ciclos no mesmo cesto azul', acao: 'Parar; trocar o cesto imediatamente e enviar o cheio ao setor de Lavagem.' },
          { problema: 'Folhas tiradas da água antes do fim', acao: 'Manter na água até concluir os 5 maços; só então passar para a caçapa limpa.' },
          { problema: 'Folha danificada na desfolha', acao: 'Remover na base com o caule, de cima para baixo — não puxar com força lateral.' },
          { problema: 'Tempo menor que 2 min', acao: 'Não liberar; completar os 2 minutos de ciclo.' },
          { problema: 'Água acima de 5°C', acao: 'Ajustar resfriamento; só iniciar o ciclo na temperatura correta.' },
        ],
        registrar: 'REG-PL-001: hora do ciclo · operador · produto · descarte folhas+talo (kg)',
      },
      {
        codigo: 'FIT-PL-003',
        titulo: 'Seleção de Folhas e Organização para Lavagem',
        objetivo:
          'Organizar o produto aprovado nos cestos azuis (máx. 2 ciclos de 5 maços por cesto), identificar e encaminhar ao setor de Lavagem a cada troca de cesto.',
        foto: null,
        antesDeComecar: [
          { icon: 'cestoAzul', texto: 'Cestos azuis limpos e identificados na bancada de saída.' },
          { icon: 'maços', texto: 'Lembrar: no máximo 2 ciclos (5 maços × 2 min) por cesto azul.' },
          { icon: 'folhaBoa', texto: 'Critérios de reprovação memorizados ou FIT visível.' },
          { icon: 'registro', texto: 'REG-PL-001 disponível para preenchimento.' },
        ],
        passos: [
          { icon: 'cestoAzul', texto: 'Receber produto da MLM 152 no cesto azul de saída (vindo da caçapa limpa).', critico: false },
          { icon: 'inspecao', texto: 'Revisar visualmente: folhas íntegras, sem manchas ou murchamento.', critico: false },
          { icon: 'folhaRuim', texto: 'Segregar folha amarelada, manchada, murcha ou rasgada.', critico: true },
          { icon: 'descarte', texto: 'Produto reprovado → descarte (não misturar com aprovado).', critico: true },
          { icon: 'maços', texto: 'Controlar: cada cesto azul recebe no máximo 2 ciclos de 5 produtos da máquina.', critico: true },
          { icon: 'cestoAzul', texto: 'Ao completar o 2º ciclo: organizar o cesto, identificar e enviar imediatamente ao setor de Lavagem.', critico: true },
          { icon: 'cestoAzul', texto: 'Colocar cesto azul limpo vazio no posto para os próximos 2 ciclos.', critico: true },
          { icon: 'etiqueta', texto: 'Identificar cestos com tipo de hortaliça e hora.', critico: false },
          { icon: 'balanca', texto: 'Pesar/estimar descarte (folhas + talo) e registrar no REG-PL-001.', critico: true },
          { icon: 'borrifador', texto: 'Limpar bancada de saída com álcool gel se houver resíduos.', critico: false },
        ],
        pontosCriticos: [
          'Cesto azul = no máximo 2 ciclos de 5 maços (2 min cada).',
          'A cada 2 ciclos: trocar o cesto e enviar à Lavagem — não acumular.',
          'Nenhum produto reprovado vai para o setor de Lavagem.',
          'Descarte = folhas ruins + talo (NÃO incluir raízes).',
        ],
        cards: [
          { icon: 'cestoAzul', titulo: '2 ciclos', sub: 'Por cesto azul' },
          { icon: 'maços', titulo: '5 maços', sub: 'Por ciclo' },
          { icon: 'lavagem', titulo: 'Enviar', sub: 'Após 2º ciclo' },
          { icon: 'xmark', titulo: 'Reprovado', sub: 'Descarte' },
        ],
        problemasComuns: [
          { problema: 'Cesto com mais de 2 ciclos', acao: 'Enviar o cesto agora à Lavagem; iniciar cesto limpo. Não continuar enchendo.' },
          { problema: 'Dúvida se folha é aprovada', acao: 'Na dúvida, descartar ou consultar Karla Maia.' },
          { problema: 'Cesto azul contaminado', acao: 'Higienizar ou trocar cesto antes de usar.' },
          { problema: 'Mistura de variedades', acao: 'Separar por tipo de hortaliça quando possível.' },
        ],
        registrar: 'REG-PL-001: hora encaminhamento · operador · produto · descarte (kg)',
      },
    ],

    treinamentoTopics: [
      'POP-PL-001 — Pré-Lavagem de Hortaliças',
      'FIT-PL-001 — Desembalagem e corte de raízes',
      'FIT-PL-002 — Operação MLM 152 e sanitização',
      'FIT-PL-003 — Seleção e organização para Lavagem',
      'Uso de EPIs (touca, luvas, avental, botas)',
      'Preparo solução sanitizante (ácido peracético 70 mg/L)',
      'Critérios de seleção e descarte',
      'Preenchimento REG-PL-001 e REG-PL-002',
      'Segurança: corte, químico e piso molhado',
    ],
  },
};

/** Navegação por setor — ordem do menu lateral */
const SECTOR_NAV = [
  {
    key: 'preLavagem',
    label: 'Pré-Lavagem',
    legacy: true,
    items: [
      { view: 'pop', label: '📋 POP-PL-001' },
      { view: 'fit1', label: '🔧 FIT-PL-001 Bancada' },
      { view: 'fit2', label: '⚙️ FIT-PL-002 Máquina' },
      { view: 'fit3', label: '🟦 FIT-PL-003 Saída' },
      { view: 'cartaz', label: '📌 Cartaz' },
      { view: 'formularios', label: '📝 Formulários' },
    ],
  },
  {
    key: 'lavagem',
    label: 'Lavagem, Enxágue e Pré-secagem',
    items: [
      { view: 'lv-pop', label: '📋 POP-LV-001' },
      { view: 'lv-fit0', label: '⚙️ FIT-LV-001 LHM 350' },
      { view: 'lv-fit1', label: '💧 FIT-LV-002 Enxágue e Pré-secagem' },
      { view: 'lv-cartaz', label: '📌 Cartaz' },
      { view: 'lv-forms', label: '📝 Formulários' },
    ],
  },
  {
    key: 'secagem',
    label: 'Secagem',
    items: [
      { view: 'sc-pop', label: '📋 POP-SC-001' },
      { view: 'sc-fit0', label: '🔄 FIT-SC-001 CTD ECO' },
      { view: 'sc-fit1', label: '🪑 FIT-SC-002 Bancada' },
      { view: 'sc-cartaz', label: '📌 Cartaz' },
      { view: 'sc-forms', label: '📝 Formulários' },
    ],
  },
  {
    key: 'embalagem',
    label: 'Embalagem',
    items: [
      { view: 'em-pop', label: '📋 POP-EM-001' },
      { view: 'em-fit0', label: '📦 FIT-EM-001 Seleção' },
      { view: 'em-fit1', label: '🔏 FIT-EM-002 Selagem' },
      { view: 'em-cartaz', label: '📌 Cartaz' },
      { view: 'em-forms', label: '📝 Formulários' },
    ],
  },
  {
    key: 'plantioAlface',
    label: 'Plantio — Alface',
    items: [
      { view: 'pa-pop', label: '📋 POP-PA-001' },
      { view: 'pa-fit0', label: '🧽 FIT-PA-001 Higienização' },
      { view: 'pa-fit1', label: '🌱 FIT-PA-002 Semeadeira' },
      { view: 'pa-fit2', label: '🌱 FIT-PA-003 Germinação' },
      { view: 'pa-fit3', label: '🌱 FIT-PA-004 Berçário NFT' },
      { view: 'pa-cartaz', label: '📌 Cartaz' },
      { view: 'pa-forms', label: '📝 Formulários' },
    ],
  },
  {
    key: 'plantioMicroverdes',
    label: 'Plantio — Microverdes',
    items: [
      { view: 'pm-pop', label: '📋 POP-PM-001' },
      { view: 'pm-fit0', label: '🧽 FIT-PM-001 Higienização' },
      { view: 'pm-fit1', label: '🌿 FIT-PM-002 Semeadeira' },
      { view: 'pm-fit2', label: '🌿 FIT-PM-003 Germinação' },
      { view: 'pm-fit3', label: '🌿 FIT-PM-004 LED indoor' },
      { view: 'pm-fit4', label: '🌿 FIT-PM-005 Colheita 30 g' },
      { view: 'pm-cartaz', label: '📌 Cartaz' },
      { view: 'pm-forms', label: '📝 Formulários' },
    ],
  },
  {
    key: 'torresProducao',
    label: 'Torres de Produção',
    items: [
      { view: 'tr-pop', label: '📋 POP-TR-001' },
      { view: 'tr-fit0', label: '💧 FIT-TR-001 EC e pH' },
      { view: 'tr-fit1', label: '⚗️ FIT-TR-002 Correção EC' },
      { view: 'tr-fit2', label: '⚗️ FIT-TR-003 Correção pH' },
      { view: 'tr-fit3', label: '🧴 FIT-TR-004 H₂O₂ 200V' },
      { view: 'tr-fit4', label: '🔍 FIT-TR-005 Raízes' },
      { view: 'tr-fit5', label: '🌱 FIT-TR-006 Transplantios' },
      { view: 'tr-fit6', label: '🥬 FIT-TR-007 Colheita' },
      { view: 'tr-cartaz', label: '📌 Cartaz' },
      { view: 'tr-forms', label: '📝 Formulários' },
    ],
  },
  {
    key: 'placasBpf',
    label: 'Placas BPF (parede)',
    items: [
      { view: 'bpf-maos', label: '🧼 Como lavar as mãos' },
      { view: 'bpf-adornos', label: '💍 Proibido adornos' },
      { view: 'bpf-celular', label: '📱 Proibido celular' },
      { view: 'bpf-saude', label: '🤒 Saúde do colaborador' },
      { view: 'bpf-higiene', label: '👔 Higiene e uniforme' },
      { view: 'bpf-regras', label: '📌 Regras da área' },
    ],
  },
];

/** Factory de FIT esqueleto */
function makeFitSkeleton({ codigo, titulo, objetivo, passos, cards, registrar, pontosCriticos, problemasComuns, antesDeComecar }) {
  return {
    codigo,
    titulo,
    objetivo,
    foto: null,
    antesDeComecar: antesDeComecar || [
      { icon: 'touca', texto: 'Conferir EPIs completos: touca, luvas, avental e botas.' },
      { icon: 'mao', texto: 'Higienizar as mãos com álcool em gel (início, retorno ao posto, após descarte e troca de atividade).' },
      { icon: 'borrifador', texto: 'Confirmar sanitização de bancadas e utensílios de contato.' },
    ],
    passos: passos || [],
    pontosCriticos: pontosCriticos || ['Completar controles críticos com a operação.'],
    cards: cards || [
      { icon: 'check', titulo: 'OK', sub: 'Seguir POP' },
      { icon: 'touca', titulo: 'EPI', sub: 'Obrigatório' },
      { icon: 'registro', titulo: 'Registrar', sub: 'Formulário' },
      { icon: 'inspecao', titulo: 'Qualidade', sub: 'Conferir' },
    ],
    problemasComuns: problemasComuns || [
      { problema: 'Dúvida no procedimento', acao: 'Parar e consultar a gerente Karla Maia.' },
    ],
    registrar: registrar || 'Registrar hora · operador · produto',
  };
}

function makeSectorSkeleton({
  codigo, titulo, objetivo, escopo, referencias, entrada, saida, maquina,
  controlesCriticos, fluxo, processoDetalhado, fits, resumoExtra,
}) {
  return {
    pop: {
      codigo,
      titulo,
      objetivo,
      escopo,
      referencias,
      produtos: 'Alface · Rúcula · Manjericão',
      capacidade: 'Conforme demanda diária de vendas',
      origem: 'Setor anterior da linha',
      equipe: '1 operador por posto / turno',
      maquina: maquina || 'Conforme layout da sala',
      entradaRecipiente: entrada,
      saidaRecipiente: saida,
      fotos: { fluxo: null, geral: null, bancada: null, maquina: null },
    },
    definicoes: [
      { termo: 'Lote', definicao: 'Quantidade de produto processada em sequência no mesmo turno/posto.' },
      { termo: 'Produto aprovado', definicao: 'Hortaliça que atende critérios visuais e de processo do setor.' },
      { termo: 'Não conformidade', definicao: 'Desvio de POP, falha de controle crítico ou produto fora do padrão.' },
    ],
    responsabilidades: [
      { funcao: 'Operador', descricao: 'Executar POP e FITs; registrar; manter higiene do posto.' },
      { funcao: 'Gerente (Karla Maia)', descricao: 'Aprovar desvios, paradas e revisões; validar treinamentos.' },
    ],
    utensilios: [
      { nome: 'EPIs', icon: 'touca' },
      { nome: 'Cestos / caçapas', icon: 'cestoAzul' },
      { nome: 'Borrifador álcool gel', icon: 'borrifador' },
      { nome: 'Timer / relógio', icon: 'timer' },
    ],
    controlesCriticos,
    fluxo,
    processoDetalhado,
    folhas: {
      aprovado: ['Cor e textura adequada', 'Sem manchas relevantes', 'Sem murchamento excessivo', 'Folha íntegra'],
      reprovado: ['Amarelada', 'Manchada', 'Murcha', 'Muito quebrada ou rasgada'],
    },
    higienizacao: [
      { icon: 'mao', item: 'Mãos', produto: 'Álcool gel', frequencia: 'Antes de iniciar e ao retornar' },
      { icon: 'borrifador', item: 'Bancada / contato', produto: 'Álcool gel', frequencia: 'A cada lote / fim de turno' },
      { icon: 'mop', item: 'Piso', produto: 'Conforme POP de limpeza', frequencia: 'Fim de turno' },
    ],
    riscos: [
      { icon: 'agua', titulo: 'Piso molhado', sub: 'Risco de queda — sinalizar e secar.' },
      { icon: 'mao', titulo: 'Contaminação cruzada', sub: 'Separar aprovado de reprovado.' },
    ],
    registros: [`REG-${codigo.split('-')[1]}-001 — Registro diário do setor.`],
    naoConformidades: [
      'Produto fora do padrão: segregar e descartar ou reprocessar conforme orientação.',
      'Falha de controle crítico: interromper, corrigir e registrar.',
      'Desvio do POP: somente com autorização da Gerente Karla Maia.',
    ],
    treinamento: [
      `Treinamento obrigatório no ${codigo} e FITs do setor antes de operar sem supervisão.`,
      'Registrar treinamento na ficha TRE correspondente.',
    ],
    resumo: [
      { item: 'Entrada', valor: entrada },
      { item: 'Saída', valor: saida },
      { item: 'Responsável desvio', valor: 'Karla Maia (Gerente)' },
      ...(resumoExtra || []),
    ],
    fits,
    treinamentoTopics: [`${codigo} — ${titulo}`, ...fits.map((f) => `${f.codigo} — ${f.titulo}`)],
  };
}

DEFAULT_DATA.lavagem = makeSectorSkeleton({
  codigo: 'POP-LV-001',
  titulo: 'Lavagem, Enxágue e Pré-secagem',
  objetivo:
    'Padronizar a lavagem na LHM 350, o enxágue na caixa de 50 L e a pré-secagem (escorrimento 1–2 min nas caçapas brancas) antes do encaminhamento à centrifugação (CTD ECO).',
  escopo: [
    'Recebe os cestos azuis da Pré-Lavagem (máximo 2 ciclos por cesto).',
    'Abrange: lavagem na LHM 350 (FIT-LV-001), enxágue e pré-secagem (FIT-LV-002).',
    'Não abrange: centrifugação CTD ECO, bancada de secagem, seleção, embalagem nem selagem.',
  ],
  referencias: [
    'RDC nº 216/2004 e RDC nº 275/2002 (BPF).',
    'Manual LHM 350 — NHS Máquinas (REV. 00 – NOV/21).',
    'POP-PL-001 (Pré-Lavagem) — setor anterior.',
    'FIT-LV-001 (LHM 350) e FIT-LV-002 (Enxágue e Pré-secagem).',
    'POP-SC-001 / FIT-SC-001 (CTD ECO) — próximo.',
  ],
  entrada: 'Cesto azul da Pré-Lavagem → despejar no tanque',
  saida: 'Caçapa branca (pré-secagem 1–2 min) → CTD ECO',
  maquina: 'LHM 350 + caixa de enxágue 50 L + tanque de escorrimento',
  controlesCriticos: [
    { valor: 'Marcação', label: 'Água da LHM 350', icon: 'agua' },
    { valor: '50 L', label: 'Água da caixa de enxágue', icon: 'agua' },
    { valor: '250 g × 3', label: 'Cloreto + 2 ácidos', icon: 'hipoclorito' },
    { valor: '30–45 s', label: 'Imersão (enxágue)', icon: 'timer' },
    { valor: '1–2 min', label: 'Pré-secagem (escorrer)', icon: 'timer' },
  ],
  fluxo: [
    { titulo: 'Entrada', sub: 'Cesto azul', icon: 'cestoAzul' },
    { titulo: 'LHM 350', sub: 'Despejar e lavar', icon: 'maquina' },
    { titulo: 'Enxágue', sub: 'Caixa 50 L · 30–45 s', icon: 'agua' },
    { titulo: 'Pré-secagem', sub: 'Caçapa branca · 1–2 min', icon: 'cacapaBranca' },
    { titulo: 'CTD ECO', sub: 'Próximo setor', icon: 'maquina' },
  ],
  processoDetalhado: [
    { icon: 'cestoAzul', texto: 'Receber o cesto azul da Pré-Lavagem e conferir o produto.' },
    { icon: 'agua', texto: 'Verificar a marcação de água do tanque da LHM 350. Completar se estiver abaixo. Conferir as peneiras.' },
    { icon: 'maquina', texto: 'Acionar a LHM 350 na ordem: Chave Geral → verificar emergência → Reset → Esteira → Bomba → (Compressor, se utilizar).' },
    { icon: 'maços', texto: 'Despejar o produto do cesto azul no tanque. Somente depois posicionar o cesto vazio na saída da esteira.' },
    { icon: 'agua', texto: 'Preparar a caixa de enxágue: água até 50 L; 250 g de cloreto de cálcio (dissolver); depois 250 g de ácido ascórbico + 250 g de ácido cítrico (misturar até uniformizar).' },
    { icon: 'timer', texto: 'Imergir o cesto na caixa por 30 a 45 segundos. Pressionar levemente as folhas (sem rasgar) para ficarem cobertas pela solução.' },
    { icon: 'cacapaBranca', texto: 'Retirar o cesto, escorrer, transferir às caçapas brancas e manter em pré-secagem (escorrimento) por 1 a 2 minutos.' },
    { icon: 'seta', texto: 'Encaminhar as caçapas brancas à centrifugação (FIT-SC-001). Não operar a CTD ECO neste setor.' },
    { icon: 'registro', texto: 'Registrar no REG-LV-001: hora, operador, produto, tempos e ocorrências.', critico: true },
  ],
  fits: [
    makeFitSkeleton({
      codigo: 'FIT-LV-001',
      titulo: 'Operação da LHM 350',
      objetivo:
        'Ligar a LHM 350, despejar o produto no tanque e, só depois, colocar o cesto no final da esteira para receber o lavado e ir ao enxágue.',
      antesDeComecar: [
        { icon: 'touca', texto: 'Usar touca, luvas, avental e botas.' },
        { icon: 'mao', texto: 'Passar álcool em gel nas mãos.' },
        { icon: 'cestoAzul', texto: 'Ter o cesto azul da Pré-Lavagem pronto.' },
        { icon: 'agua', texto: 'Água na marcação do tanque principal (completar se estiver baixo).' },
        { icon: 'inspecao', texto: 'Peneiras no lugar certo.' },
        { icon: 'alerta', texto: 'Saber onde ficam as 3 emergências (painel, entrada e saída). Esteira livre.' },
        { icon: 'maquina', texto: 'Ninguém com a mão na máquina. Sem panos ou ferramentas dentro.' },
      ],
      passos: [
        { icon: 'agua', texto: 'Olhar a marcação de água ao lado do tanque. Se estiver abaixo, completar antes de ligar.', critico: true },
        { icon: 'maquina', texto: 'Ligar a Chave Geral. A luz verde deve acender.', critico: true },
        { icon: 'alerta', texto: 'Ver se alguma emergência está apertada. Se estiver, girar para a direita para soltar (painel, entrada e saída).', critico: true },
        { icon: 'check', texto: 'Apertar o Reset.', critico: true },
        { icon: 'maquina', texto: 'Ligar a ESTEIRA. O produto deve ir para a frente (saída).', critico: true },
        { icon: 'agua', texto: 'Ligar a BOMBA e abrir os registros como no posto (para folhas: saída suave; não abrir o Reg. 1 até o fim).', critico: true },
        { icon: 'agua', texto: 'Se a máquina tiver e for usar borbulhas: ligar o COMPRESSOR (ar bem aberto).', critico: false },
        { icon: 'maços', texto: 'Despejar o produto do cesto azul no tanque.', critico: true },
        { icon: 'cestoAzul', texto: 'Só depois de despejar: levar o cesto vazio para o final da esteira, para pegar o produto lavado.', critico: true },
        { icon: 'alerta', texto: 'Nunca colocar a mão na esteira ligada.', critico: true },
        { icon: 'inspecao', texto: 'Acompanhar: o produto gira no tanque, sobe na esteira e cai no cesto.', critico: false },
        { icon: 'cestoAzul', texto: 'Quando o cesto estiver bom, identificar e levar para o enxágue e pré-secagem (FIT-LV-002).', critico: true },
        { icon: 'alerta', texto: 'Se precisar parar rápido: apertar emergência. Para religar: soltar emergência → Reset → ligar de novo na ordem.', critico: true },
        { icon: 'maquina', texto: 'Para parar: desligar Esteira, Bomba e Compressor. Se for ficar mais de 10 min parado: desligar a Chave Geral. Fechar o registro de ar logo após desligar.', critico: false },
        { icon: 'registro', texto: 'Anotar no REG-LV-001: hora, operador, produto e observações.', critico: true },
      ],
      pontosCriticos: [
        'Água na marcação do tanque antes de ligar a bomba.',
        '1º despejar no tanque → 2º só então levar o cesto para o final da esteira.',
        'Ordem de ligar: Chave Geral → emergência → Reset → Esteira → Bomba → (Compressor).',
        'Peneiras no lugar. Sem mão na esteira ligada.',
        'Depois da lavagem: ir para o enxágue (não pular para a secagem).',
      ],
      cards: [
        { icon: 'agua', titulo: 'Água', sub: 'Na marcação' },
        { icon: 'cestoAzul', titulo: '1º Despejar', sub: 'No tanque' },
        { icon: 'cestoAzul', titulo: '2º Cesto', sub: 'No final' },
        { icon: 'agua', titulo: 'Próximo', sub: 'Enxágue / Pré-secagem' },
      ],
      problemasComuns: [
        { problema: 'Água baixa', acao: 'Completar até a marcação antes de ligar a bomba.' },
        { problema: 'Máquina não liga', acao: 'Chave Geral ligada → soltar emergência → apertar Reset → conferir tomada.' },
        { problema: 'Esteira ou bomba não liga', acao: 'Soltar emergência e apertar Reset. Se continuar, chamar manutenção.' },
        { problema: 'Máquina fraca / pouca água', acao: 'Parar; olhar a marcação; limpar filtro e peneiras.' },
        { problema: 'Produto não sai do tanque', acao: 'Ajustar os registros do posto (não deixar o Reg. 1 todo aberto).' },
        { problema: 'Algo enroscou na esteira', acao: 'Emergência → soltar → Reset → tirar o objeto com a máquina parada.' },
        { problema: 'Cesto já no final antes de despejar', acao: 'Corrigir: despejar primeiro; depois levar o cesto vazio ao final.' },
        { problema: 'Esqueceu o cesto no final', acao: 'Colocar o cesto vazio no final da esteira antes do produto começar a sair.' },
      ],
      registrar: 'REG-LV-001: hora · operador · produto · observações',
    }),
    makeFitSkeleton({
      codigo: 'FIT-LV-002',
      titulo: 'Enxágue e Pré-secagem — Caixa 50 L',
      objetivo:
        'Preparar a solução na caixa de 50 L, imergir o cesto por 30 a 45 segundos (enxágue), transferir às caçapas brancas e manter em escorrimento 1–2 min (pré-secagem). A centrifugação é a etapa seguinte (FIT-SC-001).',
      antesDeComecar: [
        { icon: 'cestoAzul', texto: 'Cesto azul com produto proveniente da LHM 350 (FIT-LV-001).' },
        { icon: 'agua', texto: 'Caixa de enxágue limpa, com marcação de 50 L visível.' },
        { icon: 'balanca', texto: 'Doses preparadas: 250 g de cloreto de cálcio, 250 g de ácido ascórbico e 250 g de ácido cítrico.' },
        { icon: 'timer', texto: 'Cronômetro disponível para 30–45 s e 1–2 min.' },
        { icon: 'cacapaBranca', texto: 'Caçapas brancas limpas no tanque de escorrimento.' },
      ],
      passos: [
        { icon: 'agua', texto: 'Abastecer a caixa com água até a marcação (50 L).', critico: true },
        { icon: 'hipoclorito', texto: 'Adicionar 250 g de cloreto de cálcio. Misturar até dissolução completa.', critico: true },
        { icon: 'hipoclorito', texto: 'Após a dissolução: adicionar 250 g de ácido ascórbico e 250 g de ácido cítrico. Misturar até a solução ficar uniforme.', critico: true },
        { icon: 'cestoAzul', texto: 'Imergir o cesto azul com o produto da LHM 350 na caixa de 50 L.', critico: true },
        { icon: 'folhaBoa', texto: 'Pressionar levemente as folhas (sem rasgar nem esmagar) para que todo o produto fique coberto pela solução.', critico: true },
        { icon: 'timer', texto: 'Manter a imersão entre 30 e 45 segundos.', critico: true },
        { icon: 'cestoAzul', texto: 'Retirar o cesto. Balançar e girar para escorrer o máximo possível de água.', critico: true },
        { icon: 'cacapaBranca', texto: 'Transferir as folhas para caçapas brancas no tanque de escorrimento.', critico: true },
        { icon: 'timer', texto: 'Manter as caçapas brancas em escorrimento por 1 a 2 minutos (pré-secagem).', critico: true },
        { icon: 'seta', texto: 'Encaminhar as caçapas brancas ao setor de Secagem / centrifugação (FIT-SC-001). Não operar a centrífuga nesta FIT.', critico: false },
        { icon: 'registro', texto: 'Registrar no REG-LV-001: preparação da solução, hora, operador, produto e tempos.', critico: true },
      ],
      pontosCriticos: [
        'Esta FIT cobre enxágue + pré-secagem (escorrimento) e encerra na caçapa branca — centrifugação é FIT-SC-001.',
        'Caixa abastecida até a marcação de 50 L.',
        'Ordem: 1º cloreto de cálcio 250 g (dissolver) → 2º ácidos 250 g cada (misturar até uniformizar).',
        'Imersão de 30 a 45 segundos; pressão leve — sem rasgar o produto.',
        'Pré-secagem: escorrimento em caçapa branca por 1 a 2 minutos.',
      ],
      cards: [
        { icon: 'agua', titulo: '50 L', sub: 'Até a marcação' },
        { icon: 'hipoclorito', titulo: '250 g × 3', sub: 'Cloreto + ácidos' },
        { icon: 'timer', titulo: '30–45 s', sub: 'Enxágue' },
        { icon: 'cacapaBranca', titulo: '1–2 min', sub: 'Pré-secagem' },
      ],
      problemasComuns: [
        { problema: 'Nível fora da marcação de 50 L', acao: 'Ajustar até a marcação antes de dosar os produtos.' },
        { problema: 'Cloreto de cálcio não dissolveu', acao: 'Continuar a mistura; adicionar os ácidos somente após dissolução completa.' },
        { problema: 'Produto não coberto pela solução', acao: 'Pressionar levemente e redistribuir no cesto, sem rasgar.' },
        { problema: 'Tempo fora de 30–45 s', acao: 'Utilizar cronômetro e padronizar o intervalo.' },
        { problema: 'Escorrimento inferior a 1 min', acao: 'Aguardar 1 a 2 minutos antes de encaminhar à secagem.' },
      ],
      registrar: 'REG-LV-001: 50 L · 250 g de cada · 30–45 s · escorrimento 1–2 min · operador · produto',
    }),
  ],
  resumoExtra: [
    { item: 'Máquina', valor: 'LHM 350' },
    { item: 'Enxágue / Pré-secagem', valor: '50 L · 30–45 s · 1–2 min' },
    { item: 'FITs', valor: 'FIT-LV-001 · FIT-LV-002' },
    { item: 'Próximo', valor: 'Secagem / CTD ECO (FIT-SC-001)' },
  ],
});

Object.assign(DEFAULT_DATA.lavagem, {
  definicoes: [
    { termo: 'LHM 350', definicao: 'Lavadora hidrodinâmica com tanque de lavagem e esteira de saída.' },
    { termo: 'Cesto na saída', definicao: 'Após o despejo, o cesto vazio é posicionado na saída da esteira para receber o produto lavado.' },
    { termo: 'Caixa de enxágue', definicao: 'Recipiente de 50 L com solução de cloreto de cálcio e ácidos ascórbico e cítrico.' },
    { termo: 'Pré-secagem', definicao: 'Escorrimento de 1 a 2 minutos nas caçapas brancas após o enxágue, antes da centrifugação.' },
    { termo: 'Caçapa branca', definicao: 'Recipiente de pré-secagem (escorrimento) após o enxágue; as folhas permanecem 1 a 2 minutos antes da centrifugação.' },
    { termo: 'Marcação', definicao: 'Indicação de nível no tanque ou na caixa que define a quantidade correta de água.' },
    { termo: 'Reset', definicao: 'Botão que arma o sistema de segurança após a Chave Geral ou após liberar a emergência.' },
  ],
  utensilios: [
    { nome: 'EPIs (touca, luvas, avental, botas)', icon: 'touca' },
    { nome: 'Cestos azuis', icon: 'cestoAzul' },
    { nome: 'Caixa de enxágue 50 L', icon: 'agua' },
    { nome: 'Balança / doses de 250 g', icon: 'balanca' },
    { nome: 'Cloreto de cálcio, ácido ascórbico e ácido cítrico', icon: 'hipoclorito' },
    { nome: 'Caçapas brancas e tanque de escorrimento', icon: 'cacapaBranca' },
    { nome: 'Cronômetro', icon: 'timer' },
    { nome: 'LHM 350', icon: 'maquina' },
    { nome: 'Peneiras e filtro', icon: 'inspecao' },
    { nome: 'Álcool em gel / sanitizante de bancada', icon: 'borrifador' },
  ],
  higienizacao: [
    { icon: 'mao', item: 'Mãos', produto: 'Álcool gel', frequencia: 'Início, retorno ao posto, após descarte e troca de atividade' },
    { icon: 'bancada', item: 'Bancadas / superfícies de contato', produto: 'Sanitização', frequencia: 'Início do turno, a cada lote e fim de turno' },
    { icon: 'maquina', item: 'LHM 350', produto: 'Limpeza e sanitização (equipamento desligado)', frequencia: 'Fim de turno / troca de água' },
    { icon: 'agua', item: 'Caixa de enxágue', produto: 'Limpeza e sanitização', frequencia: 'Troca de solução / fim de turno' },
    { icon: 'cacapaBranca', item: 'Caçapas brancas', produto: 'Limpeza e sanitização', frequencia: 'Fim de turno / quando necessário' },
    { icon: 'inspecao', item: 'Peneiras e filtro', produto: 'Água, detergente e escova adequada', frequencia: 'Mínimo 1× ao dia' },
    { icon: 'mop', item: 'Piso', produto: 'Conforme procedimento de limpeza', frequencia: 'Fim de turno; manter seco' },
  ],
  riscos: [
    { icon: 'alerta', titulo: 'ESTEIRA', acao: 'Não introduzir as mãos na esteira em funcionamento. Em situação de risco, acionar a emergência.' },
    { icon: 'quimico', titulo: 'DOSAGEM', acao: 'Utilizar balança e EPIs. Ordem: cloreto de cálcio primeiro; ácidos em seguida.' },
    { icon: 'pisoMolhado', titulo: 'PISO MOLHADO', acao: 'Botas antiderrapantes; conter vazamentos; não correr.' },
    { icon: 'mao', titulo: 'MANUSEIO', acao: 'Na imersão, pressionar levemente — sem rasgar o produto.' },
    { icon: 'touca', titulo: 'EPI / MÃOS', acao: 'EPIs completos; higienizar as mãos na frequência definida.' },
  ],
  naoConformidades: [
    'Nível de água abaixo da marcação: completar antes de prosseguir.',
    'Dose incorreta ou ácidos antes da dissolução do cloreto: refazer a solução.',
    'Imersão fora de 30–45 s: corrigir e registrar.',
    'Cesto na saída antes do despejo: corrigir imediatamente.',
    'Encaminhar à CTD ECO sem pré-secagem de 1 a 2 min: corrigir.',
    'Operar sem EPIs ou sem higienização das mãos: interromper e corrigir.',
    'Desvio do procedimento: somente com autorização da Gerente Karla Maia.',
  ],
  registros: [
    'REG-LV-001 — LHM 350: hora, operador, produto, ocorrências.',
    'REG-LV-001 — Enxágue e pré-secagem: 50 L · 250 g de cada · 30–45 s · escorrimento 1–2 min.',
    'REG-LV-002 — Higienização por turno (mãos, bancadas, equipamentos, utensílios, piso).',
  ],
  treinamento: [
    'Treinamento obrigatório no POP-LV-001, FIT-LV-001 e FIT-LV-002 antes de operar sem supervisão.',
    'Incluir: ordem de acionamento da LHM 350, dosagem do enxágue, pré-secagem 1–2 min, EPIs e higienização.',
    'Registrar na ficha TRE-LV-001.',
  ],
});

DEFAULT_DATA.secagem = makeSectorSkeleton({
  codigo: 'POP-SC-001',
  titulo: 'Centrifugação CTD ECO e Bancada',
  objetivo:
    'Padronizar a centrifugação das folhas na CTD ECO (velocidade mínima, ciclo 2 min + agitação do cesto + 2 min) e o espalhamento nas bancadas de inox antes da embalagem.',
  escopo: [
    'Recebe caçapas brancas já escorridas (pré-secagem 1–2 min é da FIT-LV-002 — este setor apenas confere na entrada da CTD ECO).',
    'Abrange: conferência de entrada, carga e ciclo na CTD ECO (2+2 min) e espalhamento nas bancadas de inox (caçapas sob bancada quando necessário).',
    'Não abrange: enxágue 50 L, imersão, pré-secagem (escorrimento), lavagem LHM 350, seleção/embalagem.',
  ],
  referencias: [
    'Manual CTD ECO — NHS Máquinas (REV. 00 – DEZ/22).',
    'POP-LV-001 / FIT-LV-002 (Enxágue e Pré-secagem) — setor anterior.',
    'FIT-SC-001 (CTD ECO) e FIT-SC-002 (Bancada).',
    'POP-EM-001 — seleção e embalagem.',
  ],
  entrada: 'Caçapa branca já escorrida (conferir pré-secagem 1–2 min · FIT-LV-002)',
  saida: 'Bancada de inox (ou caçapa sob bancada) → Embalagem',
  maquina: 'CTD ECO — cesto sem completar o volume',
  controlesCriticos: [
    { valor: 'Mínima', label: 'Velocidade (folhas)', icon: 'maquina' },
    { valor: '2 + 2 min', label: 'Ciclo (agitar cesto no intervalo)', icon: 'timer' },
    { valor: 'Carga', label: 'Cesto sem completar o volume', icon: 'alerta' },
    { valor: 'Emerg.→Reset', label: 'Ordem de liberação', icon: 'alerta' },
  ],
  fluxo: [
    { titulo: 'Entrada', sub: 'Conferir pré-secagem', icon: 'inspecao' },
    { titulo: 'CTD ECO', sub: 'Vel. mínima · 2+2 min', icon: 'maquina' },
    { titulo: 'Bancada', sub: 'Espalhamento', icon: 'bancada' },
    { titulo: 'Complemento', sub: 'Caçapa sob bancada', icon: 'cacapaBranca' },
    { titulo: 'Embalagem', sub: 'Próximo setor', icon: 'etiqueta' },
  ],
  processoDetalhado: [
    { icon: 'inspecao', texto: 'Na entrada: conferir que a caçapa branca já cumpriu a pré-secagem de 1 a 2 min (FIT-LV-002). Se não, devolver ao enxágue — não executar o escorrimento neste setor.' },
    { icon: 'maquina', texto: 'Carregar o cesto da CTD ECO sem completar o volume. Cesto corretamente encaixado. Interior livre de objetos estranhos.' },
    { icon: 'maquina', texto: 'Acionar: Chave Geral → verificar emergência → Reset → temporizador 2 min → velocidade mínima → Liga.' },
    { icon: 'timer', texto: 'Executar 2 minutos. Abrir, agitar o cesto para desprender as folhas, fechar e executar mais 2 minutos.' },
    { icon: 'bancada', texto: 'Espalhar o produto nas bancadas de inox (FIT-SC-002).' },
    { icon: 'cacapaBranca', texto: 'Se todas as bancadas estiverem ocupadas: acomodar o excedente nas caçapas brancas sob as bancadas.' },
    { icon: 'etiqueta', texto: 'Encaminhar à seleção e embalagem (FIT-EM-001).' },
    { icon: 'registro', texto: 'Registrar no REG-SC-001: conferência de entrada, ciclo e ocorrências.', critico: true },
  ],
  fits: [
    makeFitSkeleton({
      codigo: 'FIT-SC-001',
      titulo: 'Centrifugação CTD ECO — Folhas',
      objetivo:
        'Conferir na entrada o escorrimento (FIT-LV-002), carregar o cesto sem completar o volume e executar o ciclo em velocidade mínima (2 min → agitar o cesto → mais 2 min). Em seguida encaminhar às bancadas de inox.',
      antesDeComecar: [
        { icon: 'cacapaBranca', texto: 'Caçapas brancas provenientes do enxágue (FIT-LV-002) — escorrimento já concluído no setor anterior.' },
        { icon: 'maquina', texto: 'CTD ECO higienizada e cesto disponível.' },
        { icon: 'alerta', texto: 'Botão de emergência somente para situações de emergência — não utilizar para encerrar o ciclo normal.' },
      ],
      passos: [
        { icon: 'inspecao', texto: 'Conferir na entrada: a caçapa deve ter cumprido o escorrimento de 1 a 2 min no enxágue (FIT-LV-002). Se não, devolver ao enxágue — não cronometrar nem executar o escorrimento nesta FIT.', critico: true },
        { icon: 'inspecao', texto: 'Abrir a tampa e verificar: no interior deve haver apenas o cesto — sem objetos estranhos.', critico: true },
        { icon: 'maquina', texto: 'Encaixar o cesto. Transferir as folhas sem completar o volume (manter folga de carga). Fechar a tampa.', critico: true },
        { icon: 'maquina', texto: 'Acionar a Chave Geral. Confirmar sinaleiro verde aceso.', critico: true },
        { icon: 'alerta', texto: 'Verificar se a emergência está acionada. Se estiver, girar no sentido horário para liberar.', critico: true },
        { icon: 'check', texto: 'Pressionar o Reset de Segurança.', critico: true },
        { icon: 'timer', texto: 'Ajustar o temporizador para 2 minutos (evitar extremos mínimo/máximo — o ciclo pode não se encerrar).', critico: true },
        { icon: 'maquina', texto: 'Selecionar a velocidade mínima (folhas).', critico: true },
        { icon: 'maquina', texto: 'Girar a chave para LIGA. Inicia o 1º ciclo (sinaleiro branco aceso com o motor).', critico: true },
        { icon: 'timer', texto: 'Aguardar o término dos 2 minutos (sinal sonoro/luminoso).', critico: true },
        { icon: 'maquina', texto: 'Desligar (chave para Desl.). Abrir e agitar o cesto para desprender as folhas.', critico: true },
        { icon: 'timer', texto: 'Fechar. Confirmar novamente 2 minutos e velocidade mínima. Acionar o 2º ciclo.', critico: true },
        { icon: 'timer', texto: 'Aguardar o término dos outros 2 minutos.', critico: true },
        { icon: 'folhaBoa', texto: 'Desligar, abrir e descarregar com cuidado. Encaminhar às bancadas de inox (FIT-SC-002).', critico: false },
        { icon: 'maquina', texto: 'Se não houver uso em cerca de 10 minutos: desligar a Chave Geral. Não utilizar a emergência para desligamento normal.', critico: false },
        { icon: 'registro', texto: 'Registrar no REG-SC-001: conferência de entrada, ciclo 2+2 min, velocidade mínima, operador e produto.', critico: true },
      ],
      pontosCriticos: [
        'Escorrimento 1–2 min é da FIT-LV-002: nesta FIT só conferir na entrada (não executar).',
        'Não completar o volume do cesto; interior livre de objetos estranhos.',
        'Folhas: velocidade mínima · 2 min → agitar o cesto → mais 2 min.',
        'Ordem: Chave Geral → emergência → Reset → tempo → velocidade → Liga.',
        'Não utilizar emergência para encerrar o ciclo normal.',
        'Não introduzir as mãos no equipamento em funcionamento.',
        'Após o 2º ciclo: encaminhar às bancadas de inox (não retornar ao enxágue).',
      ],
      cards: [
        { icon: 'inspecao', titulo: 'Entrada', sub: 'Conferir 1–2 min' },
        { icon: 'maquina', titulo: 'Vel. mínima', sub: 'Folhas' },
        { icon: 'timer', titulo: '2 + 2 min', sub: 'Agitar no meio' },
        { icon: 'alerta', titulo: 'Carga', sub: 'Sem completar' },
      ],
      problemasComuns: [
        { problema: 'Caçapa sem escorrimento de 1–2 min', acao: 'Devolver ao enxágue (FIT-LV-002). Não cronometrar o escorrimento no posto da CTD.' },
        { problema: 'Cesto com carga excessiva', acao: 'Reduzir a carga e dividir em ciclos. Carga completa causa vibração e secagem inadequada.' },
        { problema: 'Máquina não liga', acao: 'Chave Geral → liberar emergência → Reset → conferir alimentação. Sinaleiro vermelho indica segurança não armada.' },
        { problema: 'Ciclo não se encerra', acao: 'Temporizador em extremo — ajustar para 2 minutos e religar.' },
        { problema: 'Vibração excessiva', acao: 'Parar; redistribuir a carga (sem completar o cesto). Se persistir, acionar manutenção.' },
        { problema: 'Folhas aderidas ao cesto', acao: 'Esperado no 1º ciclo — agitar o cesto e executar o 2º ciclo.' },
        { problema: 'Ruído anormal', acao: 'Acionar emergência; religar somente após correção (Reset).' },
      ],
      registrar: 'REG-SC-001: entrada OK · 2+2 min · vel. mínima · operador · produto',
    }),
    makeFitSkeleton({
      codigo: 'FIT-SC-002',
      titulo: 'Bancada de inox — Espalhamento',
      objetivo:
        'Espalhar o produto centrifugado nas bancadas de inox. Se as bancadas estiverem ocupadas, acomodar o excedente em caçapas brancas sob as bancadas e encaminhar à seleção/embalagem.',
      antesDeComecar: [
        { icon: 'bancada', texto: 'Bancadas de inox limpas, secas e sanitizadas.' },
        { icon: 'cacapaBranca', texto: 'Caçapas brancas limpas disponíveis sob as bancadas.' },
      ],
      passos: [
        { icon: 'folhaBoa', texto: 'Receber o produto após o 2º ciclo da CTD ECO (FIT-SC-001).', critico: false },
        { icon: 'bancada', texto: 'Espalhar as folhas nas bancadas de inox de forma uniforme, sem acumular em excesso.', critico: true },
        { icon: 'inspecao', texto: 'Manter o produto disposto para a seleção subsequente.', critico: false },
        { icon: 'cacapaBranca', texto: 'Se todas as bancadas estiverem ocupadas: acomodar o excedente nas caçapas brancas sob as bancadas.', critico: true },
        { icon: 'etiqueta', texto: 'Encaminhar à seleção e embalagem (FIT-EM).', critico: false },
        { icon: 'registro', texto: 'Registrar no REG-SC-001 o uso de caçapa sob bancada ou ocorrências.', critico: false },
      ],
      pontosCriticos: [
        'Priorizar o espalhamento nas bancadas de inox.',
        'Caçapa sob a bancada somente quando não houver espaço nas bancadas.',
        'Próxima etapa: seleção e embalagem (não retornar ao enxágue).',
      ],
      cards: [
        { icon: 'bancada', titulo: 'Bancada', sub: 'Inox' },
        { icon: 'folhaBoa', titulo: 'Espalhar', sub: 'Uniforme' },
        { icon: 'cacapaBranca', titulo: 'Excedente', sub: 'Sob bancada' },
        { icon: 'etiqueta', titulo: 'Próximo', sub: 'Embalagem' },
      ],
      problemasComuns: [
        { problema: 'Bancadas ocupadas', acao: 'Utilizar caçapas brancas sob as bancadas. Não acumular em altura excessiva na bancada.' },
        { problema: 'Produto ainda muito úmido', acao: 'Confirmar ciclo 2+2 min e agitação intermediária. Novo ciclo curto somente com autorização.' },
      ],
      registrar: 'REG-SC-001: bancada · caçapa sob bancada · operador · produto',
    }),
  ],
  resumoExtra: [
    { item: 'Máquina', valor: 'CTD ECO' },
    { item: 'Ciclo folhas', valor: 'Vel. mínima · 2 + 2 min' },
    { item: 'FITs', valor: 'FIT-SC-001 · FIT-SC-002' },
    { item: 'Anterior', valor: 'Enxágue e Pré-secagem (FIT-LV-002)' },
    { item: 'Próximo', valor: 'Seleção e Embalagem' },
  ],
});

Object.assign(DEFAULT_DATA.secagem, {
  definicoes: [
    { termo: 'CTD ECO', definicao: 'Centrifugadora com temporizador e seletor de velocidade para remoção de água.' },
    { termo: 'Ciclo de folhas', definicao: 'Velocidade mínima: 2 min → abrir e agitar o cesto → mais 2 min.' },
    { termo: 'Cesto da centrífuga', definicao: 'Recipiente de carga; não completar o volume.' },
    { termo: 'Conferência de entrada', definicao: 'Verificação de que a pré-secagem (1–2 min) já foi cumprida na FIT-LV-002 antes de carregar a CTD ECO.' },
    { termo: 'Bancada de inox', definicao: 'Superfície onde o produto centrifugado é espalhado para seleção.' },
    { termo: 'Caçapa sob bancada', definicao: 'Caçapa branca utilizada quando as bancadas estão ocupadas.' },
    { termo: 'Reset', definicao: 'Botão que arma a segurança após a Chave Geral ou após liberar a emergência.' },
  ],
  utensilios: [
    { nome: 'EPIs', icon: 'touca' },
    { nome: 'CTD ECO e cesto', icon: 'maquina' },
    { nome: 'Caçapas brancas', icon: 'cacapaBranca' },
    { nome: 'Bancadas de inox', icon: 'bancada' },
    { nome: 'Temporizador do painel', icon: 'timer' },
    { nome: 'Álcool em gel / sanitizante', icon: 'borrifador' },
  ],
  higienizacao: [
    { icon: 'mao', item: 'Mãos', produto: 'Álcool gel', frequencia: 'Início, retorno ao posto, após descarte e troca de atividade' },
    { icon: 'bancada', item: 'Bancadas de inox', produto: 'Limpeza e sanitização', frequencia: 'Início do turno, a cada lote e fim de turno' },
    { icon: 'maquina', item: 'CTD ECO', produto: 'Água e detergente neutro; secar', frequencia: 'Fim de turno (equipamento desligado)' },
    { icon: 'alerta', item: 'Painel elétrico', produto: 'Pano úmido — sem jato d’água', frequencia: 'Quando necessário' },
    { icon: 'cacapaBranca', item: 'Caçapas e cestos', produto: 'Limpeza e sanitização', frequencia: 'Fim de turno' },
    { icon: 'mop', item: 'Piso', produto: 'Conforme procedimento de limpeza', frequencia: 'Fim de turno' },
  ],
  riscos: [
    { icon: 'alerta', titulo: 'TAMPA / CESTO', acao: 'Não introduzir as mãos no equipamento em funcionamento.' },
    { icon: 'alerta', titulo: 'EMERGÊNCIA', acao: 'Utilizar somente em emergência — não para encerrar o ciclo normal.' },
    { icon: 'pisoMolhado', titulo: 'PISO MOLHADO', acao: 'Botas; conter e secar água no piso.' },
    { icon: 'mao', titulo: 'CARGA', acao: 'Carga completa do cesto causa vibração — manter folga de carga.' },
    { icon: 'touca', titulo: 'EPI / MÃOS', acao: 'EPIs completos; higienizar as mãos na frequência definida.' },
  ],
  naoConformidades: [
    'Caçapa recebida sem pré-secagem 1–2 min (FIT-LV-002): devolver ao enxágue; não executar o escorrimento neste setor.',
    'Velocidade incorreta ou ausência da agitação intermediária do cesto: corrigir e registrar.',
    'Cesto com volume completo: reduzir a carga.',
    'Uso da emergência para desligamento normal: orientar e registrar.',
    'Acúmulo excessivo na bancada sem espalhamento: redistribuir; utilizar caçapa sob bancada se necessário.',
    'Operar sem EPIs ou sem higienização das mãos: interromper e corrigir.',
    'Desvio do procedimento: somente com autorização da Gerente Karla Maia.',
  ],
  registros: [
    'REG-SC-001 — CTD ECO: conferência de entrada · velocidade mínima · 2+2 min · operador · produto.',
    'REG-SC-001 — Bancada: espalhamento · caçapa sob bancada (quando utilizada).',
    'REG-SC-002 — Higienização por turno (mãos, bancadas, CTD ECO, utensílios, piso).',
  ],
  treinamento: [
    'Treinamento obrigatório no POP-SC-001, FIT-SC-001 e FIT-SC-002 antes de operar sem supervisão.',
    'Incluir: conferência de entrada, ciclo 2+2 min, carga sem completar o cesto, bancada e EPIs/higienização.',
    'Registrar na ficha TRE-SC-001.',
  ],
});

DEFAULT_DATA.embalagem = makeSectorSkeleton({
  codigo: 'POP-EM-001',
  titulo: 'Seleção, Embalagem e Selagem',
  objetivo:
    'Padronizar a seleção final das folhas, a montagem em embalagem microperfurada conforme o pedido e a selagem, com encaminhamento à etiquetagem e armazenagem refrigerada.',
  escopo: [
    'Recebe produto das bancadas de inox (ou caçapas brancas sob bancada) após a CTD ECO.',
    'Abrange: seleção visual, montagem da embalagem, selagem (até 4 unidades por ciclo) e liberação para etiquetagem/armazenagem refrigerada.',
    'Não abrange: centrifugação nem a operação detalhada de etiquetagem/estoque (quando houver POP próprio).',
  ],
  referencias: [
    'POP-SC-001 / FIT-SC-002 (Bancada) — setor anterior.',
    'Critérios de folha: FIT-PL-001 / POP-PL-001 (aprovado/reprovado), com umidade residual máxima de 10%.',
    'FIT-EM-001 e FIT-EM-002.',
    'RDC nº 216/2004 e RDC nº 275/2002 (BPF).',
  ],
  entrada: 'Bancada de inox / caçapa sob bancada (pós CTD ECO)',
  saida: 'Embalagem selada → etiquetagem e armazenagem refrigerada',
  maquina: 'Bancada de seleção + seladora (até 4 embalagens por ciclo)',
  controlesCriticos: [
    { valor: '≤ 10%', label: 'Umidade residual máxima', icon: 'agua' },
    { valor: 'Pedido', label: 'Peso · variedade · mix', icon: 'balanca' },
    { valor: '15 un.', label: 'Máximo sem selar', icon: 'alerta' },
    { valor: '2 s / 1,8 s', label: 'Vácuo / temperatura', icon: 'timer' },
    { valor: 'Baixa', label: 'Aquecimento', icon: 'maquina' },
  ],
  fluxo: [
    { titulo: 'Seleção', sub: 'Critério PL-001 + umidade', icon: 'inspecao' },
    { titulo: 'Embalar', sub: 'Microperfurada · pedido', icon: 'etiqueta' },
    { titulo: 'Lote 15', sub: 'Encaminhar à selagem', icon: 'alerta' },
    { titulo: 'Selar', sub: 'Até 4 · conferir lacre', icon: 'check' },
    { titulo: 'Saída', sub: 'Etiqueta + refrigeração', icon: 'registro' },
  ],
  processoDetalhado: [
    { icon: 'folhaBoa', texto: 'Receber o produto da bancada de inox (ou caçapa sob bancada).' },
    { icon: 'inspecao', texto: 'Selecionar com os mesmos critérios da FIT-PL-001: aprovado = fresco, sem manchas, sem murchamento excessivo, íntegra; reprovado = amarelada, manchada, murcha ou muito quebrada/rasgada.' },
    { icon: 'agua', texto: 'Conferir umidade: folhas secas ou, no máximo, 10% de volume de água residual.' },
    { icon: 'etiqueta', texto: 'Montar a embalagem microperfurada conforme o sistema de pedidos (peso, variedade e proporção do mix).' },
    { icon: 'alerta', texto: 'Não acumular embalagens abertas: a cada 15 unidades, encaminhar à selagem.' },
    { icon: 'maquina', texto: 'Selar: Chave Geral em I · vácuo 2 s · temperatura 1,8 s · aquecimento BAIXA · até 4 embalagens nas presilhas · baixar a tampa (ciclo automático).' },
    { icon: 'inspecao', texto: 'Conferir a embalagem selada pressionando e verificando vazamentos na parte superior.' },
    { icon: 'etiqueta', texto: 'Encaminhar à etiquetagem e à armazenagem refrigerada.' },
    { icon: 'registro', texto: 'Registrar no REG-EM-001.', critico: true },
  ],
  fits: [
    makeFitSkeleton({
      codigo: 'FIT-EM-001',
      titulo: 'Seleção e Embalagem',
      objetivo:
        'Selecionar as folhas (critério FIT-PL-001 + umidade ≤ 10%) e montar a embalagem microperfurada conforme o pedido, encaminhando à selagem a cada 15 unidades.',
      antesDeComecar: [
        { icon: 'touca', texto: 'EPIs: touca, luvas, avental e botas.' },
        { icon: 'mao', texto: 'Higienizar as mãos com álcool em gel.' },
        { icon: 'folhaBoa', texto: 'Produto disponível na bancada de inox ou caçapa sob bancada (FIT-SC-002).' },
        { icon: 'etiqueta', texto: 'Embalagens microperfuradas e pedido do sistema (peso, variedade, mix) conferidos.' },
        { icon: 'balanca', texto: 'Balança disponível quando o pedido exigir peso.' },
        { icon: 'descarte', texto: 'Local de descarte identificado para folhas reprovadas.' },
      ],
      passos: [
        { icon: 'folhaBoa', texto: 'Receber o produto da bancada de inox ou da caçapa sob bancada.', critico: false },
        { icon: 'inspecao', texto: 'Selecionar visualmente — APROVADO: cor e textura de produto fresco; sem manchas; sem murchamento excessivo; folha íntegra.', critico: true },
        { icon: 'folhaRuim', texto: 'REPROVADO (descarte): amarelada, manchada, murcha ou muito quebrada/rasgada. Não embalar.', critico: true },
        { icon: 'agua', texto: 'Conferir umidade: a folha deve estar seca ou, no máximo, com 10% de volume de água residual. Acima disso: não embalar.', critico: true },
        { icon: 'etiqueta', texto: 'Colocar as folhas aprovadas na embalagem microperfurada conforme o sistema de pedidos: peso, variedade e proporção do mix.', critico: true },
        { icon: 'balanca', texto: 'Conferir peso/porção quando o pedido especificar.', critico: true },
        { icon: 'alerta', texto: 'Não acumular embalagens sem selar. A cada 15 produtos montados, encaminhar imediatamente à selagem (FIT-EM-002).', critico: true },
        { icon: 'registro', texto: 'Registrar no REG-EM-001: produto, pedido/mix, quantidade e descarte quando aplicável.', critico: true },
      ],
      pontosCriticos: [
        'Critério de folha igual à FIT-PL-001 (aprovado/reprovado).',
        'Umidade: seca ou ≤ 10% de volume de água residual.',
        'Embalagem microperfurada conforme pedido (peso, variedade, proporção do mix).',
        'Máximo 15 embalagens sem selar — em seguida, encaminhar à selagem.',
      ],
      cards: [
        { icon: 'inspecao', titulo: 'Seleção', sub: 'FIT-PL-001' },
        { icon: 'agua', titulo: '≤ 10%', sub: 'Umidade' },
        { icon: 'etiqueta', titulo: 'Pedido', sub: 'Peso · mix' },
        { icon: 'alerta', titulo: '15 un.', sub: 'Ir à selagem' },
      ],
      problemasComuns: [
        { problema: 'Dúvida se a folha é aprovada', acao: 'Na dúvida, descartar ou consultar a Gerente Karla Maia.' },
        { problema: 'Folha com umidade acima de 10%', acao: 'Não embalar. Verificar escorrimento/centrifugação antes de retomar.' },
        { problema: 'Pedido / mix incorreto', acao: 'Parar e conferir o sistema de pedidos antes de montar novas unidades.' },
        { problema: 'Mais de 15 embalagens sem selar', acao: 'Interromper a montagem e encaminhar o lote à selagem imediatamente.' },
      ],
      registrar: 'REG-EM-001: hora · operador · produto · pedido/mix · qtd · descarte',
    }),
    makeFitSkeleton({
      codigo: 'FIT-EM-002',
      titulo: 'Selagem',
      objetivo:
        'Operar a seladora com os parâmetros definidos, selar até 4 embalagens por ciclo, conferir estanqueidade e encaminhar à etiquetagem e armazenagem refrigerada.',
      antesDeComecar: [
        { icon: 'touca', texto: 'EPIs: touca, luvas, avental e botas.' },
        { icon: 'mao', texto: 'Higienizar as mãos com álcool em gel.' },
        { icon: 'etiqueta', texto: 'Embalagens montadas da FIT-EM-001 (lotes de até 15).' },
        { icon: 'maquina', texto: 'Seladora limpa e em condições de uso.' },
      ],
      passos: [
        { icon: 'maquina', texto: 'Chave Geral na posição I.', critico: true },
        { icon: 'timer', texto: 'Ajustar o vácuo para 2 segundos.', critico: true },
        { icon: 'timer', texto: 'Ajustar a temperatura para 1,8 segundos.', critico: true },
        { icon: 'maquina', texto: 'Ajustar o aquecimento na opção BAIXA.', critico: true },
        { icon: 'etiqueta', texto: 'Posicionar até 4 embalagens por ciclo — uma em cada uma das 4 presilhas.', critico: true },
        { icon: 'maquina', texto: 'Baixar a tampa: a selagem inicia automaticamente.', critico: true },
        { icon: 'inspecao', texto: 'Após a selagem: pressionar a embalagem e verificar se não há vazamentos pela parte superior.', critico: true },
        { icon: 'xmark', texto: 'Embalagem com vazamento ou lacre falho: não liberar — resselar ou descartar a unidade e registrar.', critico: true },
        { icon: 'etiqueta', texto: 'Encaminhar as unidades aprovadas à etiquetagem e à armazenagem refrigerada.', critico: true },
        { icon: 'registro', texto: 'Registrar no REG-EM-001: ciclos, falhas de selagem e operador.', critico: true },
      ],
      pontosCriticos: [
        'Parâmetros: Chave Geral I · vácuo 2 s · temperatura 1,8 s · aquecimento BAIXA.',
        'Máximo 4 embalagens por ciclo, uma por presilha.',
        'Conferir estanqueidade (pressionar e inspecionar a parte superior) antes de liberar.',
        'Destino após selagem: etiquetagem e armazenagem refrigerada.',
      ],
      cards: [
        { icon: 'timer', titulo: '2 s', sub: 'Vácuo' },
        { icon: 'timer', titulo: '1,8 s', sub: 'Temperatura' },
        { icon: 'maquina', titulo: 'Baixa', sub: 'Aquecimento' },
        { icon: 'check', titulo: 'Até 4', sub: 'Por ciclo' },
      ],
      problemasComuns: [
        { problema: 'Parâmetros fora do padrão', acao: 'Corrigir para vácuo 2 s, temperatura 1,8 s e aquecimento BAIXA antes de continuar.' },
        { problema: 'Vazamento na parte superior', acao: 'Não liberar. Resselar ou descartar a unidade e registrar.' },
        { problema: 'Mais de 4 embalagens no ciclo', acao: 'Remover o excedente; manter uma embalagem por presilha.' },
        { problema: 'Máquina não inicia ao baixar a tampa', acao: 'Conferir Chave Geral em I e parâmetros. Se persistir, acionar manutenção.' },
      ],
      registrar: 'REG-EM-001: hora · operador · ciclos · falhas de selagem',
    }),
  ],
  resumoExtra: [
    { item: 'Embalagem', valor: 'Microperfurada · conforme pedido' },
    { item: 'Umidade', valor: 'Seca ou ≤ 10%' },
    { item: 'Selagem', valor: 'Vácuo 2 s · temp. 1,8 s · aquecimento baixa' },
    { item: 'Próximo', valor: 'Etiquetagem + refrigeração' },
  ],
});

Object.assign(DEFAULT_DATA.embalagem, {
  folhas: {
    aprovado: [
      'Cor e textura de produto fresco',
      'Sem manchas',
      'Sem murchamento excessivo',
      'Folha íntegra',
      'Seca ou no máximo 10% de volume de água residual',
    ],
    reprovado: [
      'Amarelada',
      'Manchada',
      'Murcha',
      'Muito quebrada ou rasgada',
      'Umidade residual acima de 10%',
    ],
  },
  definicoes: [
    { termo: 'Embalagem microperfurada', definicao: 'Embalagem do posto; montada conforme peso, variedade e proporção do mix do sistema de pedidos.' },
    { termo: 'Umidade residual', definicao: 'Água restante nas folhas após a secagem. Limite para embalar: seca ou no máximo 10% do volume.' },
    { termo: 'Lote de 15', definicao: 'Quantidade máxima de embalagens montadas sem selar; ao atingir 15, encaminhar à selagem.' },
    { termo: 'Presilha', definicao: 'Posição de fixação na seladora; até 4 embalagens por ciclo (uma por presilha).' },
  ],
  utensilios: [
    { nome: 'EPIs', icon: 'touca' },
    { nome: 'Embalagem microperfurada', icon: 'etiqueta' },
    { nome: 'Balança', icon: 'balanca' },
    { nome: 'Seladora (4 presilhas)', icon: 'maquina' },
    { nome: 'Área de descarte', icon: 'descarte' },
    { nome: 'Álcool em gel / sanitizante de bancada', icon: 'borrifador' },
  ],
  higienizacao: [
    { icon: 'mao', item: 'Mãos', produto: 'Álcool gel', frequencia: 'Início, retorno ao posto, após descarte e troca de atividade' },
    { icon: 'bancada', item: 'Bancada de seleção/embalagem', produto: 'Limpeza e sanitização', frequencia: 'Início do turno, a cada lote e fim de turno' },
    { icon: 'maquina', item: 'Seladora', produto: 'Limpeza das superfícies de contato (equipamento desligado)', frequencia: 'Fim de turno' },
    { icon: 'borrifador', item: 'Ferramentas / utensílios de contato', produto: 'Sanitização', frequencia: 'Início do turno e quando necessário' },
    { icon: 'mop', item: 'Piso', produto: 'Conforme procedimento de limpeza', frequencia: 'Fim de turno' },
  ],
  riscos: [
    { icon: 'mao', titulo: 'CONTAMINAÇÃO', acao: 'Separar aprovado de reprovado; manter higiene de mãos/luvas.' },
    { icon: 'alerta', titulo: 'SELADORA', acao: 'Não introduzir as mãos sob a tampa durante o ciclo.' },
    { icon: 'agua', titulo: 'UMIDADE', acao: 'Não embalar produto com umidade residual acima de 10%.' },
    { icon: 'touca', titulo: 'EPI / MÃOS', acao: 'EPIs completos; higienizar as mãos na frequência definida.' },
  ],
  naoConformidades: [
    'Folha fora do critério FIT-PL-001 ou umidade > 10%: não embalar; segregar e registrar.',
    'Embalagem fora do pedido (peso/variedade/mix): corrigir antes de selar.',
    'Acúmulo acima de 15 unidades sem selar: interromper e encaminhar à selagem.',
    'Parâmetros de selagem incorretos ou vazamento pós-selagem: não liberar; corrigir e registrar.',
    'Operar sem EPIs ou sem higienização das mãos: interromper e corrigir.',
    'Desvio do procedimento: somente com autorização da Gerente Karla Maia.',
  ],
  registros: [
    'REG-EM-001 — Seleção/embalagem: hora, operador, produto, pedido/mix, quantidade, descarte.',
    'REG-EM-001 — Selagem: vácuo 2 s · temp. 1,8 s · aquecimento baixa · falhas · destino refrigerado.',
    'REG-EM-002 — Higienização por turno (mãos, bancadas, seladora, utensílios, piso).',
  ],
  treinamento: [
    'Treinamento obrigatório no POP-EM-001, FIT-EM-001 e FIT-EM-002 antes de operar sem supervisão.',
    'Incluir: critério FIT-PL-001, umidade ≤ 10%, pedido/mix, lote de 15, parâmetros de selagem, EPIs e higienização.',
    'Registrar na ficha TRE-EM-001.',
  ],
});

/** Bloco padrão de segurança alimentar aplicado a todas as FITs */
function foodSafetyAntes() {
  return [
    { icon: 'touca', texto: 'Conferir EPIs completos antes de iniciar: touca, luvas, avental e botas.' },
    { icon: 'mao', texto: 'Higienizar as mãos com álcool em gel: ao iniciar, ao retornar ao posto, após descarte, após tocar superfícies sujas e a cada troca de atividade.' },
    { icon: 'borrifador', texto: 'Confirmar sanitização de bancadas e ferramentas/utensílios de contato (início do turno e quando necessário).' },
  ];
}

function foodSafetyPontos() {
  return [
    'EPIs obrigatórios durante toda a operação.',
    'Higienização das mãos na frequência definida (início, retorno ao posto, após descarte e troca de atividade).',
    'Bancadas e ferramentas sanitizadas antes do uso e ao final do turno (ou a cada lote, quando aplicável).',
  ];
}

function mergeFoodSafety(fit) {
  if (!fit) return fit;
  const isHygieneFit = /higieniza/i.test(fit.titulo || '') || /^FIT-(PA|PM)-001$/.test(fit.codigo || '');
  const antesExtra = (isHygieneFit
    ? foodSafetyAntes().filter((i) => !/bancadas|ferramentas\/utensílios/i.test(i.texto || ''))
    : foodSafetyAntes());
  const existentes = fit.antesDeComecar || [];
  const filtrados = existentes.filter((item) => {
    const t = (item.texto || '').toLowerCase();
    return !(
      t.includes('epi') ||
      t.includes('touca, luvas') ||
      t.includes('colocar touca') ||
      t.includes('higienizar as mãos') ||
      t.includes('passar álcool') ||
      t.includes('passar alcool') ||
      t.includes('álcool em gel') ||
      t.includes('alcool em gel') ||
      t.includes('sanitiza')
    );
  });
  const pontosBase = Array.isArray(fit.pontosCriticos) ? fit.pontosCriticos : [];
  const pontosFS = foodSafetyPontos().filter((p) => !pontosBase.some((x) => x === p));
  const passos = Array.isArray(fit.passos) ? [...fit.passos] : [];
  const hasSanitPasso = passos.some((p) =>
    /sanitiz|higieniz|1\s*ml\s*\/\s*L|peracét|posto higien/i.test(p.texto || ''));
  const hasSanitAntes = existentes.some((item) =>
    /higieniz|sanitiz|FIT-P[AM]-001|1\s*ml\s*\/\s*L|peracét/i.test(item.texto || ''));
  if (!isHygieneFit && !hasSanitPasso && !hasSanitAntes) {
    passos.unshift({
      icon: 'borrifador',
      texto: 'Confirmar posto higienizado: bancadas e ferramentas de contato sanitizadas antes de iniciar.',
      critico: true,
    });
  }
  return {
    ...fit,
    antesDeComecar: [...antesExtra, ...filtrados],
    passos,
    pontosCriticos: [...pontosFS, ...pontosBase],
  };
}

function applyFoodSafetyToSector(sector) {
  if (!sector || !Array.isArray(sector.fits)) return;
  sector.fits = sector.fits.map(mergeFoodSafety);
}

applyFoodSafetyToSector(DEFAULT_DATA.preLavagem);
applyFoodSafetyToSector(DEFAULT_DATA.lavagem);
applyFoodSafetyToSector(DEFAULT_DATA.secagem);
applyFoodSafetyToSector(DEFAULT_DATA.embalagem);

function refreshSectorTrainingTopics(sector) {
  if (!sector?.pop || !Array.isArray(sector.fits)) return;
  sector.treinamentoTopics = [
    `${sector.pop.codigo} — ${sector.pop.titulo}`,
    ...sector.fits.map((f) => `${f.codigo} — ${f.titulo}`),
    'EPIs obrigatórios e conferência antes de iniciar',
    'Higienização das mãos (frequência definida)',
    'Sanitização de bancadas e ferramentas',
  ];
}

refreshSectorTrainingTopics(DEFAULT_DATA.lavagem);
refreshSectorTrainingTopics(DEFAULT_DATA.secagem);
refreshSectorTrainingTopics(DEFAULT_DATA.embalagem);

