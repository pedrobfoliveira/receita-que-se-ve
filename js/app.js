/* =====================================================================
   Receita que se vê | protótipo de teste do módulo do profissional

   Tudo fica guardado em sessionStorage: sobrevive a um recarregamento
   da página, mas é apagado quando a aba é fechada. Nenhum dado é
   enviado a servidor. O questionário é enviado aos testadores por
   mensagem, fora do sistema.
   ===================================================================== */
(function () {
  'use strict';

  const CFG = window.CONFIG || {};
  const PIC = window.PICTOGRAMAS || { forma: [], via: [], horario: [], cuidado: [] };

  /* ------------------------------------------------------------------
     Armazenamento da sessão
     ------------------------------------------------------------------ */
  const PREFIXO = 'rqsv_';
  const guardado = {
    ler(chave, padrao) {
      try {
        const v = sessionStorage.getItem(PREFIXO + chave);
        return v === null ? padrao : JSON.parse(v);
      } catch (e) { return padrao; }
    },
    gravar(chave, valor) {
      try { sessionStorage.setItem(PREFIXO + chave, JSON.stringify(valor)); } catch (e) { /* segue sem persistir */ }
    }
  };

  /* ------------------------------------------------------------------
     Utilitários
     ------------------------------------------------------------------ */
  const $ = (id) => document.getElementById(id);
  const digitos = (s) => String(s || '').replace(/\D/g, '');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const novoId = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const copia = (obj) => JSON.parse(JSON.stringify(obj));
  const fmtCPF = (d) => (d && d.length === 11) ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : (d || 'não informado');
  const fmtCNS = (d) => (d && d.length === 15) ? `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)} ${d.slice(11)}` : (d || 'não informado');
  const fmtData = (iso) => { if (!iso) return ''; const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; };
  const nomePicto = (grupo, id) => ((PIC[grupo] || []).find((p) => p.id === id) || {}).nome || id;
  // Data de hoje (AAAA-MM-DD) no fuso do computador: limite dos calendários.
  const hoje = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };

  function picto(grupo, id, classe) {
    const p = (PIC[grupo] || []).find((x) => x.id === id);
    if (!p) return '';
    return `<img class="picto ${classe || ''}" src="${esc(p.arquivo)}" alt="${esc(p.nome)}" data-nome="${esc(p.nome)}" onerror="window.__pictoFalhou(this)">`;
  }
  // Se o arquivo do pictograma não existir, mostra o nome no lugar.
  window.__pictoFalhou = function (img) {
    const s = document.createElement('span');
    s.className = img.className + ' picto-falha';
    s.textContent = img.dataset.nome || '?';
    img.replaceWith(s);
  };

  /* ------------------------------------------------------------------
     Dose: cada forma diz, em pictogramas.js, como a quantidade é pedida
     e impressa. Formas como a pomada não usam quantidade nenhuma.
     ------------------------------------------------------------------ */
  const DOSE_PADRAO = { tipo: 'medida', titulo: 'Quantidade por vez', unidade: ['unidade', 'unidades'], min: 1, max: 6, passo: 1, padrao: 1 };

  function dose(formaId) {
    const f = (PIC.forma || []).find((x) => x.id === formaId);
    const base = Object.assign({}, DOSE_PADRAO, (f && f.dose) || {});
    if (base.tipo === 'nenhuma') return base;
    base.passo = Math.max(1, base.passo);
    base.padrao = limitarDose(base.padrao, base);
    return base;
  }

  // Mantém o valor dentro dos limites e em cima do passo da forma escolhida.
  function limitarDose(valor, d) {
    const n = Number(valor);
    if (!isFinite(n)) return d.min;
    const passos = Math.round((n - d.min) / d.passo);
    return Math.min(d.max, Math.max(d.min, d.min + passos * d.passo));
  }

  // Via de uso: a forma pode sugerir uma (campo "via" em pictogramas.js).
  // Na receita do paciente sai o "texto" da via ("Pela boca"), não o nome técnico.
  // Itens salvos antes desta versão não têm via e não mostram nada.
  const viaDaForma = (formaId) => ((PIC.forma || []).find((x) => x.id === formaId) || {}).via || null;
  function textoVia(item) {
    const v = (PIC.via || []).find((x) => x.id === item.via);
    return v ? (v.texto || v.nome) : '';
  }

  // Duração do tratamento: { tipo: 'continuo' } ou { tipo: 'dias', dias: 7 }.
  // Itens salvos antes desta versão não têm duração e não mostram nada.
  function textoDuracao(item) {
    const d = item.duracao;
    if (!d) return '';
    if (d.tipo === 'continuo') return 'Uso contínuo';
    return `Por ${d.dias} ${d.dias === 1 ? 'dia' : 'dias'}`;
  }

  // Texto da dose: "2 comprimidos", "5 mL" ou a frase das formas sem quantidade.
  function textoDose(item) {
    const d = dose(item.forma);
    if (d.tipo === 'nenhuma') return d.texto || '';
    const u = d.unidade || DOSE_PADRAO.unidade;
    return item.qtd + ' ' + (item.qtd === 1 ? u[0] : u[1]);
  }

  /* ------------------------------------------------------------------
     Tomadas: cada horário de um medicamento é { periodo, hora }.
     periodo = id do pictograma do dia (sempre preenchido na receita);
     hora = 'HH:MM' ou '' quando só o período foi escolhido.
     ------------------------------------------------------------------ */
  const minutos = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + m; };
  const chaveTomada = (t) => (t.periodo || '') + '|' + (t.hora || '');

  // Campo de horário em 24 horas. O <input type="time"> do navegador segue o
  // idioma do sistema e pode exigir AM/PM, por isso o campo é texto com máscara.
  // Devolve o texto formatado e a hora válida ('HH:MM') ou '' se incompleta.
  function mascaraHora(texto) {
    let d = String(texto).replace(/\D/g, '').slice(0, 4);
    if (/^[3-9]/.test(d)) d = ('0' + d).slice(0, 4); // "7" vira "07"
    const formatado = d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d;
    const valida = d.length === 4 && Number(d.slice(0, 2)) < 24 && Number(d.slice(2)) < 60;
    return { formatado, hora: valida ? formatado : '' };
  }

  // Período escolhido sozinho a partir do horário, pelas "faixas" da base.
  function periodoDaHora(hhmm) {
    if (!hhmm) return null;
    const m = minutos(hhmm);
    const h = PIC.horario.find((p) => (p.faixas || []).some(([ini, fim]) => m >= minutos(ini) && m <= minutos(fim)));
    return h ? h.id : null;
  }

  // Posição na receita: o horário exato, ou a referência do período.
  // O dia da receita começa às 05:00, então a madrugada vai para o fim.
  const INICIO_DO_DIA = 5 * 60;
  function ordemTomada(t) {
    let m;
    if (t.hora) m = minutos(t.hora);
    else {
      const i = PIC.horario.findIndex((h) => h.id === t.periodo);
      const h = PIC.horario[i];
      m = (h && h.referencia) ? minutos(h.referencia) : INICIO_DO_DIA + (Math.max(0, i) * 18 * 60) / Math.max(1, PIC.horario.length);
    }
    return (m - INICIO_DO_DIA + 24 * 60) % (24 * 60);
  }
  const compararTomadas = (a, b) => ordemTomada(a) - ordemTomada(b);

  // "manhã às 08:00" ou "manhã"
  function descreverTomada(t) {
    const partes = [];
    if (t.periodo) partes.push(nomePicto('horario', t.periodo).toLowerCase());
    if (t.hora) partes.push('às ' + t.hora);
    return partes.join(' ');
  }

  // Receitas e modelos salvos antes desta versão guardavam só o id do período,
  // ou podiam ter horário exato sem período: agora todo horário tem período.
  function normalizarItens(itens) {
    (itens || []).forEach((m) => {
      m.horarios = (m.horarios || [])
        .map((t) => (typeof t === 'string' ? { periodo: t, hora: '' } : t))
        .map((t) => (t.periodo ? t : { periodo: periodoDaHora(t.hora), hora: t.hora }))
        .filter((t) => t.periodo);
    });
    return itens;
  }

  /* ------------------------------------------------------------------
     Estado
     ------------------------------------------------------------------ */
  const receitaVazia = () => ({ unidade: '', data: '', pacienteId: null, itens: [], observacoes: '' });

  const st = {
    prof: guardado.ler('prof', null),
    logado: guardado.ler('logado', false),
    sessao: guardado.ler('sessao', null),
    pacientes: guardado.ler('pacientes', []),
    modelos: guardado.ler('modelos', []),
    metricas: guardado.ler('metricas', []),
    receita: guardado.ler('receita', receitaVazia()),
    tarefa: guardado.ler('tarefa', null),        // receita em andamento, sendo cronometrada
    aguardando: guardado.ler('aguardando', false), // receita concluída, esperando decisão
    finalizado: guardado.ler('finalizado', false),
    roteiroVisto: guardado.ler('roteiroVisto', false)
  };
  if (!st.sessao) { st.sessao = novoId(); guardado.gravar('sessao', st.sessao); }
  normalizarItens(st.receita.itens);
  st.modelos.forEach((m) => normalizarItens(m.itens));

  const salvar = (...chaves) => chaves.forEach((k) => guardado.gravar(k, st[k]));

  // seleção do medicamento sendo montado (não precisa persistir)
  const selecaoVazia = () => {
    const forma = (PIC.forma[0] || {}).id || null;
    return { forma, via: viaDaForma(forma), qtd: dose(forma).padrao, horarios: [], cuidados: [], duracao: null, dias: '' };
  };
  let sel = selecaoVazia();
  let indiceEdicao = null;

  /* ------------------------------------------------------------------
     Navegação entre telas
     ------------------------------------------------------------------ */
  const TELAS = ['tela-cadastro', 'tela-login', 'tela-sistema', 'tela-final'];
  const mostrar = (id) => TELAS.forEach((t) => { $(t).hidden = (t !== id); });

  function rotear() {
    if (st.finalizado) return mostrar('tela-final');
    if (!st.prof) return mostrar('tela-cadastro');
    if (!st.logado) return mostrar('tela-login');
    entrarNoSistema();
  }

  /* ------------------------------------------------------------------
     Cadastro e login (simulados)
     O profissional é identificado pelo registro: conselho + número + UF.
     ------------------------------------------------------------------ */
  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  document.querySelectorAll('.sel-uf').forEach((s) => {
    s.innerHTML = '<option value="">--</option>' + UFS.map((uf) => `<option value="${uf}">${uf}</option>`).join('');
  });

  const mesmoRegistro = (a, b) => a.conselho === b.conselho && a.numero === b.numero && a.uf === b.uf;

  $('form-cadastro').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const nome = f.nome.value.trim();
    const conselho = f.conselho.value;
    const numero = digitos(f.numero.value);
    const uf = f.uf.value;
    const erro = $('erro-cadastro');

    if (!nome || !numero || !f.senha.value) { erro.textContent = 'Preencha nome, número do registro e senha.'; return; }
    if (!uf) { erro.textContent = 'Escolha a UF do registro.'; return; }
    if (f.senha.value !== f.senha2.value) { erro.textContent = 'As senhas digitadas não são iguais.'; return; }

    st.prof = { nome, conselho, numero, uf, senha: f.senha.value };
    salvar('prof');
    erro.textContent = '';
    f.reset();
    mostrar('tela-login');
    const login = $('form-login');
    login.conselho.value = conselho;
    login.numero.focus();
  });

  $('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const registro = { conselho: f.conselho.value, numero: digitos(f.numero.value), uf: f.uf.value };
    if (mesmoRegistro(registro, st.prof) && f.senha.value === st.prof.senha) {
      st.logado = true;
      salvar('logado');
      $('erro-login').textContent = '';
      f.reset();
      entrarNoSistema();
    } else {
      $('erro-login').textContent = 'Registro, UF ou senha incorretos.';
    }
  });

  /* ------------------------------------------------------------------
     Entrada no sistema e cronometragem
     ------------------------------------------------------------------ */
  function entrarNoSistema() {
    mostrar('tela-sistema');
    $('topo-nome').textContent = st.prof.nome;
    $('topo-registro').textContent = `${st.prof.conselho} ${st.prof.numero}/${st.prof.uf}`;
    renderTudo();

    if (st.aguardando) $('modal-concluida').hidden = false;
    else if (!st.tarefa) iniciarTarefa();

    if (!st.roteiroVisto) {
      $('painel-roteiro').hidden = false;
      st.roteiroVisto = true;
      salvar('roteiroVisto');
    }
  }

  // A contagem de tempo começa aqui: depois do login, ou ao pedir nova receita.
  function iniciarTarefa() {
    st.tarefa = { numero: st.metricas.length + 1, inicio: Date.now(), cliques: 0, usouModelo: false };
    salvar('tarefa');
  }

  function registrarTarefa(concluida) {
    const t = st.tarefa;
    if (!t) return;
    st.metricas.push({
      receita: t.numero,
      segundos: Math.round((Date.now() - t.inicio) / 1000),
      cliques: t.cliques,
      usouModelo: t.usouModelo,
      medicamentos: st.receita.itens.length,
      concluida
    });
    st.tarefa = null;
    salvar('metricas', 'tarefa');
  }

  // Conta todos os cliques dentro do sistema enquanto uma receita está em andamento.
  // Elementos marcados com data-nao-contar (roteiro, reimpressão) ficam de fora.
  document.addEventListener('click', (e) => {
    if (!st.tarefa || $('tela-sistema').hidden) return;
    if (e.target.closest('[data-nao-contar]')) return;
    st.tarefa.cliques += 1;
    salvar('tarefa');
  }, true);

  /* ------------------------------------------------------------------
     Roteiro
     ------------------------------------------------------------------ */
  $('lista-roteiro').innerHTML = (CFG.TAREFAS || []).map((t) => `<li>${esc(t)}</li>`).join('');
  $('btn-roteiro').addEventListener('click', () => { $('painel-roteiro').hidden = !$('painel-roteiro').hidden; });
  $('btn-fechar-roteiro').addEventListener('click', () => { $('painel-roteiro').hidden = true; });

  /* ------------------------------------------------------------------
     1. Atendimento (nunca é preenchido automaticamente)
     ------------------------------------------------------------------ */
  $('in-unidade').addEventListener('input', (e) => { st.receita.unidade = e.target.value; salvar('receita'); renderFolha(); });
  $('in-data').addEventListener('input', (e) => { st.receita.data = e.target.value; salvar('receita'); renderFolha(); });
  $('in-obs').addEventListener('input', (e) => { st.receita.observacoes = e.target.value; salvar('receita'); renderFolha(); });

  /* ------------------------------------------------------------------
     2. Paciente: busca por CPF/CNS, cadastro e preenchimento automático
     ------------------------------------------------------------------ */
  const pacienteAtual = () => st.pacientes.find((p) => p.id === st.receita.pacienteId) || null;

  function buscarPaciente() {
    const q = digitos($('in-busca').value);
    const msg = $('pac-msg');
    $('pac-novo').hidden = true;
    msg.classList.remove('erro');

    if (q.length !== 11 && q.length !== 15) {
      msg.textContent = 'Digite um CPF (11 dígitos) ou um CNS (15 dígitos).';
      msg.classList.add('erro');
      return;
    }
    const achado = st.pacientes.find((p) => p.cpf === q || p.cns === q);
    if (achado) {
      msg.textContent = '';
      selecionarPaciente(achado.id);
    } else {
      msg.textContent = 'Nenhum paciente cadastrado com esse número.';
      abrirCadastroPaciente(q);
    }
  }

  function abrirCadastroPaciente(numero) {
    ['np-nome', 'np-cpf', 'np-cns'].forEach((id) => { $(id).value = ''; });
    $('np-erro').textContent = '';
    if (numero.length === 11) $('np-cpf').value = numero;
    if (numero.length === 15) $('np-cns').value = numero;
    $('pac-novo').hidden = false;
    $('np-nome').focus();
  }

  function salvarPaciente() {
    const nome = $('np-nome').value.trim();
    const cpf = digitos($('np-cpf').value);
    const cns = digitos($('np-cns').value);
    const erro = $('np-erro');

    if (!nome) { erro.textContent = 'Informe o nome do paciente.'; return; }
    if (!cpf && !cns) { erro.textContent = 'Informe o CPF ou o CNS.'; return; }
    if (cpf && cpf.length !== 11) { erro.textContent = 'O CPF deve ter 11 dígitos.'; return; }
    if (cns && cns.length !== 15) { erro.textContent = 'O CNS deve ter 15 dígitos.'; return; }

    // Evita duplicidade: CPF e CNS são únicos.
    const duplicado = st.pacientes.find((p) => (cpf && p.cpf === cpf) || (cns && p.cns === cns));
    if (duplicado) { erro.textContent = 'Já existe um paciente com este CPF ou CNS. Use a busca para selecioná-lo.'; return; }

    const p = { id: novoId(), nome, cpf, cns };
    st.pacientes.push(p);
    salvar('pacientes');
    $('pac-novo').hidden = true;
    $('pac-msg').textContent = '';
    selecionarPaciente(p.id);
  }

  function selecionarPaciente(id) {
    st.receita.pacienteId = id;
    salvar('receita');
    renderPaciente();
    renderFolha();
  }

  function trocarPaciente() {
    st.receita.pacienteId = null;
    salvar('receita');
    $('in-busca').value = '';
    $('pac-msg').textContent = '';
    renderPaciente();
    renderFolha();
    $('in-busca').focus();
  }

  function renderPaciente() {
    const pac = pacienteAtual();
    $('pac-busca').hidden = !!pac;
    $('pac-selecionado').hidden = !pac;
    if (!pac) return;
    $('pac-selecionado').innerHTML = `
      <div class="pac-cartao">
        <dl>
          <dt>Nome</dt><dd>${esc(pac.nome)}</dd>
          <dt>CPF</dt><dd>${fmtCPF(pac.cpf)}</dd>
          <dt>CNS</dt><dd>${fmtCNS(pac.cns)}</dd>
        </dl>
        <button type="button" class="btn" id="btn-trocar-pac">Trocar paciente</button>
      </div>`;
    $('btn-trocar-pac').addEventListener('click', trocarPaciente);
  }

  $('btn-buscar').addEventListener('click', buscarPaciente);
  $('in-busca').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); buscarPaciente(); } });
  $('btn-salvar-pac').addEventListener('click', salvarPaciente);
  $('btn-cancelar-pac').addEventListener('click', () => { $('pac-novo').hidden = true; $('pac-msg').textContent = ''; });

  /* ------------------------------------------------------------------
     3. Medicamentos
     ------------------------------------------------------------------ */
  // ativo(id) diz se o botão está marcado; alternar(id) muda a seleção.
  function montarPicks(alvo, grupo, ativo, alternar) {
    const caixa = $(alvo);
    caixa.innerHTML = '';
    (PIC[grupo] || []).forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick';
      b.setAttribute('aria-pressed', String(ativo(p.id)));
      b.innerHTML = picto(grupo, p.id) + `<span>${esc(p.nome)}</span>`;
      b.addEventListener('click', () => {
        alternar(p.id);
        montarPicks(alvo, grupo, ativo, alternar);
      });
      caixa.appendChild(b);
    });
  }

  function renderSeletores() {
    montarPicks('picks-forma', 'forma', (id) => sel.forma === id, (id) => {
      sel.forma = id;
      renderDose(); // trocar a forma troca a unidade de medida (e pode tirar o contador)
      // ...e marca a via sugerida para a forma, se houver (o médico pode trocar)
      const via = viaDaForma(id);
      if (via) { sel.via = via; renderVia(); }
    });
    renderVia();
    montarPicks('picks-cuidado', 'cuidado', (id) => sel.cuidados.includes(id), (id) => {
      const i = sel.cuidados.indexOf(id);
      if (i < 0) sel.cuidados.push(id); else sel.cuidados.splice(i, 1);
    });
    renderDose();
    renderHorarios();
    renderDuracao();
  }

  function renderVia() {
    montarPicks('picks-via', 'via', (id) => sel.via === id, (id) => { sel.via = id; });
  }

  // Duração: uso contínuo ou um número de dias (campo aparece só nesse caso).
  function renderDuracao() {
    $('picks-duracao').querySelectorAll('.pick').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.duracao === sel.duracao));
    });
    $('campo-dias').hidden = sel.duracao !== 'dias';
    $('in-dias').value = sel.dias;
  }
  $('picks-duracao').querySelectorAll('.pick').forEach((b) => {
    b.addEventListener('click', () => {
      sel.duracao = b.dataset.duracao;
      renderDuracao();
      if (sel.duracao === 'dias') $('in-dias').focus();
    });
  });
  $('in-dias').addEventListener('input', (e) => {
    sel.dias = e.target.value.replace(/\D/g, '').slice(0, 3);
    e.target.value = sel.dias;
  });

  // Botão de período: liga a tomada daquele período ou desliga todas as que o usam.
  function alternarPeriodo(id) {
    if (sel.horarios.some((t) => t.periodo === id)) {
      sel.horarios = sel.horarios.filter((t) => t.periodo !== id);
    } else {
      sel.horarios.push({ periodo: id, hora: '' });
      sel.horarios.sort(compararTomadas);
    }
    renderTomadas();
  }

  function renderHorarios() {
    montarPicks('picks-horario', 'horario', (id) => sel.horarios.some((t) => t.periodo === id), alternarPeriodo);
    renderTomadas();
  }

  // Opções da caixa de período. Sem período escolhido, mostra só um aviso
  // (não dá para escolher "sem período": todo horário precisa de um).
  const opcoesPeriodo = (t) => (t.periodo ? '' : '<option value="" selected disabled>Pelo horário…</option>')
    + PIC.horario.map((h) => `<option value="${esc(h.id)}"${h.id === t.periodo ? ' selected' : ''}>${esc(h.nome)}</option>`).join('');

  // Uma linha por tomada: o período e, se quiser, o horário exato.
  // t.auto marca o período escolhido pelo sistema a partir do horário: ele
  // acompanha o horário até o médico escolher outro período na caixa.
  function renderTomadas() {
    const ul = $('lista-tomadas');
    ul.innerHTML = '';
    sel.horarios.forEach((t, i) => {
      const li = document.createElement('li');
      li.className = 'tomada';
      li.innerHTML = `<span class="tomada-picto">${t.periodo ? picto('horario', t.periodo) : ''}</span>
        <select aria-label="Período do dia">${opcoesPeriodo(t)}</select>
        <label class="tomada-hora">às <input type="text" class="campo-hora" inputmode="numeric" maxlength="5"
          placeholder="--:--" value="${esc(t.texto != null ? t.texto : t.hora)}" aria-label="Horário exato, em 24 horas"></label>`;

      const caixa = li.querySelector('select');
      caixa.addEventListener('change', () => {
        t.periodo = caixa.value;
        t.auto = false;
        renderHorarios();
      });
      const campo = li.querySelector('input');
      campo.addEventListener('input', () => {
        const m = mascaraHora(campo.value);
        campo.value = m.formatado;
        t.texto = m.formatado;
        t.hora = m.hora;
        if (t.periodo && !t.auto) return;
        const p = periodoDaHora(t.hora);
        if (!p || p === t.periodo) return;
        // atualiza só esta linha e os botões, sem tirar o foco do campo
        t.periodo = p;
        t.auto = true;
        caixa.innerHTML = opcoesPeriodo(t);
        li.querySelector('.tomada-picto').innerHTML = picto('horario', p);
        montarPicks('picks-horario', 'horario', (id) => sel.horarios.some((x) => x.periodo === id), alternarPeriodo);
      });

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn-remover';
      b.textContent = '×';
      b.setAttribute('aria-label', 'Remover este horário');
      b.addEventListener('click', () => { sel.horarios.splice(i, 1); renderHorarios(); });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  $('btn-add-hora').addEventListener('click', () => {
    // o médico digita o horário e o período é escolhido sozinho (pode ser trocado)
    sel.horarios.push({ periodo: null, hora: '', auto: true });
    renderTomadas();
    const campos = $('lista-tomadas').querySelectorAll('.campo-hora');
    campos[campos.length - 1].focus();
  });

  // Ajusta o seletor de quantidade à forma escolhida: título, unidade e
  // limites; formas sem quantidade (pomada) não mostram contador nenhum.
  function renderDose() {
    const d = dose(sel.forma);
    const semQtd = d.tipo === 'nenhuma';

    $('dose-titulo').textContent = semQtd ? 'Quantidade' : d.titulo;
    $('dose-contador').hidden = semQtd;
    $('dose-nota').hidden = !semQtd;

    if (semQtd) {
      sel.qtd = null;
      $('dose-unidade').textContent = '';
      $('dose-nota').textContent = d.nota || '';
      return;
    }

    sel.qtd = limitarDose(sel.qtd == null ? d.padrao : sel.qtd, d);
    $('qtd').textContent = sel.qtd;
    const u = d.unidade || DOSE_PADRAO.unidade;
    $('dose-unidade').textContent = sel.qtd === 1 ? u[0] : u[1];
  }

  function mudarQtd(sinal) {
    const d = dose(sel.forma);
    if (d.tipo === 'nenhuma') return;
    sel.qtd = limitarDose((sel.qtd == null ? d.padrao : sel.qtd) + sinal * d.passo, d);
    renderDose();
  }
  $('btn-qtd-menos').addEventListener('click', () => mudarQtd(-1));
  $('btn-qtd-mais').addEventListener('click', () => mudarQtd(1));

  function limparEdicao() {
    indiceEdicao = null;
    sel = selecaoVazia();
    $('in-med-nome').value = '';
    $('erro-med').textContent = '';
    $('btn-add-med').textContent = 'Adicionar à receita';
    $('btn-cancelar-edicao').hidden = true;
    renderSeletores();
  }

  function editarMedicamento(i) {
    const medicamento = st.receita.itens[i];
    if (!medicamento) return;
    indiceEdicao = i;
    sel = {
      forma: medicamento.forma,
      via: medicamento.via || null,
      qtd: medicamento.qtd,
      horarios: copia(medicamento.horarios || []),
      cuidados: [...(medicamento.cuidados || [])],
      duracao: medicamento.duracao ? medicamento.duracao.tipo : null,
      dias: medicamento.duracao && medicamento.duracao.tipo === 'dias' ? String(medicamento.duracao.dias) : ''
    };
    $('in-med-nome').value = medicamento.nome;
    $('erro-med').textContent = '';
    $('btn-add-med').textContent = 'Salvar alterações';
    $('btn-cancelar-edicao').hidden = false;
    renderSeletores();
    $('in-med-nome').focus();
  }

  function adicionarMedicamento() {
    const nome = $('in-med-nome').value.trim();
    const erro = $('erro-med');
    if (!nome) { erro.textContent = 'Informe o nome do medicamento.'; $('in-med-nome').focus(); return; }
    if (!sel.forma) { erro.textContent = 'Escolha a forma do medicamento.'; return; }
    if (!sel.via && (PIC.via || []).length) { erro.textContent = 'Escolha a via do medicamento.'; return; }
    if (!sel.horarios.length) { erro.textContent = 'Escolha pelo menos um período do dia ou uma hora exata.'; return; }
    if (sel.horarios.some((t) => t.texto && !t.hora)) { erro.textContent = 'Confira o horário: use 24 horas, com hora e minutos (ex.: 08:00 ou 14:30).'; return; }
    if (sel.horarios.some((t) => !t.periodo)) { erro.textContent = 'Todo horário precisa de um período do dia: digite o horário ou escolha o período, ou remova a linha.'; return; }
    if (!sel.duracao) { erro.textContent = 'Informe por quanto tempo: uso contínuo ou número de dias.'; return; }
    const dias = Number(sel.dias);
    if (sel.duracao === 'dias' && !(dias >= 1 && dias <= 365)) { erro.textContent = 'Informe o número de dias do tratamento (de 1 a 365).'; $('in-dias').focus(); return; }

    // sem repetições e em ordem cronológica
    const vistas = new Set();
    const horarios = sel.horarios
      .map((t) => ({ periodo: t.periodo || null, hora: t.hora || '' }))
      .filter((t) => { const k = chaveTomada(t); if (vistas.has(k)) return false; vistas.add(k); return true; })
      .sort(compararTomadas);

    const medicamento = {
      nome,
      forma: sel.forma,
      via: sel.via,
      qtd: dose(sel.forma).tipo === 'nenhuma' ? null : sel.qtd,
      horarios,
      duracao: sel.duracao === 'dias' ? { tipo: 'dias', dias } : { tipo: 'continuo' },
      cuidados: [...sel.cuidados]
    };
    if (indiceEdicao === null) st.receita.itens.push(medicamento);
    else st.receita.itens[indiceEdicao] = medicamento;
    salvar('receita');
    erro.textContent = '';
    limparEdicao();
    renderLista();
    renderFolha();
  }
  $('btn-add-med').addEventListener('click', adicionarMedicamento);
  $('btn-cancelar-edicao').addEventListener('click', limparEdicao);
  $('in-med-nome').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarMedicamento(); } });

  function renderLista() {
    const ul = $('lista-itens');
    ul.innerHTML = '';
    $('lista-vazia').hidden = st.receita.itens.length > 0;
    st.receita.itens.forEach((m, i) => {
      const li = document.createElement('li');
      const horarios = m.horarios.map(descreverTomada).join(', ');
      const resumo = dose(m.forma).tipo === 'nenhuma'
        ? esc(nomePicto('forma', m.forma).toLowerCase())
        : esc(textoDose(m));
      li.innerHTML = `${picto('forma', m.forma)}
        <span class="info"><strong>${esc(m.nome)}</strong>
        <span>${resumo}, ${m.via ? 'via ' + esc(nomePicto('via', m.via).toLowerCase()) + ', ' : ''}${esc(horarios)}${m.duracao ? ', ' + esc(textoDuracao(m).toLowerCase()) : ''}</span></span>`;
      const acoes = document.createElement('span');
      acoes.className = 'lista-acoes';
      const editar = document.createElement('button');
      editar.type = 'button';
      editar.className = 'btn-editar';
      editar.textContent = 'Editar';
      editar.setAttribute('aria-label', 'Editar ' + m.nome);
      editar.addEventListener('click', () => editarMedicamento(i));
      const remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'btn-remover';
      remover.textContent = '×';
      remover.setAttribute('aria-label', 'Remover ' + m.nome);
      remover.addEventListener('click', () => {
        if (indiceEdicao === i) limparEdicao();
        else if (indiceEdicao !== null && i < indiceEdicao) indiceEdicao -= 1;
        st.receita.itens.splice(i, 1);
        salvar('receita');
        renderLista();
        renderFolha();
      });
      acoes.append(editar, remover);
      li.appendChild(acoes);
      ul.appendChild(li);
    });
  }

  /* ------------------------------------------------------------------
     Modelos de receita
     ------------------------------------------------------------------ */
  function renderModelos() {
    const caixa = $('lista-modelos');
    caixa.innerHTML = '';
    $('modelos-vazio').hidden = st.modelos.length > 0;
    st.modelos.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'modelo-btn';
      b.textContent = m.nome;
      b.addEventListener('click', () => aplicarModelo(i));
      caixa.appendChild(b);
    });
  }

  function aplicarModelo(i) {
    const modelo = st.modelos[i];
    if (indiceEdicao !== null) limparEdicao();
    st.receita.itens = copia(modelo.itens);
    salvar('receita');
    if (st.tarefa) { st.tarefa.usouModelo = true; salvar('tarefa'); }
    $('modelo-msg').textContent = `Modelo "${modelo.nome}" aplicado. Você ainda pode adicionar ou remover medicamentos.`;
    renderLista();
    renderFolha();
  }

  function salvarModelo() {
    const nome = $('in-modelo').value.trim();
    const msg = $('modelo-msg');
    if (!st.receita.itens.length) { msg.textContent = 'Adicione medicamentos à receita antes de salvar um modelo.'; return; }
    if (!nome) { msg.textContent = 'Dê um nome ao modelo.'; $('in-modelo').focus(); return; }
    st.modelos.push({ nome, itens: copia(st.receita.itens) });
    salvar('modelos');
    $('in-modelo').value = '';
    msg.textContent = `Modelo "${nome}" salvo.`;
    renderModelos();
  }
  $('btn-salvar-modelo').addEventListener('click', salvarModelo);
  $('in-modelo').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); salvarModelo(); } });

  /* ------------------------------------------------------------------
     4. Folha A4 (prévia = impressão)
     ------------------------------------------------------------------ */
  function renderFolha() {
    const r = st.receita;
    const pac = pacienteAtual();
    let corpo = '';

    if (!r.itens.length) {
      corpo = '<p class="folha-vazia">Os medicamentos adicionados aparecerão aqui.</p>';
    } else {
      // Um bloco por tomada diferente (período, hora ou os dois), em ordem cronológica.
      const tomadas = new Map();
      r.itens.forEach((m) => m.horarios.forEach((t) => { if (!tomadas.has(chaveTomada(t))) tomadas.set(chaveTomada(t), t); }));
      [...tomadas.values()].sort(compararTomadas).forEach((t) => {
        const k = chaveTomada(t);
        const meds = r.itens.filter((m) => m.horarios.some((x) => chaveTomada(x) === k));
        const titulo = (t.periodo ? `${picto('horario', t.periodo, 'picto-bloco')}<span>${esc(nomePicto('horario', t.periodo))}</span>` : '')
          + (t.hora ? `<span class="bloco-hora">${esc(t.hora)}</span>` : '');
        corpo += `<section class="bloco">
          <div class="bloco-titulo">${titulo}<span class="regua"></span></div>`;
        meds.forEach((m) => {
          const d = dose(m.forma);
          // Com quantidade: o número e a unidade por extenso ("2 comprimidos").
          // Sem quantidade: o nome da forma ("Pomada") e, abaixo do nome do
          // medicamento, a frase que diz como usar.
          const semQtd = d.tipo === 'nenhuma';
          const qtd = `<span class="med-dose">${esc(semQtd ? nomePicto('forma', m.forma) : textoDose(m))}</span>`;
          const instrucao = semQtd ? textoDose(m) : '';
          // via: o pictograma e, à direita, como usar em linguagem simples ("Pela boca")
          const via = textoVia(m)
            ? `<span class="med-via">${picto('via', m.via, 'picto-via')}<span>${esc(textoVia(m))}</span></span>` : '';
          // cada cuidado: o pictograma e, à direita, o nome por escrito ("Com água")
          const cuidados = m.cuidados.map((c) =>
            `<span class="cuidado">${picto('cuidado', c, 'picto-cuidado')}<span class="cuidado-nome">${esc(nomePicto('cuidado', c))}</span></span>`).join('');
          corpo += `<div class="linha-med">
            ${picto('forma', m.forma, 'picto-forma')}
            <span class="med-qtd">${qtd}</span>
            <span class="med-info"><strong>${esc(m.nome)}</strong>${instrucao ? `<span class="med-instrucao">${esc(instrucao)}</span>` : ''}${via}${m.duracao ? `<span class="med-duracao">${esc(textoDuracao(m))}</span>` : ''}${cuidados ? `<span class="med-cuidados">${cuidados}</span>` : ''}</span>
          </div>`;
        });
        corpo += '</section>';
      });
    }

    const obs = (r.observacoes || '').trim();
    const observacoes = obs ? `<section class="folha-obs"><strong>Observações</strong><p>${esc(obs)}</p></section>` : '';

    const prof = st.prof || { nome: '', conselho: '', numero: '', uf: '' };
    $('folha').innerHTML = `
      <header class="folha-topo">
        <div>
          <div class="folha-unidade">${r.unidade ? esc(r.unidade) : '<span class="vazio">Unidade de atendimento</span>'}</div>
          <div class="folha-paciente">${pac ? esc(pac.nome) : '<span class="vazio">Nome do paciente</span>'}</div>
        </div>
        <div class="folha-data">${r.data ? fmtData(r.data) : '<span class="vazio">Data</span>'}</div>
      </header>
      <div class="folha-corpo">${corpo}${observacoes}</div>
      <footer class="folha-rodape">
        <div class="folha-qr" id="folha-qr"></div>
        <p class="folha-qr-texto">Para ver esta receita no celular, abra o aplicativo do paciente e aponte a câmera para o código ao lado.</p>
        <div class="assinatura">
          <span class="linha-assinatura"></span>
          ${esc(prof.nome)}<br>${esc(prof.conselho)} ${esc(prof.numero)}/${esc(prof.uf)}
        </div>
      </footer>`;
    gerarQR(pac);
  }

  // O QR identifica o PACIENTE, não a receita: escaneado uma vez, dá acesso a todas as receitas dele.
  function gerarQR(pac) {
    const caixa = $('folha-qr');
    if (!caixa) return;
    if (!pac) { caixa.innerHTML = '<span class="qr-vazio">QR Code do paciente</span>'; return; }
    if (typeof window.QRCode !== 'function') { caixa.innerHTML = '<span class="qr-vazio">QR Code indisponível sem internet</span>'; return; }
    caixa.innerHTML = '';
    new window.QRCode(caixa, {
      text: (CFG.QR_PREFIXO || '') + pac.id,
      width: 160, height: 160,
      colorDark: '#000000', colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }

  /* ------------------------------------------------------------------
     Concluir, repetir e finalizar
     ------------------------------------------------------------------ */
  function concluirReceita() {
    const r = st.receita;
    const faltando = [];
    if (!r.unidade.trim()) faltando.push('a unidade de atendimento');
    if (!r.data) faltando.push('a data');
    if (!r.pacienteId) faltando.push('o paciente');
    if (!r.itens.length) faltando.push('ao menos um medicamento');
    if (faltando.length) {
      $('erro-concluir').textContent = 'Para concluir, falta informar ' + faltando.join(', ') + '.';
      return;
    }
    // o calendário já bloqueia, mas a data também pode ser digitada
    if (r.data > hoje()) {
      $('erro-concluir').textContent = 'A data da receita não pode ser posterior a hoje.';
      return;
    }
    $('erro-concluir').textContent = '';
    registrarTarefa(true);
    st.aguardando = true;
    salvar('aguardando');
    window.print();
    $('modal-concluida').hidden = false;
    $('btn-repetir').focus();
  }
  $('btn-concluir').addEventListener('click', concluirReceita);
  $('btn-reimprimir').addEventListener('click', () => window.print());

  // "Fazer nova receita": limpa a receita, mantém pacientes e modelos cadastrados.
  function repetirProcesso() {
    st.receita = receitaVazia();
    st.aguardando = false;
    salvar('receita', 'aguardando');
    limparEdicao();
    $('in-busca').value = '';
    $('pac-msg').textContent = '';
    $('pac-novo').hidden = true;
    $('in-med-nome').value = '';
    $('in-modelo').value = '';
    $('modelo-msg').textContent = '';
    $('erro-med').textContent = '';
    $('modal-concluida').hidden = true;
    renderTudo();
    iniciarTarefa();
    window.scrollTo(0, 0);
    $('in-unidade').focus();
  }
  $('btn-repetir').addEventListener('click', repetirProcesso);

  function finalizarTeste() {
    if (st.tarefa) {
      const comecou = st.receita.itens.length || st.receita.pacienteId || st.receita.unidade || st.receita.data || st.receita.observacoes;
      if (comecou && !window.confirm('Há uma receita em andamento que não foi concluída. Deseja finalizar o teste mesmo assim?')) return;
      if (comecou) registrarTarefa(false);
      else { st.tarefa = null; salvar('tarefa'); }
    }
    st.aguardando = false;
    st.finalizado = true;
    salvar('aguardando', 'finalizado');
    $('modal-concluida').hidden = true;
    mostrar('tela-final');
  }
  $('btn-finalizar').addEventListener('click', finalizarTeste);
  $('btn-finalizar-modal').addEventListener('click', finalizarTeste);

  /* ------------------------------------------------------------------
     Renderização geral e início
     ------------------------------------------------------------------ */
  function renderTudo() {
    $('in-unidade').value = st.receita.unidade;
    $('in-data').value = st.receita.data;
    $('in-data').max = hoje(); // sem datas futuras no calendário
    $('in-obs').value = st.receita.observacoes || '';
    renderPaciente();
    renderModelos();
    renderSeletores();
    renderLista();
    renderFolha();
  }

  rotear();
})();
