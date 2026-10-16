/*
 * BASE DE PICTOGRAMAS
 * ------------------------------------------------------------------
 * O restante do sistema lê os pictogramas daqui
 * (requisito RNF04: base substituível sem alterar o código-fonte).
 *
 * Subpastas:
 *   pictogramas/forma/    -> forma farmacêutica
 *   pictogramas/via/      -> via de uso (oral, nasal...)
 *   pictogramas/horario/  -> período do dia
 *   pictogramas/cuidado/  -> cuidados (com comida, em jejum...)
 *
 * Observação sobre o grupo "horario":
 *   referencia -> hora (HH:MM) usada só para ordenar a receita; uma tomada
 *                 sem horário exato (ex.: só "Manhã") entra nessa posição.
 *   faixas     -> intervalos [início, fim] em que o período é escolhido
 *                 sozinho quando o médico digita um horário sem escolher o
 *                 período. Um período sem "faixas" nunca é escolhido sozinho.
 *                 Para atravessar a meia-noite, use dois intervalos.
 *   A receita começa às 05:00: horários da madrugada vão para o fim do dia.
 *
 * O campo "dose" de cada FORMA diz como a quantidade é pedida e impressa,
 * porque "quantidade" não faz sentido para toda forma (pomada, por exemplo).
 * Só a forma manda nisso: ao escolher a forma, o seletor se ajusta sozinho.
 *   tipo: 'medida'  -> conta na unidade da forma e imprime o número com a
 *                      unidade por extenso (ex.: 2 comprimidos, 5 mL).
 *   tipo: 'nenhuma' -> não pede quantidade; imprime o nome da forma e a
 *                      frase de "texto".
 * Campos de 'medida':
 *   titulo   -> cabeçalho do seletor
 *   unidade  -> ['singular', 'plural']
 *   min, max, passo, padrao -> limites e valor inicial do contador
 * Campos de 'nenhuma':
 *   nota  -> orientação mostrada ao profissional
 *   texto -> frase impressa na receita do paciente
 *
 * Observação sobre o grupo "via":
 *   nome  -> nome técnico, mostrado ao profissional (ex.: Oral)
 *   texto -> como a via é impressa na receita do paciente (ex.: Pela boca)
 * O campo "via" de cada FORMA (opcional) é a via já marcada ao escolher
 * aquela forma; o profissional pode trocar. Sem ele, a via não muda.
 */
window.PICTOGRAMAS = {
  forma: [
    { id: 'comprimido', nome: 'Comprimido', arquivo: 'pictogramas/forma/comprimido.png', via: 'oral',
      dose: { tipo: 'medida',   titulo: 'Quantos comprimidos por vez', unidade: ['comprimido', 'comprimidos'], min: 1, max: 6,  passo: 1, padrao: 1 } },
    { id: 'capsula',    nome: 'Cápsula',    arquivo: 'pictogramas/forma/capsula.png',    via: 'oral',
      dose: { tipo: 'medida',   titulo: 'Quantas cápsulas por vez',    unidade: ['cápsula', 'cápsulas'],       min: 1, max: 6,  passo: 1, padrao: 1 } },
    { id: 'gota',       nome: 'Gotas',      arquivo: 'pictogramas/forma/gota.png',
      dose: { tipo: 'medida',   titulo: 'Quantas gotas por vez',       unidade: ['gota', 'gotas'],             min: 1, max: 30, passo: 1, padrao: 3 } },
    { id: 'xarope',     nome: 'Xarope',     arquivo: 'pictogramas/forma/xarope.png',     via: 'oral',
      dose: { tipo: 'medida',   titulo: 'Quanto xarope por vez',       unidade: ['mL', 'mL'],                  min: 1, max: 30, passo: 1, padrao: 5 } },
    { id: 'bombinha',   nome: 'Bombinha',   arquivo: 'pictogramas/forma/bombinha.png',   via: 'inalatoria',
      dose: { tipo: 'medida',   titulo: 'Quantos puffs por vez',       unidade: ['puff', 'puffs'],             min: 1, max: 6,  passo: 1, padrao: 1 } },
    { id: 'spray',      nome: 'Spray',      arquivo: 'pictogramas/forma/spray.png',      via: 'nasal',
      dose: { tipo: 'medida',   titulo: 'Quantos jatos por vez',       unidade: ['jato', 'jatos'],             min: 1, max: 6,  passo: 1, padrao: 1 } },
    { id: 'sache',      nome: 'Sachê',      arquivo: 'pictogramas/forma/sache.png',      via: 'oral',
      dose: { tipo: 'medida',   titulo: 'Quantos sachês por vez',      unidade: ['sachê', 'sachês'],           min: 1, max: 4,  passo: 1, padrao: 1 } },
    { id: 'insulina',   nome: 'Insulina',   arquivo: 'pictogramas/forma/insulina.png',   via: 'subcutanea',
      dose: { tipo: 'medida',   titulo: 'Quantas unidades por vez',    unidade: ['unidade', 'unidades'],       min: 2, max: 60, passo: 2, padrao: 10 } },
    { id: 'pomada',     nome: 'Pomada',     arquivo: 'pictogramas/forma/pomada.png',     via: 'topica',
      dose: { tipo: 'nenhuma',  nota: 'A pomada não usa quantidade: a receita orienta a passar uma camada fina.', texto: 'Passar uma camada fina na pele' } }
  ],
  via: [
    { id: 'oral',       nome: 'Oral',       texto: 'Pela boca',               arquivo: 'pictogramas/via/oral.png' },
    { id: 'sublingual', nome: 'Sublingual', texto: 'Debaixo da língua',       arquivo: 'pictogramas/via/sublingual.png' },
    { id: 'inalatoria', nome: 'Inalatória', texto: 'Aspirar pela boca',       arquivo: 'pictogramas/via/inalatoria.png' },
    { id: 'nasal',      nome: 'Nasal',      texto: 'No nariz',                arquivo: 'pictogramas/via/nasal.png' },
    { id: 'ocular',     nome: 'Ocular',     texto: 'Nos olhos',               arquivo: 'pictogramas/via/ocular.png' },
    { id: 'otologica',  nome: 'Otológica',  texto: 'No ouvido',               arquivo: 'pictogramas/via/otologica.png' },
    { id: 'topica',     nome: 'Tópica',     texto: 'Na pele',                 arquivo: 'pictogramas/via/topica.png' },
    { id: 'subcutanea', nome: 'Subcutânea', texto: 'Aplicar debaixo da pele', arquivo: 'pictogramas/via/subcutanea.png' },
    { id: 'retal',      nome: 'Retal',      texto: 'Pelo ânus',               arquivo: 'pictogramas/via/retal.png' },
    { id: 'vaginal',    nome: 'Vaginal',    texto: 'Pela vagina',             arquivo: 'pictogramas/via/vaginal.png' }
  ],
  horario: [
    { id: 'manha',           nome: 'Manhã',            arquivo: 'pictogramas/horario/manha.png',           referencia: '08:00',
      faixas: [['05:00', '11:59']] },
    { id: 'meio-dia',        nome: 'Meio-dia',         arquivo: 'pictogramas/horario/meio-dia.png',        referencia: '12:00',
      faixas: [['12:00', '12:59']] },
    { id: 'tarde',           nome: 'Tarde',            arquivo: 'pictogramas/horario/tarde.png',           referencia: '15:00',
      faixas: [['13:00', '18:59']] },
    { id: 'noite',           nome: 'Noite',            arquivo: 'pictogramas/horario/noite.png',           referencia: '19:00',
      faixas: [['19:00', '23:59'], ['00:00', '04:59']] }
  ],
  cuidado: [
    { id: 'com-comida',   nome: 'Com comida',   arquivo: 'pictogramas/cuidado/com-comida.png' },
    { id: 'em-jejum',     nome: 'Em jejum',     arquivo: 'pictogramas/cuidado/em-jejum.png' },
    { id: 'com-agua',     nome: 'Com água',     arquivo: 'pictogramas/cuidado/com-agua.png' },
    { id: 'na-geladeira', nome: 'Na geladeira', arquivo: 'pictogramas/cuidado/na-geladeira.png' }
  ]
};
