// Interface do app. Renderiza as telas com HTML simples e delega os eventos.
import { MACROS, FIBRA, VITAMINAS, MINERAIS, OUTROS, AMINOACIDOS, TODOS } from './nutrientes.js';
import { calcularMetas, somarDia, status, contarNaMeta, sugestoes, gramasDe, resumoDia } from './calculos.js';
import { carregar, salvar, importar, chaveData, dataDeChave, somarDias, PERFIL_PADRAO } from './armazenamento.js';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_LONGOS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const $main = document.getElementById('conteudo');
const $nav = document.getElementById('nav');

let est = carregar();
let padrao = [];
const ui = {
  aba: 'hoje', hoje: chaveData(), dia: chaveData(),
  analiseAberta: false, confirmar: null, form: false, histN: 14, erro: null, aviso: null,
};

// ---------- utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function fmt(v) {
  v = Number(v) || 0;
  if (Math.abs(v) >= 100) return Math.round(v).toLocaleString('pt-BR');
  if (Math.abs(v) >= 1) return (Math.round(v * 10) / 10).toLocaleString('pt-BR');
  return (Math.round(v * 100) / 100).toLocaleString('pt-BR');
}
const num = (s) => Math.max(0, Number(String(s).trim().replace(',', '.')) || 0);
const pct = (v, m) => (m > 0 ? Math.max(0, Math.min(100, Math.round((v / m) * 100))) : 0);
const persistir = () => { if (!salvar(est)) ui.aviso = 'Não foi possível salvar no aparelho.'; };

function todos() { return [...padrao, ...est.meus]; }
function ativos() { const r = new Set(est.removidos); return todos().filter((a) => !r.has(a.id)); }
function catalogo() { const m = {}; for (const a of todos()) m[a.id] = a; return m; }
function naLista(a) { return est.lista[a.id] ?? a.lista ?? true; }
function diaDe(chave) { return est.dias[chave] ?? { tipo: 'comum', itens: {}, base: {} }; }
function garantirDia(chave) {
  const d = (est.dias[chave] ??= { tipo: 'comum', itens: {}, base: {} });
  d.itens ??= {}; d.base ??= {};
  return d;
}
function alimentoDoDia(dia, id) { return dia.base?.[id] ?? catalogo()[id]; }

function nomeMedida(a, q) { return q === 1 ? a.medida.nome : a.medida.plural; }
function qtdTxt(a, q) {
  const nome = a.nome.charAt(0).toLowerCase() + a.nome.slice(1);
  if (!a.medida) return `${fmt(q)} g de ${nome}`;
  return `${fmt(q)} ${nomeMedida(a, q)} de ${nome} (${fmt(gramasDe(a, q))} g)`;
}
function porcaoInfo(a) {
  if (!a.medida) return { rotulo: 'por 100 g', fator: 1 };
  return { rotulo: `1 ${a.medida.nome} = ${fmt(a.medida.gramas)} g`, fator: a.medida.gramas / 100 };
}
function dataLonga(chave) {
  const d = dataDeChave(chave);
  return `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}
function dataCurta(chave) {
  const d = dataDeChave(chave);
  return `${DIAS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function rotuloDia(chave) {
  const n = Math.round((dataDeChave(ui.hoje) - dataDeChave(chave)) / 86400000);
  if (n === 0) return 'Hoje';
  if (n === 1) return 'Ontem';
  return `Há ${n} dias`;
}

const ICONES = {
  hoje: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  analise: 'M5 20V11M12 20V4M19 20v-7',
  historico: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 7v5l3 2',
  alimentos: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  perfil: 'M12 12a4 4 0 1 0 0-8a4 4 0 1 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  esq: 'M15 6l-6 6 6 6',
  dir: 'M9 6l6 6-6 6',
};
const icone = (d, t = 20) => `<svg width="${t}" height="${t}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;

const TXT_STATUS = { ok: 'na meta', perto: 'perto', baixo: 'baixo', acima: 'acima do limite' };

// ---------- pedaços de tela ----------
function linhaNutriente(n, tot, metas) {
  const v = tot[n.k], m = metas[n.k];
  const st = status(v, m, n.limite);
  const txt = n.limite && st === 'ok' ? 'dentro do limite' : TXT_STATUS[st];
  return `<div class="nutri">
    <div class="nutri-topo"><span class="nutri-nome">${n.nome} <span class="st st-${st}">· ${txt}</span>${n.dica ? `<span class="nutri-dica">${n.dica}</span>` : ''}</span>
    <span class="nutri-valor">${fmt(v)} / ${fmt(m)} ${n.u}</span></div>
    <div class="barra"><span class="b-${st}" style="width:${pct(v, m)}%"></span></div></div>`;
}

function gruposAnalise(tot, metas) {
  const c = contarNaMeta(tot, metas);
  const vit = VITAMINAS.filter((n) => status(tot[n.k], metas[n.k]) === 'ok').length;
  const min = MINERAIS.filter((n) => !n.limite && status(tot[n.k], metas[n.k]) === 'ok').length;
  const out = OUTROS.filter((n) => status(tot[n.k], metas[n.k]) === 'ok').length;
  const grupo = (titulo, cont, lista) => `<section class="cartao">
      <div class="cartao-topo"><h2>${titulo}</h2><span class="suave">${cont}</span></div>
      ${lista.map((n) => linhaNutriente(n, tot, metas)).join('')}</section>`;
  return [
    grupo('Energia e macros', '', [...MACROS, FIBRA]),
    grupo('Vitaminas', `${vit} de ${VITAMINAS.length} na meta`, VITAMINAS),
    grupo('Minerais', `${min} de ${MINERAIS.length - 1} na meta`, MINERAIS),
    grupo('Ômega-3 e desempenho', `${out} de ${OUTROS.length} na meta`, OUTROS),
    grupo('Aminoácidos essenciais', `${c.aminos} de ${c.aminosTotal} na meta`, AMINOACIDOS),
  ].join('');
}

function cabecalhoDia() {
  const passado = ui.dia !== ui.hoje;
  return `<div class="cab-dia">
      <button class="seta" data-acao="dia-anterior" aria-label="Dia anterior">${icone(ICONES.esq)}</button>
      <div class="cab-dia-txt"><p class="rotulo">${rotuloDia(ui.dia)}</p><h1>${dataLonga(ui.dia)}</h1></div>
      <button class="seta" data-acao="dia-proximo" aria-label="Próximo dia" ${passado ? '' : 'disabled'}>${icone(ICONES.dir)}</button>
    </div>
    ${passado ? `<section class="faixa faixa-aviso">
      <span>Você está vendo um dia passado. Pode corrigir as quantidades e o tipo do dia, e o histórico se atualiza na hora.</span>
      <button class="btn btn-primario" data-acao="voltar-hoje">Voltar para hoje</button></section>` : ''}`;
}

// ---------- telas ----------
function telaHoje() {
  const dia = diaDe(ui.dia);
  const metas = calcularMetas(est.perfil, dia.tipo);
  const tot = somarDia(dia, catalogo());
  const c = contarNaMeta(tot, metas);
  const sodio = status(tot.na, metas.na, true) === 'ok' ? 'dentro do limite' : 'acima do limite';
  const resto = metas.kcal - tot.kcal;
  const ids = new Set(Object.keys(dia.itens ?? {}));
  const lista = ativos().filter((a) => naLista(a) || ids.has(a.id));
  for (const id of ids) if (!lista.some((a) => a.id === id) && alimentoDoDia(dia, id)) lista.push(alimentoDoDia(dia, id));

  const linhas = lista.map((a) => {
    const q = Number(dia.itens?.[a.id]) || 0;
    const p = porcaoInfo(a);
    const unidade = a.medida ? a.medida.nome : 'gramas';
    return `<div class="item ${q > 0 ? 'item-ativo' : ''}">
      <div class="item-txt"><span class="item-nome">${esc(a.nome)}</span>
        <span class="item-sub">${esc(p.rotulo)} · ${fmt(a.n.kcal * p.fator)} kcal · ${fmt(a.n.prot * p.fator)} g prot.</span></div>
      <div class="stepper">
        <button class="passo" data-acao="menos" data-id="${esc(a.id)}" aria-label="Menos ${esc(a.nome)}">−</button>
        <label class="qtd"><input type="text" inputmode="decimal" value="${fmt(q)}" data-qtd="${esc(a.id)}" aria-label="Quantidade de ${esc(a.nome)} em ${esc(unidade)}">
          <span class="qtd-un">${esc(unidade)}</span>
          ${a.medida ? `<span class="qtd-g">= ${fmt(gramasDe(a, q))} g</span>` : ''}</label>
        <button class="passo passo-mais" data-acao="mais" data-id="${esc(a.id)}" aria-label="Mais ${esc(a.nome)}">+</button>
      </div></div>`;
  }).join('');

  return `<div class="tela">
    ${cabecalhoDia()}
    ${!est.perfilDefinido ? `<section class="faixa faixa-info"><span>As metas usam dados de exemplo. Coloque seu peso, altura e idade no Perfil.</span>
      <button class="btn btn-contorno" data-acao="aba" data-aba="perfil">Abrir perfil</button></section>` : ''}
    <div class="seg" role="group" aria-label="Tipo de dia">
      <button data-acao="tipo" data-tipo="treino" aria-pressed="${dia.tipo === 'treino'}">Dia de treino</button>
      <button data-acao="tipo" data-tipo="comum" aria-pressed="${dia.tipo === 'comum'}">Dia comum</button>
    </div>
    <section class="cartao">
      <div class="kcal-topo"><div><span class="suave">Calorias</span>
        <div class="kcal-num">${fmt(tot.kcal)} <span>/ ${fmt(metas.kcal)} kcal</span></div></div>
        <span class="kcal-resto">${resto >= 0 ? 'faltam ' + fmt(resto) : fmt(-resto) + ' acima'}</span></div>
      <div class="barra barra-grossa"><span class="b-${status(tot.kcal, metas.kcal)}" style="width:${pct(tot.kcal, metas.kcal)}%"></span></div>
      ${MACROS.slice(1).map((n) => `<div class="nutri"><div class="nutri-topo"><span class="nutri-nome">${n.nome}</span>
        <span class="nutri-valor">${fmt(tot[n.k])} / ${fmt(metas[n.k])} g</span></div>
        <div class="barra"><span class="b-${status(tot[n.k], metas[n.k])}" style="width:${pct(tot[n.k], metas[n.k])}%"></span></div></div>`).join('')}
    </section>
    <button class="cartao cartao-link" data-acao="aba" data-aba="analise">
      <span class="cartao-link-txt"><strong>Micronutrientes e aminoácidos</strong>
        <span class="suave">Vitaminas, minerais, ômega-3 e outros: ${c.micros} de ${c.microsTotal} na meta · sódio ${sodio}</span>
        <span class="suave">Aminoácidos essenciais: ${c.aminos} de ${c.aminosTotal} na meta</span></span>
      <span class="acento">Ver tudo ${icone(ICONES.dir, 18)}</span>
    </button>
    <div class="titulo-secao"><h2>O que comi</h2><span class="suave">toque em + ou digite</span></div>
    <div class="lista">${linhas || '<p class="vazio">Sua lista rápida está vazia. Coloque alimentos nela pela aba Alimentos.</p>'}</div>
    <button class="btn btn-contorno btn-largo" data-acao="alternar-analise" aria-expanded="${ui.analiseAberta}">
      ${ui.analiseAberta ? 'Ocultar análise completa' : 'Mostrar análise completa'}</button>
    ${ui.analiseAberta ? `<div class="pilha">${gruposAnalise(tot, metas)}</div>` : ''}
    <p class="rodape">Tudo fica salvo neste aparelho. Amanhã o app abre num dia novo, zerado.</p>
  </div>`;
}

function telaAnalise() {
  const dia = diaDe(ui.dia);
  const metas = calcularMetas(est.perfil, dia.tipo);
  const tot = somarDia(dia, catalogo());
  const { lista, plano } = sugestoes(tot, metas, ativos());
  const baixos = lista.filter(({ alvo }) => status(tot[alvo.k], metas[alvo.k]) === 'baixo').map(({ alvo }) => alvo.nome);
  const cat = catalogo();

  const qtdPlano = { ...(dia.itens ?? {}) };
  for (const [id, q] of Object.entries(plano)) qtdPlano[id] = (Number(qtdPlano[id]) || 0) + q;
  const tot2 = somarDia({ ...dia, itens: qtdPlano }, cat);
  const c2 = contarNaMeta(tot2, metas);
  const kcalPlano = tot2.kcal - tot.kcal;
  const restam = Math.max(0, metas.kcal - tot.kcal);

  const planoHtml = Object.entries(plano).map(([id, q]) => {
    const a = cat[id];
    const p = porcaoInfo(a);
    return `<div class="plano-item"><span>${esc(qtdTxt(a, q))}<br><span class="suave">+${fmt(a.n.kcal * p.fator * (a.medida ? q : q / 100))} kcal</span></span>
      <button class="btn btn-pequeno" data-acao="comer" data-id="${esc(id)}" data-qtd="${q}">Comi</button></div>`;
  }).join('');

  const sugHtml = lista.map(({ alvo, sugestao: s }) => `<div class="sug">
      <div class="sug-topo"><strong>${alvo.nome}</strong><span class="st-baixo">faltam ${fmt(alvo.falta)} ${alvo.u}</span></div>
      ${s ? `<span>Coma ${esc(qtdTxt(s.alimento, s.qtd))}</span>
        <span class="suave">dá ${fmt(s.fornece)} ${alvo.u}${s.parcial ? ', cobre só uma parte' : ' e fecha a meta'}</span>
        ${s.parcial ? `<span class="suave">Para cobrir melhor, peça à Claude para cadastrar: ${alvo.ideia}.</span>` : ''}`
      : `<span class="suave">Nenhum alimento do seu cardápio é boa fonte. Peça à Claude para cadastrar: ${alvo.ideia}.</span>`}
    </div>`).join('');

  return `<div class="tela">
    <div><p class="rotulo">Análise · ${ui.dia === ui.hoje ? 'hoje' : dataCurta(ui.dia)} · ${dia.tipo === 'treino' ? 'dia de treino' : 'dia comum'}</p>
      <h1>O que falta</h1></div>
    <div class="legenda">
      <span><i class="b-ok"></i>Na meta (90%+)</span><span><i class="b-perto"></i>Perto (50–89%)</span>
      <span><i class="b-baixo"></i>Baixo</span><span><i class="b-acima"></i>Acima do limite</span></div>
    ${baixos.length ? `<section class="faixa faixa-alerta"><strong>Ainda baixo</strong><span>${baixos.join(', ')}</span></section>` : ''}
    ${!lista.length ? `<section class="faixa faixa-ok"><strong>Todos os micronutrientes, ômega-3 e aminoácidos estão na meta.</strong></section>` : `
    <section class="cartao">
      <div><h2>Como fechar as metas</h2><span class="suave">Sugestões usando só os alimentos do seu cardápio</span></div>
      ${planoHtml ? `<div class="plano">
        <span class="plano-titulo">Plano para o resto do dia</span>${planoHtml}
        <span>+${fmt(kcalPlano)} kcal · restam ${fmt(restam)} kcal na sua meta</span>
        <strong>Com o plano: ${c2.micros} de ${c2.microsTotal} micronutrientes e ${c2.aminos} de ${c2.aminosTotal} aminoácidos na meta.</strong>
        ${kcalPlano > restam ? '<span class="st-baixo">Atenção: o plano passa da sua meta de calorias. Escolha as sugestões mais importantes.</span>' : ''}
      </div>` : ''}
      ${sugHtml}
    </section>`}
    ${gruposAnalise(tot, metas)}
    <p class="rodape">Vitaminas e minerais: ingestão diária recomendada (IOM) para seu sexo e idade. Fibra: 14 g por 1.000 kcal. Sódio: limite da OMS. Ômega-3 EPA + DHA: 0,5 g (ISSFAL/AHA). Creatina: 3 g, referência para quem treina, não é nutriente essencial. Aminoácidos: referência da OMS por kg de peso.</p>
  </div>`;
}

function telaHistorico() {
  const cat = catalogo();
  const resumo = (chave) => {
    const d = est.dias[chave];
    if (!d || !Object.keys(d.itens ?? {}).length) return null;
    return resumoDia(d, cat, est.perfil);
  };
  const semana = [];
  for (let i = 6; i >= 0; i--) {
    const k = somarDias(ui.hoje, -i);
    const r = resumo(k);
    semana.push({ k, r, letra: DIAS[dataDeChave(k).getDay()].charAt(0) });
  }
  const comDados = semana.filter((s) => s.r);
  const media = comDados.length ? Math.round((comDados.reduce((a, s) => a + s.r.prot, 0) / comDados.length) * 100) + '%' : '—';

  const barra = (v, rot) => `<div class="mini"><span>${rot} ${Math.round(v * 100)}%</span><div class="barra barra-fina"><span class="b-${status(v, 1)}" style="width:${pct(v, 1)}%"></span></div></div>`;
  const dias = [];
  for (let i = 0; i < ui.histN; i++) {
    const k = somarDias(ui.hoje, -i);
    const r = resumo(k);
    const tipo = est.dias[k]?.tipo;
    dias.push(`<button class="cartao dia" data-acao="abrir-dia" data-dia="${k}">
      <span class="dia-topo"><strong>${i === 0 ? 'Hoje' : i === 1 ? 'Ontem' : dataCurta(k)}</strong>
        ${r ? `<span class="tag ${tipo === 'treino' ? 'tag-treino' : ''}">${tipo === 'treino' ? 'Treino' : 'Comum'}</span>` : ''}
        ${icone(ICONES.dir, 18)}</span>
      ${r ? `<span class="dia-barras">${barra(r.kcal, 'Calorias')}${barra(r.prot, 'Proteína')}${barra(r.micros / r.microsTotal, 'Micros')}</span>`
        : '<span class="suave">Sem registro. Toque para preencher.</span>'}
    </button>`);
  }

  return `<div class="tela">
    <div><p class="rotulo">Histórico</p><h1>Como foram os dias</h1>
      <p class="suave">Toque num dia para ver o que comeu e corrigir o que faltou registrar.</p></div>
    <section class="cartao">
      <div class="cartao-topo"><h2>Proteína, % da meta</h2><span class="suave">média ${media}</span></div>
      <div class="grafico">
        <div class="grafico-linha"><span>100%</span></div>
        ${semana.map((s) => `<div class="coluna" style="height:${s.r ? Math.round(Math.min(s.r.prot, 1.25) * 100) : 0}px"><span class="b-${s.r ? status(s.r.prot, 1) : 'vazio'}"></span></div>`).join('')}
      </div>
      <div class="grafico-dias">${semana.map((s) => `<span>${s.letra}</span>`).join('')}</div>
    </section>
    <div class="lista">${dias.join('')}</div>
    <button class="btn btn-contorno btn-largo" data-acao="mais-dias">Mostrar mais dias</button>
  </div>`;
}

function destaques(a) {
  const metas = calcularMetas(est.perfil, 'comum');
  const p = porcaoInfo(a);
  const d = [...VITAMINAS, ...MINERAIS, ...OUTROS, FIBRA].filter((n) => !n.limite && (a.n[n.k] || 0) * p.fator >= metas[n.k] * 0.15).map((n) => n.nome);
  return d.length ? d.join(', ') : 'energia';
}

function formulario() {
  const campo = (n) => `<label class="campo"><span>${n.nome} (${n.u})</span><input type="text" inputmode="decimal" name="n-${n.k}" placeholder="0"></label>`;
  const basicos = ['kcal', 'prot', 'carb', 'gord', 'fibra', 'na'];
  const extras = TODOS.filter((n) => !basicos.includes(n.k));
  return `<form class="cartao form" id="form-alimento">
    <h2>Novo alimento</h2>
    <label class="campo"><span>Nome</span><input type="text" name="nome" required placeholder="Ex.: Batata-doce assada"></label>
    <div class="grade-2">
      <label class="campo"><span>Medida caseira (opcional)</span><input type="text" name="medida" placeholder="Ex.: colher"></label>
      <label class="campo"><span>Gramas por medida</span><input type="text" inputmode="decimal" name="gramas" placeholder="Ex.: 25"></label>
    </div>
    <p class="suave">Valores por 100 g, como na tabela do rótulo (se o rótulo for por porção, faça a conta para 100 g).</p>
    <div class="grade-2">${basicos.map((k) => campo(TODOS.find((n) => n.k === k))).join('')}</div>
    <details><summary>Mais nutrientes (opcional)</summary><div class="grade-2">${extras.map(campo).join('')}</div></details>
    <div class="acoes"><button type="button" class="btn btn-contorno" data-acao="form-fechar">Cancelar</button>
      <button type="submit" class="btn btn-primario">Salvar alimento</button></div>
  </form>`;
}

function telaAlimentos() {
  const lista = ativos().map((a) => {
    const p = porcaoInfo(a);
    const on = naLista(a);
    const meu = a.id.startsWith('meu-');
    return `<div class="cartao alimento">
      <div class="cartao-topo"><strong>${esc(a.nome)}</strong><span class="suave">${esc(p.rotulo)}</span></div>
      <div class="macros4">
        <span><b>${fmt(a.n.kcal * p.fator)}</b>kcal</span><span><b>${fmt(a.n.prot * p.fator)} g</b>proteína</span>
        <span><b>${fmt(a.n.carb * p.fator)} g</b>carbo</span><span><b>${fmt(a.n.gord * p.fator)} g</b>gordura</span></div>
      <span class="suave">Destaques: ${esc(destaques(a))}${meu ? ' · cadastrado por você' : ''}</span>
      <details><summary>Tabela completa (por 100 g)</summary>
        <table class="tabela">${TODOS.map((n) => `<tr><td>${n.nome}</td><td>${fmt(a.n[n.k] || 0)} ${n.u}</td></tr>`).join('')}</table></details>
      ${ui.confirmar === a.id ? `<div class="faixa faixa-perigo"><span>Apagar ${esc(a.nome)} do cardápio? Os dias em que você comeu continuam no histórico.</span>
        <div class="acoes"><button class="btn btn-contorno" data-acao="cancelar">Cancelar</button>
        <button class="btn btn-perigo" data-acao="apagar" data-id="${esc(a.id)}">Apagar</button></div></div>` : ''}
      <div class="acoes acoes-espaco">
        <button class="pill" data-acao="lista-toggle" data-id="${esc(a.id)}" aria-pressed="${on}">${on ? 'Na lista rápida' : 'Fora da lista'}</button>
        <button class="btn btn-texto-perigo" data-acao="pedir-apagar" data-id="${esc(a.id)}">Apagar</button></div>
    </div>`;
  }).join('');
  const temPadraoRemovido = est.removidos.some((id) => padrao.some((a) => a.id === id));

  return `<div class="tela">
    <div><p class="rotulo">Alimentos</p><h1>Meu cardápio</h1></div>
    <section class="faixa faixa-info">
      <strong>Para cadastrar um alimento novo</strong>
      <span>O jeito principal: peça à Claude, por exemplo “cadastra batata-doce assada”. Ela preenche macros, micronutrientes e os 9 aminoácidos essenciais, que não vêm no rótulo, e o alimento aparece aqui na próxima atualização do app.</span>
      ${ui.form ? '' : '<button class="btn btn-contorno" data-acao="form-abrir">+ Cadastrar manualmente</button>'}
    </section>
    ${ui.form ? formulario() : ''}
    <div class="lista">${lista}</div>
    ${temPadraoRemovido ? '<button class="btn btn-contorno btn-largo" data-acao="restaurar">Restaurar alimentos padrão apagados</button>' : ''}
  </div>`;
}

function telaPerfil() {
  const P = est.perfil;
  const campo = (rot, k, u) => `<div class="perfil-linha"><span>${rot}</span><div class="stepper">
      <button class="passo" data-acao="perfil-menos" data-k="${k}" aria-label="Diminuir ${rot}">−</button>
      <label class="qtd qtd-perfil"><input type="text" inputmode="decimal" value="${fmt(P[k])}" data-perfil="${k}" aria-label="${rot} em ${u}"><span class="qtd-un">${u}</span></label>
      <button class="passo" data-acao="perfil-mais" data-k="${k}" aria-label="Aumentar ${rot}">+</button></div></div>`;
  const escolha = (rot, k, ops) => `<div class="perfil-bloco" role="group" aria-label="${rot}"><span>${rot}</span><div class="pills">
      ${ops.map(([v, n]) => `<button class="pill" data-acao="perfil-opcao" data-k="${k}" data-v="${v}" aria-pressed="${P[k] === v}">${n}</button>`).join('')}</div></div>`;
  const mT = calcularMetas(P, 'treino'), mC = calcularMetas(P, 'comum');
  const meta = (nome, m) => `<div class="meta-box"><span class="acento"><strong>${nome}</strong></span><span class="meta-kcal">${fmt(m.kcal)} kcal</span>
      <span>Proteína ${fmt(m.prot)} g</span><span>Carboidratos ${fmt(m.carb)} g</span><span>Gorduras ${fmt(m.gord)} g</span></div>`;

  return `<div class="tela">
    <div><p class="rotulo">Perfil e metas</p><h1>Seus dados</h1>
      ${!est.perfilDefinido ? '<p class="suave">Os valores abaixo são de exemplo. Ajuste com os seus.</p>' : ''}</div>
    <section class="cartao">
      ${campo('Peso', 'peso', 'kg')}${campo('Altura', 'altura', 'cm')}${campo('Idade', 'idade', 'anos')}
      ${escolha('Sexo', 'sexo', [['M', 'Masculino'], ['F', 'Feminino']])}
      ${escolha('Rotina fora do treino', 'rotina', [['sentado', 'Mais sentado'], ['empe', 'Em pé / andando'], ['bracal', 'Braçal']])}
      ${escolha('Objetivo', 'objetivo', [['perder', 'Perder gordura'], ['manter', 'Manter'], ['ganhar', 'Ganhar massa']])}
    </section>
    <section class="cartao">
      <div class="cartao-topo"><h2>Metas calculadas</h2><span class="suave">gasto basal ${fmt(mT.tmb)} kcal</span></div>
      <div class="grade-2">${meta('Dia de treino', mT)}${meta('Dia comum', mC)}</div>
      <p class="suave">Gasto basal pela fórmula de Mifflin-St Jeor; no dia de treino o fator de atividade sobe. Proteína de 2,0 g/kg no treino e 1,8 g/kg no dia comum, gordura de 0,9 g/kg e o restante em carboidrato.</p>
    </section>
    <section class="cartao">
      <h2>Aparência</h2>
      <div class="pills" role="group" aria-label="Tema">
        ${[['claro', 'Claro'], ['escuro', 'Escuro'], ['sistema', 'Automático']].map(([v, n]) => `<button class="pill" data-acao="tema" data-v="${v}" aria-pressed="${est.tema === v}">${n}</button>`).join('')}
      </div>
    </section>
    <section class="cartao">
      <h2>Backup</h2>
      <p class="suave">Seus registros ficam só neste aparelho. Exporte de vez em quando para não perder nada se trocar de celular.</p>
      <div class="acoes"><button class="btn btn-contorno" data-acao="exportar">Exportar backup</button>
        <button class="btn btn-contorno" data-acao="importar">Importar backup</button></div>
    </section>
    <p class="rodape">Valores dos alimentos aproximados da TACO (Unicamp) e da USDA. Este app não substitui orientação de nutricionista.</p>
  </div>`;
}

const TELAS = { hoje: telaHoje, analise: telaAnalise, historico: telaHistorico, alimentos: telaAlimentos, perfil: telaPerfil };
const ABAS = [['hoje', 'Hoje'], ['analise', 'Análise'], ['historico', 'Histórico'], ['alimentos', 'Alimentos'], ['perfil', 'Perfil']];

function render() {
  if (ui.erro) {
    $main.innerHTML = `<div class="tela"><section class="faixa faixa-perigo"><strong>Não consegui carregar os alimentos.</strong><span>${esc(ui.erro)}</span>
      <button class="btn btn-contorno" data-acao="recarregar">Tentar de novo</button></section></div>`;
  } else {
    $main.innerHTML = TELAS[ui.aba]();
  }
  $nav.innerHTML = ABAS.map(([k, n]) => `<button data-acao="aba" data-aba="${k}" ${ui.aba === k ? 'aria-current="page"' : ''}>${icone(ICONES[k], 22)}<span>${n}</span></button>`).join('');
  if (ui.aviso) { alert(ui.aviso); ui.aviso = null; }
}

function aplicarTema() {
  const root = document.documentElement;
  if (est.tema === 'sistema') delete root.dataset.tema; else root.dataset.tema = est.tema;
  const escuro = est.tema === 'escuro' || (est.tema === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? '#0C0A09' : '#F7F7F5');
}

// ---------- ações ----------
function setQtd(id, qtd) {
  const d = garantirDia(ui.dia);
  const q = Math.max(0, Math.round(qtd * 100) / 100);
  if (q > 0) {
    d.itens[id] = q;
    if (!d.base[id]) { const a = catalogo()[id]; if (a) d.base[id] = JSON.parse(JSON.stringify(a)); }
  } else {
    delete d.itens[id];
    delete d.base[id];
  }
  persistir();
  render();
}
function passoDe(id) { const a = alimentoDoDia(diaDe(ui.dia), id); return a?.medida ? 1 : 10; }
function setPerfil(k, v) { est.perfil = { ...est.perfil, [k]: v }; est.perfilDefinido = true; persistir(); render(); }

const PASSO_PERFIL = { peso: 1, altura: 1, idade: 1 };
const ACOES = {
  aba: (el) => {
    // Tocar em "Hoje" no menu sempre volta para o dia atual.
    if (el.closest('#nav') && el.dataset.aba === 'hoje') ui.dia = ui.hoje;
    ui.aba = el.dataset.aba; ui.confirmar = null; scrollTo(0, 0);
  },
  tipo: (el) => { garantirDia(ui.dia).tipo = el.dataset.tipo; persistir(); },
  mais: (el) => { const id = el.dataset.id; setQtd(id, (Number(diaDe(ui.dia).itens?.[id]) || 0) + passoDe(id)); },
  menos: (el) => { const id = el.dataset.id; setQtd(id, (Number(diaDe(ui.dia).itens?.[id]) || 0) - passoDe(id)); },
  'dia-anterior': () => { ui.dia = somarDias(ui.dia, -1); },
  'dia-proximo': () => { if (ui.dia < ui.hoje) ui.dia = somarDias(ui.dia, 1); },
  'voltar-hoje': () => { ui.dia = ui.hoje; },
  'abrir-dia': (el) => { ui.dia = el.dataset.dia; ui.aba = 'hoje'; scrollTo(0, 0); },
  'alternar-analise': () => { ui.analiseAberta = !ui.analiseAberta; },
  comer: (el) => { const id = el.dataset.id; setQtd(id, (Number(diaDe(ui.dia).itens?.[id]) || 0) + Number(el.dataset.qtd)); },
  'lista-toggle': (el) => { const a = catalogo()[el.dataset.id]; est.lista[a.id] = !naLista(a); persistir(); },
  'pedir-apagar': (el) => { ui.confirmar = el.dataset.id; },
  cancelar: () => { ui.confirmar = null; },
  apagar: (el) => {
    const id = el.dataset.id;
    if (id.startsWith('meu-')) est.meus = est.meus.filter((a) => a.id !== id);
    else if (!est.removidos.includes(id)) est.removidos.push(id);
    ui.confirmar = null; persistir();
  },
  restaurar: () => { est.removidos = est.removidos.filter((id) => !padrao.some((a) => a.id === id)); persistir(); },
  'form-abrir': () => { ui.form = true; },
  'form-fechar': () => { ui.form = false; },
  'perfil-mais': (el) => { const k = el.dataset.k; setPerfil(k, est.perfil[k] + PASSO_PERFIL[k]); },
  'perfil-menos': (el) => { const k = el.dataset.k; setPerfil(k, Math.max(1, est.perfil[k] - PASSO_PERFIL[k])); },
  'perfil-opcao': (el) => { setPerfil(el.dataset.k, el.dataset.v); },
  tema: (el) => { est.tema = el.dataset.v; persistir(); aplicarTema(); },
  'mais-dias': () => { ui.histN += 14; },
  exportar: () => {
    const blob = new Blob([JSON.stringify(est, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `alimentacao-backup-${ui.hoje}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
  importar: () => document.getElementById('arquivo-backup')?.click(),
  recarregar: () => { ui.erro = null; iniciar(); },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-acao]');
  if (!el || el.disabled) return;
  const acao = ACOES[el.dataset.acao];
  if (!acao) return;
  e.preventDefault();
  acao(el);
  render();
});

document.addEventListener('change', async (e) => {
  const el = e.target;
  if (el.matches('[data-qtd]')) setQtd(el.dataset.qtd, num(el.value));
  else if (el.matches('[data-perfil]')) setPerfil(el.dataset.perfil, num(el.value) || PERFIL_PADRAO[el.dataset.perfil]);
  else if (el.id === 'arquivo-backup' && el.files?.[0]) {
    try {
      const novo = importar(await el.files[0].text());
      if (confirm('Substituir os dados deste aparelho pelos do backup?')) { est = novo; persistir(); aplicarTema(); render(); }
    } catch (err) { alert(err.message || 'Arquivo inválido.'); }
    el.value = '';
  }
});

// Enter no campo de quantidade confirma e fecha o teclado.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('[data-qtd], [data-perfil]')) e.target.blur();
});

document.addEventListener('submit', (e) => {
  if (e.target.id !== 'form-alimento') return;
  e.preventDefault();
  const f = new FormData(e.target);
  const nome = String(f.get('nome') || '').trim();
  if (!nome) return;
  const n = {};
  for (const x of TODOS) n[x.k] = num(f.get(`n-${x.k}`) ?? 0);
  const medidaNome = String(f.get('medida') || '').trim();
  const gramas = num(f.get('gramas'));
  const medida = medidaNome && gramas > 0 ? { nome: medidaNome, plural: medidaNome.endsWith('s') ? medidaNome : medidaNome + 's', gramas } : null;
  est.meus.push({ id: `meu-${Date.now()}`, nome, medida, lista: true, n });
  ui.form = false;
  persistir();
  render();
  scrollTo(0, 0);
});

// Se o app ficou aberto e virou o dia, vai para o dia novo.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const agora = chaveData();
  if (agora !== ui.hoje) {
    if (ui.dia === ui.hoje) ui.dia = agora;
    ui.hoje = agora;
    render();
  }
});
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', aplicarTema);

async function iniciar() {
  aplicarTema();
  try {
    const r = await fetch('data/alimentos.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    padrao = (await r.json()).alimentos;
  } catch (err) {
    ui.erro = `Verifique a internet e tente de novo (${err.message}).`;
  }
  render();
}

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
iniciar();
