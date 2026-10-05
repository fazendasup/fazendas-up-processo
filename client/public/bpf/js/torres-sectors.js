/**
 * Torres de Produção — hidroponia vertical (mudas → vegetativa → maturação → colheita)
 * View prefix: tr- · Códigos: POP-TR / FIT-TR / REG-TR
 * FITs: instrução operacional (“como fazer”), no estilo Plantio/Lavagem
 */
(function initTorresProducao() {
  if (typeof DEFAULT_DATA === 'undefined') return;

  DEFAULT_DATA.torresProducao = makeSectorSkeleton({
    codigo: 'POP-TR-001',
    titulo: 'Torres de Produção — Hidroponia Vertical',
    objetivo:
      'Padronizar o cultivo em torres (mudas → vegetativa → maturação) e a colheita sem lavagem, conforme as FIT-TR-001 a 007: medir EC/pH, corrigir solução (A+B ou água; KOH), aplicar H₂O₂ 200V, inspecionar raízes, transplantar entre fases e colher (perfil → desfolha → embalagem).',
    escopo: [
      'Abrange a sequência das FITs: FIT-TR-001 (medição EC/pH), FIT-TR-002 (correção EC), FIT-TR-003 (correção pH com KOH), FIT-TR-004 (H₂O₂ 200V a cada 2 dias), FIT-TR-005 (análise de raízes), FIT-TR-006 (transplantios), FIT-TR-007 (colheita sem lavagem).',
      'Fases e alvos: Mudas EC 0,8–1,1 · Vegetativa EC 1,3–1,5 · Maturação EC 1,5–1,7 · pH 5,5–6,5 em todas · 10–14 dias por fase (conforme cultivar).',
      'Recebe mudas do plantio (espuma/NFT alface) para a torre de mudas.',
      'Não abrange: pré-lavagem, lavagem LHM 350, enxágue, secagem. Colheita vai direto à embalagem após desfolha.',
    ],
    referencias: [
      'RDC nº 216/2004 e RDC nº 275/2002 (BPF).',
      'FIT-TR-001 a FIT-TR-007 (instrução operacional deste POP).',
      'Soluções nutritivas A e B (prontas) — dosagem igual na correção de EC.',
      'Hidróxido de potássio (KOH) — correção de pH (FIT-TR-003).',
      'Peróxido de hidrogênio 200V — FIT-TR-004.',
      'POP-PA-001 — origem das mudas (transplantio para torre).',
      'POP-EM-001 — destino após desfolha (embalagem; sem passar por lavagem).',
    ],
    entrada: 'Mudas (espuma/NFT) · solução nutritiva nas caixas',
    saida: 'Perfis colhidos → área de colheita → desfolha → embalagem (sem lavagem)',
    maquina: 'Torres verticais + caixas 310 L / 500 L + medidor EC/pH manual',
    controlesCriticos: [
      { valor: '0,8–1,1', label: 'EC Mudas', icon: 'agua' },
      { valor: '1,3–1,5', label: 'EC Vegetativa', icon: 'agua' },
      { valor: '1,5–1,7', label: 'EC Maturação', icon: 'agua' },
      { valor: '5,5–6,5', label: 'pH (todas as fases)', icon: 'quimico' },
      { valor: 'A cada 2 d', label: 'H₂O₂ 200V', icon: 'copoDosador' },
      { valor: 'Sem lavagem', label: 'Colheita → embalagem', icon: 'folhaBoa' },
    ],
    fluxo: [
      { titulo: 'Medir', sub: 'EC e pH', icon: 'inspecao' },
      { titulo: 'Corrigir', sub: 'A+B / água / KOH', icon: 'quimico' },
      { titulo: 'H₂O₂', sub: 'A cada 2 dias', icon: 'copoDosador' },
      { titulo: 'Raízes', sub: 'Inspecionar', icon: 'alerta' },
      { titulo: 'Transplantar', sub: '10–14 d/fase', icon: 'seta' },
      { titulo: 'Colher', sub: 'Sem lavagem', icon: 'folhaBoa' },
    ],
    processoDetalhado: [
      {
        icon: 'inspecao',
        texto: 'Medição (FIT-TR-001): calibrar/conferir o medidor manual; coletar amostra da caixa da torre; ler EC e pH; anotar fase e torre no REG-TR-001. Comparar com o alvo da fase.',
        critico: true,
      },
      {
        icon: 'agua',
        texto: 'Correção EC (FIT-TR-002): se EC baixo → adicionar soluções A e B em doses iguais; se EC alto → adicionar água limpa para diluir. Remexer, esperar estabilizar, medir de novo. Parar no alvo da fase.',
        critico: true,
      },
      {
        icon: 'quimico',
        texto: 'Correção pH (FIT-TR-003): se pH baixo → adicionar hidróxido de potássio (KOH) aos poucos; remexer; medir de novo até 5,5–6,5. Não jogar dose grande de uma vez.',
        critico: true,
      },
      {
        icon: 'copoDosador',
        texto: 'H₂O₂ 200V (FIT-TR-004): a cada 2 dias — caixa 310 L: 1 ml diluído em 1 L, depois misturar na caixa; caixa 500 L: 1,5 ml diluído em 1 L, depois misturar. Registrar no REG-TR-001.',
        critico: true,
      },
      {
        icon: 'alerta',
        texto: 'Raízes (FIT-TR-005): inspecionar cor, textura e odor. Escuras, meladas ou com cheiro ruim → isolar torre/perfil, chamar Gerente Karla Maia, registrar e seguir orientação (não transplantar/colher para venda sem liberação).',
        critico: true,
      },
      {
        icon: 'seta',
        texto: 'Transplantios (FIT-TR-006): mudas (plantio) → torre mudas → vegetativa → maturação. Cada fase 10–14 dias conforme cultivar. Manusear pela espuma/base; higienizar mãos e ferramentas.',
        critico: true,
      },
      {
        icon: 'folhaBoa',
        texto: 'Colheita (FIT-TR-007): retirar perfis da torre → levar à área de colheita → desfolhar para embalagem. NÃO enviar a pré-lavagem/lavagem. Embalagem recebe após a desfolha.',
        critico: true,
      },
    ],
    fits: [
      makeFitSkeleton({
        codigo: 'FIT-TR-001',
        titulo: 'Medição de EC e pH — Medidor manual',
        objetivo:
          'Medir EC e pH da solução de cada caixa/torre com o medidor manual e registrar, comparando com o alvo da fase.',
        antesDeComecar: [
          { icon: 'inspecao', texto: 'Ter o medidor EC/pH limpo, calibrado (ou conferido no início do turno) e com pilhas OK.' },
          { icon: 'copoDosador', texto: 'Copo/béquer limpo para amostra (não mergulhar o medidor sujo direto se o posto usar copo).' },
          { icon: 'etiqueta', texto: 'Saber qual torre/caixa e em qual fase está (Mudas / Vegetativa / Maturação).' },
          { icon: 'registro', texto: 'REG-TR-001 à mão para anotar data/hora, torre, fase, EC, pH e operador.' },
        ],
        passos: [
          { icon: 'mao', texto: 'Higienizar as mãos (álcool gel). Colocar EPI: touca, luvas, avental, botas.', critico: true },
          { icon: 'inspecao', texto: 'Identificar torre e caixa. Confirmar a fase na etiqueta/quadro do posto.', critico: true },
          { icon: 'agua', texto: 'Coletar amostra da solução (meio da caixa, sem mexer fundo sujo). Enxaguar o eletrodo com água limpa.', critico: true },
          { icon: 'inspecao', texto: 'Mergulhar o medidor na amostra. Esperar a leitura estabilizar. Anotar EC (mS/cm) e pH.', critico: true },
          { icon: 'check', texto: 'Comparar com o alvo: Mudas EC 0,8–1,1 · Vegetativa 1,3–1,5 · Maturação 1,5–1,7 · pH 5,5–6,5 em todas.', critico: true },
          { icon: 'seta', texto: 'Se EC fora → FIT-TR-002. Se pH fora → FIT-TR-003. Se ambos OK → seguir rotina (H₂O₂/raízes conforme dia).', critico: true },
          { icon: 'registro', texto: 'REG-TR-001: data/hora · torre/caixa · fase · EC · pH · operador.', critico: true },
        ],
        pontosCriticos: [
          'Medir antes de corrigir — não “chutar” dose.',
          'Alvo depende da fase (não usar EC de maturação em mudas).',
          'Enxaguar o eletrodo entre caixas.',
        ],
        cards: [
          { icon: 'agua', titulo: 'Mudas', sub: 'EC 0,8–1,1' },
          { icon: 'agua', titulo: 'Vegetativa', sub: 'EC 1,3–1,5' },
          { icon: 'agua', titulo: 'Maturação', sub: 'EC 1,5–1,7' },
          { icon: 'quimico', titulo: 'pH', sub: '5,5–6,5' },
        ],
        problemasComuns: [
          { problema: 'Leitura oscilando / não estabiliza', acao: 'Enxaguar eletrodo; esperar 10–20 s; se continuar, recalibrar ou trocar medidor; avisar gerente.' },
          { problema: 'Confundiu a fase da torre', acao: 'Conferir etiqueta; medir de novo; corrigir só com o alvo certo.' },
          { problema: 'Medidor sem calibração no turno', acao: 'Calibrar antes de liberar correções; anotar desvio.' },
        ],
        registrar: 'REG-TR-001: data/hora · torre/caixa · fase · EC · pH · operador',
      }),
      makeFitSkeleton({
        codigo: 'FIT-TR-002',
        titulo: 'Correção de EC — Soluções A e B ou água',
        objetivo:
          'Ajustar o EC da caixa ao alvo da fase: subir com A e B em doses iguais, ou baixar diluindo com água limpa.',
        antesDeComecar: [
          { icon: 'inspecao', texto: 'Ter a medição atual (FIT-TR-001) e o alvo da fase anotados.' },
          { icon: 'quimico', texto: 'Soluções A e B prontas, identificadas, com dosador/copo limpo.' },
          { icon: 'agua', texto: 'Água limpa disponível para diluir (se EC estiver alto).' },
        ],
        passos: [
          { icon: 'check', texto: 'Confirmar: EC baixo → subir com A+B. EC alto → baixar com água. Não misturar as duas estratégias no mesmo ajuste sem medir de novo.', critico: true },
          { icon: 'copoDosador', texto: 'Para SUBIR EC: medir volumes IGUAIS de A e de B (ex.: 50 ml A + 50 ml B). Nunca só A ou só B.', critico: true },
          { icon: 'agua', texto: 'Despejar A e B na caixa, em pontos diferentes se possível. Remexer bem a solução (bomba ligada ou mexer com utensílio limpo).', critico: true },
          { icon: 'agua', texto: 'Para BAIXAR EC: adicionar água limpa aos poucos. Remexer. Não encher além do nível seguro da caixa.', critico: true },
          { icon: 'timer', texto: 'Esperar alguns minutos a solução homogeneizar. Medir EC de novo (FIT-TR-001).', critico: true },
          { icon: 'alerta', texto: 'Se ainda fora do alvo: repetir dose pequena e medir. Parar quando atingir a faixa da fase. Não “passar do ponto”.', critico: true },
          { icon: 'registro', texto: 'REG-TR-001: correção = A+B ou água · volumes aproximados · EC antes/depois · operador.', critico: true },
        ],
        pontosCriticos: [
          'A e B sempre em dose igual.',
          'EC alto = água; EC baixo = A+B.',
          'Medir → corrigir pouco → medir de novo.',
        ],
        cards: [
          { icon: 'quimico', titulo: 'A + B', sub: 'Doses iguais' },
          { icon: 'agua', titulo: 'Água', sub: 'Para diluir' },
          { icon: 'inspecao', titulo: 'Medir', sub: 'Antes e depois' },
          { icon: 'check', titulo: 'Alvo', sub: 'Faixa da fase' },
        ],
        problemasComuns: [
          { problema: 'Colocou só solução A (ou só B)', acao: 'Parar; completar a dose faltante em igual volume; remexer; medir; anotar.' },
          { problema: 'Passou do EC alvo', acao: 'Diluir com água aos poucos; medir até a faixa; anotar desvio.' },
          { problema: 'Dose grande de uma vez sem medir', acao: 'Não repetir; daí em diante doses pequenas; chamar gerente se EC ficou extremo.' },
        ],
        registrar: 'REG-TR-001: correção A+B ou água · EC antes/depois · torre · fase',
      }),
      makeFitSkeleton({
        codigo: 'FIT-TR-003',
        titulo: 'Correção de pH — Hidróxido de potássio (KOH)',
        objetivo:
          'Elevar o pH da solução até a faixa 5,5–6,5 usando hidróxido de potássio, aos poucos, com nova medição a cada ajuste.',
        antesDeComecar: [
          { icon: 'quimico', texto: 'Hidróxido de potássio (KOH) identificado, com dosador. EPI completo (luvas obrigatórias).' },
          { icon: 'inspecao', texto: 'pH atual medido (FIT-TR-001). Alvo: 5,5–6,5.' },
          { icon: 'alerta', texto: 'Saber onde está o kit de emergência/água para enxágue em caso de contato com pele/olhos — avisar gerente se houver acidente.' },
        ],
        passos: [
          { icon: 'luvas', texto: 'Confirmar luvas e avental. Não manusear KOH sem EPI.', critico: true },
          { icon: 'inspecao', texto: 'Se pH já está entre 5,5 e 6,5: não adicionar KOH. Só registrar.', critico: true },
          { icon: 'copoDosador', texto: 'Se pH < 5,5: preparar dose pequena de KOH (conforme padrão do posto — começar baixo). Nunca despejar o frasco direto sem dosar.', critico: true },
          { icon: 'agua', texto: 'Adicionar o KOH na caixa. Remexer bem. Esperar homogeneizar.', critico: true },
          { icon: 'inspecao', texto: 'Medir pH de novo. Se ainda baixo: repetir dose pequena. Parar em 5,5–6,5.', critico: true },
          { icon: 'alerta', texto: 'Se pH passou de 6,5: parar KOH; avisar Gerente Karla Maia; não “corrigir no olho” com outro produto sem ordem.', critico: true },
          { icon: 'registro', texto: 'REG-TR-001: correção KOH · pH antes/depois · torre · operador.', critico: true },
        ],
        pontosCriticos: [
          'Só KOH para subir pH neste POP.',
          'Dose pequena → mexer → medir.',
          'Faixa final: 5,5–6,5.',
        ],
        cards: [
          { icon: 'quimico', titulo: 'KOH', sub: 'Hidróxido' },
          { icon: 'copoDosador', titulo: 'Pouco', sub: 'Dose a dose' },
          { icon: 'inspecao', titulo: 'Medir', sub: 'A cada ajuste' },
          { icon: 'check', titulo: '5,5–6,5', sub: 'Parar na faixa' },
        ],
        problemasComuns: [
          { problema: 'pH subiu demais (> 6,5)', acao: 'Parar; não adicionar mais KOH; chamar gerente; anotar.' },
          { problema: 'Contato de KOH na pele', acao: 'Enxaguar com água em abundância; avisar gerente; registrar ocorrência.' },
          { problema: 'Adicionou KOH sem medir antes', acao: 'Medir agora; ajustar só se necessário; reforçar ordem medir → corrigir.' },
        ],
        registrar: 'REG-TR-001: KOH · pH antes/depois · torre · fase · operador',
      }),
      makeFitSkeleton({
        codigo: 'FIT-TR-004',
        titulo: 'Peróxido de hidrogênio 200V — Aplicação a cada 2 dias',
        objetivo:
          'Aplicar H₂O₂ 200V diluído na caixa da torre a cada 2 dias, na dose certa por volume (310 L ou 500 L).',
        antesDeComecar: [
          { icon: 'timer', texto: 'Confirmar se é dia de H₂O₂ (a cada 2 dias). Se aplicou ontem, não repetir hoje.' },
          { icon: 'copoDosador', texto: 'Ter H₂O₂ 200V, água limpa, copo dosador e recipiente de 1 L para pré-diluição.' },
          { icon: 'etiqueta', texto: 'Saber se a caixa é 310 L ou 500 L (dose muda).' },
        ],
        passos: [
          { icon: 'inspecao', texto: 'Identificar volume da caixa: 310 L ou 500 L.', critico: true },
          { icon: 'copoDosador', texto: 'Caixa 310 L: medir 1 ml de H₂O₂ 200V. Caixa 500 L: medir 1,5 ml. Não usar dose “aproximada no olho”.', critico: true },
          { icon: 'agua', texto: 'Diluir esse volume em 1 L de água limpa no recipiente. Misturar.', critico: true },
          { icon: 'agua', texto: 'Despejar os 1 L já diluídos na caixa. Remexer / deixar a bomba circular para misturar.', critico: true },
          { icon: 'alerta', texto: 'Não aplicar H₂O₂ concentrado direto na caixa sem a diluição em 1 L. Não dobrar a dose “por precaução”.', critico: true },
          { icon: 'registro', texto: 'REG-TR-001: H₂O₂ = sim · volume caixa · dose (1 ou 1,5 ml) · data/hora · operador.', critico: true },
        ],
        pontosCriticos: [
          'Frequência: a cada 2 dias.',
          '310 L → 1 ml em 1 L · 500 L → 1,5 ml em 1 L.',
          'Sempre pré-diluir, depois misturar na caixa.',
        ],
        cards: [
          { icon: 'timer', titulo: 'A cada 2 d', sub: 'Não diário' },
          { icon: 'copoDosador', titulo: '310 L', sub: '1 ml → 1 L' },
          { icon: 'copoDosador', titulo: '500 L', sub: '1,5 ml → 1 L' },
          { icon: 'agua', titulo: 'Misturar', sub: 'Na caixa' },
        ],
        problemasComuns: [
          { problema: 'Não sabe se já aplicou ontem', acao: 'Olhar REG-TR-001; se houver dúvida, perguntar à gerente antes de dosear.' },
          { problema: 'Usou dose de 500 L numa caixa 310 L', acao: 'Anotar desvio; avisar gerente; na próxima seguir a tabela.' },
          { problema: 'Jogou concentrado sem diluir em 1 L', acao: 'Parar a prática; diluir sempre primeiro; registrar ocorrência.' },
        ],
        registrar: 'REG-TR-001: H₂O₂ sim/não · 310/500 L · dose · torre · operador',
      }),
      makeFitSkeleton({
        codigo: 'FIT-TR-005',
        titulo: 'Análise de raízes — Inspeção e decisão',
        objetivo:
          'Inspecionar raízes nos perfis/torres, decidir se estão OK ou reprovadas, e acionar isolamento e a gerente quando houver sinal de problema.',
        antesDeComecar: [
          { icon: 'luvas', texto: 'Luvas limpas. Luz suficiente para ver as raízes no perfil/caixa.' },
          { icon: 'registro', texto: 'REG-TR-001 pronto para marcar “raízes OK?” e observações.' },
          { icon: 'alerta', texto: 'Critério de rejeição: raízes escuras, meladas (viscosas) ou com mau cheiro.' },
        ],
        passos: [
          { icon: 'inspecao', texto: 'Escolher perfis representativos da torre (ou todos, se o posto exigir no turno). Puxar/abrir com cuidado para ver o sistema radicular sem quebrar a planta.', critico: true },
          { icon: 'folhaBoa', texto: 'OK: raízes claras/creme ou brancas, firmes, sem odor desagradável. Marcar “raízes OK = sim” no REG-TR-001.', critico: true },
          { icon: 'folhaRuim', texto: 'REPROVAR se: escuras (marrom/preto), meladas/viscosas ao toque, ou cheiro ruim (podre/azedo).', critico: true },
          { icon: 'descarte', texto: 'Se reprovar: isolar a torre ou o perfil (etiquetar “NÃO USAR / AGUARDAR”). Não transplantar nem colher para venda.', critico: true },
          { icon: 'equipe', texto: 'Chamar na hora a Gerente Karla Maia. Não descartar lote inteiro sem orientação dela (salvo risco imediato de contaminação no posto).', critico: true },
          { icon: 'borrifador', texto: 'Trocar luvas após manusear raiz suspeita. Higienizar mãos com álcool gel. Sanitizar utensílio usado (ác. peracético 1 ml/L se for ferramenta de contato).', critico: true },
          { icon: 'registro', texto: 'REG-TR-001: raízes OK? · torre · o que viu · quem avisou · hora.', critico: true },
        ],
        pontosCriticos: [
          'Escura + melada + mau cheiro = rejeitar/isolar.',
          'Avisar Karla Maia antes de liberar de novo.',
          'Registrar sempre — inclusive quando OK.',
        ],
        cards: [
          { icon: 'folhaBoa', titulo: 'OK', sub: 'Claras / firmes' },
          { icon: 'folhaRuim', titulo: 'Reprovar', sub: 'Escura / melada' },
          { icon: 'descarte', titulo: 'Isolar', sub: 'Etiquetar' },
          { icon: 'equipe', titulo: 'Avisar', sub: 'Karla Maia' },
        ],
        problemasComuns: [
          { problema: 'Só uma planta ruim na torre', acao: 'Isolar o perfil; inspecionar vizinhos; avisar gerente; registrar.' },
          { problema: 'Cheiro ruim na caixa mas raiz ainda clara', acao: 'Isolar preventivamente; medir EC/pH; avisar gerente; reforçar H₂O₂ se estiver no dia.' },
          { problema: 'Operador descartou sem avisar', acao: 'Parar; registrar NC; orientar: isolar + chamar gerente.' },
        ],
        registrar: 'REG-TR-001: raízes OK? · torre · obs · aviso à gerente ☐',
      }),
      makeFitSkeleton({
        codigo: 'FIT-TR-006',
        titulo: 'Transplantios — Mudas → Vegetativa → Maturação',
        objetivo:
          'Transplantar com segurança entre fases (e da entrada do plantio para a torre de mudas), respeitando 10–14 dias por fase conforme o cultivar.',
        antesDeComecar: [
          { icon: 'folhaBoa', texto: 'Confirmar origem: mudas do plantio (espuma/NFT) ou plantas já na torre na fase correta.' },
          { icon: 'timer', texto: 'Conferir tempo na fase atual (10–14 dias / cultivar). Não adiantar nem atrasar sem ordem.' },
          { icon: 'borrifador', texto: 'Posto e ferramentas de contato higienizados (ác. peracético 1 ml/L quando aplicável). Mãos com álcool gel.' },
          { icon: 'agua', texto: 'Torre de destino com solução no alvo da nova fase (medir EC/pH — FIT-TR-001).' },
        ],
        passos: [
          { icon: 'inspecao', texto: 'Inspecionar muda/planta: folhas OK, raízes OK (FIT-TR-005). Reprovada → não transplantar.', critico: true },
          { icon: 'mao', texto: 'Segurar pela espuma ou pela base do caule — não puxar pelas folhas. Evitar esmagar raiz.', critico: true },
          { icon: 'seta', texto: 'Retirar do perfil/canal de origem com cuidado. Se vier de NFT/plantio: manter a espuma com a muda.', critico: true },
          { icon: 'folhaBoa', texto: 'Encaixar no perfil/orifício da torre de destino (Mudas → Vegetativa → Maturação). Planta ereta, espuma/base assentada, raiz em contato com a solução.', critico: true },
          { icon: 'check', texto: 'Completar a densidade do perfil conforme padrão do posto (sem forçar plantas tortas ou sobrepostas). Etiquetar fase e data do transplantio.', critico: true },
          { icon: 'timer', texto: 'Anotar início da nova fase. Permanência típica: 10–14 dias (cultivar). Próximo movimento só no prazo ou com ordem da gerente.', critico: true },
          { icon: 'registro', texto: 'REG-TR-001 / obs: origem → destino · qtd · cultivar · data · operador.', critico: true },
        ],
        pontosCriticos: [
          'Ordem: plantio → mudas → vegetativa → maturação.',
          '10–14 dias por fase (cultivar).',
          'Não transplantar com raiz reprovada.',
          'Espuma permanece com a muda na entrada.',
        ],
        cards: [
          { icon: 'folhaBoa', titulo: 'Mudas', sub: 'EC 0,8–1,1' },
          { icon: 'seta', titulo: 'Vegetativa', sub: 'EC 1,3–1,5' },
          { icon: 'seta', titulo: 'Maturação', sub: 'EC 1,5–1,7' },
          { icon: 'timer', titulo: '10–14 d', sub: 'Por fase' },
        ],
        problemasComuns: [
          { problema: 'Planta quebrou ao puxar pela folha', acao: 'Descartar se inviável; daí em diante segurar pela espuma/base; anotar.' },
          { problema: 'Destino com EC/pH fora do alvo', acao: 'Corrigir solução primeiro (FIT-TR-002/003); só então transplantar.' },
          { problema: 'Passou de 14 dias sem mover', acao: 'Avaliar ponto; avisar gerente; transplantar ou colher conforme orientação.' },
        ],
        registrar: 'REG-TR-001: transplantio · origem/destino · qtd · data · operador',
      }),
      makeFitSkeleton({
        codigo: 'FIT-TR-007',
        titulo: 'Colheita — Perfil → desfolha → embalagem (sem lavagem)',
        objetivo:
          'Colher retirando perfis da torre, levar à área de colheita, desfolhar e enviar à embalagem — sem passar por pré-lavagem nem lavagem.',
        antesDeComecar: [
          { icon: 'folhaBoa', texto: 'Plantas no ponto de colheita (fase maturação / critério do cultivar).' },
          { icon: 'inspecao', texto: 'Raízes e folhas OK. Lote com problema → não colher para venda (FIT-TR-005).' },
          { icon: 'seta', texto: 'Saber o caminho: torre → área de colheita → desfolha → embalagem. Não ir para MLM/LHM.' },
          { icon: 'luvas', texto: 'EPI completo. Utensílios de desfolha limpos/sanitizados.' },
        ],
        passos: [
          { icon: 'mao', texto: 'Higienizar mãos. Confirmar EPI (touca, luvas, avental, botas).', critico: true },
          { icon: 'seta', texto: 'Retirar o perfil da torre com as duas mãos, sem derrubar solução no piso. Apoiar em suporte limpo.', critico: true },
          { icon: 'bancada', texto: 'Levar o perfil à área de colheita identificada. Não estacionar em área de lavagem.', critico: true },
          { icon: 'folhaBoa', texto: 'Desfolhar conforme padrão do produto (remover folhas ruins/excesso). Separar aprovado de descarte.', critico: true },
          { icon: 'alerta', texto: 'NÃO enviar o produto à pré-lavagem nem à lavagem (LHM). Estas plantas de torre vão diretas à embalagem após a desfolha.', critico: true },
          { icon: 'etiqueta', texto: 'Encaminhar o aprovado à embalagem (POP-EM-001) com identificação de lote/origem torre.', critico: true },
          { icon: 'registro', texto: 'REG-TR-001: colheita · torre · qtd/perfis · destino embalagem · operador · sem lavagem ☐', critico: true },
        ],
        pontosCriticos: [
          'Fluxo: perfil → área colheita → desfolha → embalagem.',
          'SEM lavagem / pré-lavagem.',
          'Só colhe lote com qualidade OK.',
        ],
        cards: [
          { icon: 'seta', titulo: 'Perfil', sub: 'Sair da torre' },
          { icon: 'bancada', titulo: 'Colheita', sub: 'Área certa' },
          { icon: 'folhaBoa', titulo: 'Desfolhar', sub: 'Aprovar/reprovar' },
          { icon: 'xmark', titulo: 'Sem lavagem', sub: '→ Embalagem' },
        ],
        problemasComuns: [
          { problema: 'Operador levou para a lavagem por hábito', acao: 'Recuperar se ainda não entrou na máquina; orientar: torre NÃO lava; anotar NC.' },
          { problema: 'Perfil tombou e produto no chão', acao: 'Não embalar o que caiu; descartar conforme regra; secar piso; registrar.' },
          { problema: 'Folhas ruins misturadas no aprovado', acao: 'Revisar na desfolha; separar; só então enviar à embalagem.' },
        ],
        registrar: 'REG-TR-001: colheita · torre · destino embalagem · sem lavagem ☐ · operador',
      }),
    ],
    resumoExtra: [
      { item: 'EC por fase', valor: 'Mudas 0,8–1,1 · Veg. 1,3–1,5 · Mat. 1,5–1,7' },
      { item: 'pH', valor: '5,5–6,5 (todas as fases)' },
      { item: 'H₂O₂ 200V', valor: 'A cada 2 d · 310 L: 1 ml/1 L · 500 L: 1,5 ml/1 L' },
      { item: 'Colheita', valor: 'Desfolha → embalagem (sem lavagem)' },
    ],
  });

  Object.assign(DEFAULT_DATA.torresProducao, {
    pop: {
      ...DEFAULT_DATA.torresProducao.pop,
      produtos: 'Alface e hortaliças de torre (conforme calendário)',
      capacidade: 'Conforme ocupação das torres / demanda',
      origem: 'Plantio alface (mudas em espuma/NFT) → torre mudas',
      equipe: '1 operador por posto / turno',
    },
    definicoes: [
      { termo: 'Torre de produção', definicao: 'Sistema vertical com perfis e caixa de solução (310 L ou 500 L) nas fases mudas, vegetativa e maturação.' },
      { termo: 'EC', definicao: 'Condutividade elétrica da solução (mS/cm) — alvo muda conforme a fase (FIT-TR-001/002).' },
      { termo: 'Soluções A e B', definicao: 'Soluções nutritivas prontas usadas em doses iguais para subir o EC (FIT-TR-002).' },
      { termo: 'KOH', definicao: 'Hidróxido de potássio — usado para elevar o pH até 5,5–6,5 (FIT-TR-003).' },
      { termo: 'H₂O₂ 200V', definicao: 'Peróxido de hidrogênio 200 volumes — aplicar a cada 2 dias após diluição (FIT-TR-004).' },
      { termo: 'Colheita sem lavagem', definicao: 'Produto de torre vai à embalagem após desfolha, sem passar por pré-lavagem/lavagem (FIT-TR-007).' },
    ],
    folhas: {
      aprovado: [
        'Folhas com cor e turgidez adequadas à fase',
        'Raízes claras/firmes, sem odor ruim',
        'EC e pH na faixa da fase',
        'Perfil íntegro, planta bem assentada',
      ],
      reprovado: [
        'Raízes escuras, meladas ou com mau cheiro',
        'Murcha, amarelo severo ou podridão',
        'EC/pH fora do alvo sem correção registrada',
        'Planta quebrada ou contaminada (chão)',
      ],
    },
    utensilios: [
      { nome: 'EPIs (touca, luvas, avental, botas)', icon: 'touca' },
      { nome: 'Medidor EC/pH manual', icon: 'inspecao' },
      { nome: 'Soluções A e B + dosador', icon: 'quimico' },
      { nome: 'Hidróxido de potássio (KOH)', icon: 'quimico' },
      { nome: 'H₂O₂ 200V + copo 1 L', icon: 'copoDosador' },
      { nome: 'Torres / perfis / caixas 310–500 L', icon: 'bancada' },
      { nome: 'Borrifador + ác. peracético 1 ml/L', icon: 'hipoclorito' },
      { nome: 'Álcool gel', icon: 'mao' },
      { nome: 'Etiquetas de fase/lote', icon: 'etiqueta' },
    ],
    higienizacao: [
      { icon: 'mao', item: 'Mãos', produto: 'Álcool gel', frequencia: 'Início, retorno, após descarte, após raiz suspeita e troca de atividade' },
      { icon: 'bancada', item: 'Bancada / área de colheita / ferramentas', produto: 'Ácido peracético 1 ml/L (borrifador)', frequencia: 'Início do turno e após lote com problema' },
      { icon: 'inspecao', item: 'Medidor EC/pH (eletrodo)', produto: 'Água limpa (enxágue) + guarda conforme manual', frequencia: 'Entre caixas e fim de turno' },
      { icon: 'copoDosador', item: 'Dosadores / copos de correção', produto: 'Água + ác. peracético 1 ml/L se contato com produto', frequencia: 'Fim de turno / troca de produto' },
      { icon: 'mop', item: 'Piso', produto: 'Conforme procedimento', frequencia: 'Fim de turno e após derrame' },
    ],
    riscos: [
      { icon: 'agua', titulo: 'EC/pH', acao: 'Medir → corrigir pouco (A+B iguais / água / KOH) → medir de novo.' },
      { icon: 'copoDosador', titulo: 'H₂O₂', acao: 'A cada 2 dias; dose por volume da caixa; sempre diluir em 1 L antes.' },
      { icon: 'folhaRuim', titulo: 'RAÍZES', acao: 'Escura/melada/cheiro ruim → isolar, avisar Karla Maia, registrar.' },
      { icon: 'xmark', titulo: 'LAVAGEM', acao: 'Colheita de torre NÃO vai à lavagem — desfolha → embalagem.' },
    ],
    naoConformidades: [
      'Operar sem medição de EC/pH quando for corrigir: parar; medir; registrar (FIT-TR-001).',
      'Corrigir EC com A e B em doses desiguais: completar a dose faltante; anotar (FIT-TR-002).',
      'Aplicar KOH em dose única grande sem remarcar pH: interromper; medir; chamar gerente se > 6,5 (FIT-TR-003).',
      'H₂O₂ fora do dia (não a cada 2 d) ou dose errada 310/500 L: anotar NC; corrigir rotina (FIT-TR-004).',
      'Raiz reprovada sem isolamento/aviso à gerente: isolar agora; avisar Karla Maia; registrar (FIT-TR-005).',
      'Transplantar com raiz ruim ou fora do prazo 10–14 d sem ordem: parar; orientar (FIT-TR-006).',
      'Enviar produto de torre à pré-lavagem/lavagem: NC grave — fluxo correto é desfolha → embalagem (FIT-TR-007).',
      'Sem EPI ou sem higienizar as mãos: interromper e corrigir.',
      'Desvio do procedimento: só com autorização da Gerente Karla Maia.',
    ],
    registros: [
      'REG-TR-001 — Diário torres: data/hora, torre/caixa, fase, EC, pH, correção (A+B / água / KOH), H₂O₂ (sim/não), raízes OK?, operador, obs.',
      'REG-TR-002 — Higienização por turno (mãos/EPI, bancadas, equipamentos, piso).',
    ],
    treinamento: [
      'Treinamento obrigatório no POP-TR-001 e FIT-TR-001 a 007 antes de operar sem supervisão.',
      'Praticar: medir EC/pH → corrigir (A+B iguais ou água; KOH) → H₂O₂ a cada 2 d → inspecionar raízes → transplantar → colher sem lavagem.',
      'Registrar na ficha TRE-TR-001.',
    ],
  });

  applyFoodSafetyToSector(DEFAULT_DATA.torresProducao);
  refreshSectorTrainingTopics(DEFAULT_DATA.torresProducao);
})();
