// Bem-estar: check-in diário, peso, exames de sangue e relatório da semana.
// Funções puras (sem DOM, sem armazenamento), testadas em tests/bemestar.test.mjs.
import { MICROS, AMINOACIDOS, CEREBRO, IDEIAS } from './nutrientes.js';
import {
  calcularMetas, somarDia, metaAgua, avaliarCafeina, energiaInstavel, sugerirPara, kcalExercicio,
} from './calculos.js';
import { somarDias, dataDeChave } from './armazenamento.js';

// ---------- check-in ----------
// Notas de 1 a 5; sono em horas.
export const CHECKIN = [
  { k: 'qualidade', nome: 'Qualidade do sono' },
  { k: 'energia', nome: 'Energia' },
  { k: 'foco', nome: 'Foco' },
  { k: 'humor', nome: 'Humor' },
];

// ---------- exames de sangue ----------
// "baixo" = abaixo do limite inferior usual. Referências variam por laboratório.
export const EXAMES = [
  { k: 'vitD', nome: 'Vitamina D (25-OH)', u: 'ng/mL', baixo: 30, ref: '30 a 100', nutriente: 'vitD' },
  { k: 'b12', nome: 'Vitamina B12', u: 'pg/mL', baixo: 300, ref: 'acima de 300', nutriente: 'b12' },
  { k: 'ferritina', nome: 'Ferritina', u: 'ng/mL', baixo: 30, ref: 'acima de 30', nutriente: 'fe' },
  { k: 'magnesio', nome: 'Magnésio', u: 'mg/dL', baixo: 1.8, ref: '1,8 a 2,6', nutriente: 'mg' },
  { k: 'folato', nome: 'Folato (ácido fólico)', u: 'ng/mL', baixo: 4, ref: 'acima de 4', nutriente: 'b9' },
  { k: 'zinco', nome: 'Zinco', u: 'µg/dL', baixo: 70, ref: '70 a 120', nutriente: 'zn' },
  { k: 'omega3', nome: 'Índice ômega-3', u: '%', baixo: 8, ref: 'acima de 8', nutriente: 'epadha' },
];

// exames: [{ k, valor, data: 'AAAA-MM-DD' }]
export function ultimoExame(exames = [], k) {
  return exames.filter((e) => e.k === k).sort((a, b) => (a.data < b.data ? 1 : -1))[0] ?? null;
}

export function exameBaixo(exame) {
  const def = EXAMES.find((e) => e.k === exame?.k);
  return !!def && Number(exame.valor) < def.baixo;
}

// Nutrientes que o último exame de cada tipo mostrou baixos.
export function nutrientesPrioritarios(exames = []) {
  return EXAMES.filter((d) => exameBaixo(ultimoExame(exames, d.k))).map((d) => d.nutriente);
}

// ---------- peso ----------
// pesos: [{ data, kg }]; um registro por dia (o novo substitui o do mesmo dia).
export function registrarPeso(pesos = [], data, kg) {
  return [...pesos.filter((p) => p.data !== data), { data, kg }].sort((a, b) => (a.data < b.data ? -1 : 1));
}

export function diasDesdeUltimoPeso(pesos = [], hoje) {
  if (!pesos.length) return Infinity;
  const ultimo = pesos[pesos.length - 1].data;
  return Math.round((dataDeChave(hoje) - dataDeChave(ultimo)) / 86400000);
}

// Variação em relação ao registro mais recente que tenha pelo menos `dias` dias.
export function variacaoPeso(pesos = [], dias = 7) {
  if (pesos.length < 2) return null;
  const atual = pesos[pesos.length - 1];
  const limite = somarDias(atual.data, -dias);
  const antes = [...pesos].reverse().find((p) => p.data <= limite);
  return antes ? atual.kg - antes.kg : null;
}

// ---------- relatório da semana ----------
const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const temRegistro = (d) => !!d && Object.keys(d.itens ?? {}).length > 0;

// Últimos 7 dias até `hoje` (inclusive).
export function relatorioSemana({ dias = {}, catalogo, perfil, alimentos = [], exames = [], pesos = [], hoje }) {
  const chaves = Array.from({ length: 7 }, (_, i) => somarDias(hoje, -6 + i));
  const prioridade = nutrientesPrioritarios(exames);
  const ateHora = perfil.cafeinaAte ?? 15;

  const registrados = [];
  const checkins = [];
  let treinos = 0, minutosTreino = 0, kcalTreino = 0, cafeinaTardia = 0, energiaRuim = 0;
  const contagem = {}; // k -> dias abaixo de 90%
  const faltaMedia = {}; // k -> soma da falta
  const metaSoma = {}; // k -> soma das metas

  for (const k of chaves) {
    const d = dias[k];
    if (!d) continue;
    if (d.checkin && Object.keys(d.checkin).length) checkins.push(d.checkin);
    if (d.tipo === 'treino') {
      treinos += 1;
      minutosTreino += Number(d.treino?.minutos) || 0;
      kcalTreino += kcalExercicio(perfil, d.treino);
    }
    if (avaliarCafeina(d.cafeina ?? [], ateHora).tardias.length) cafeinaTardia += 1;
    if (!temRegistro(d)) continue;
    const tot = somarDia(d, catalogo);
    const metas = calcularMetas(perfil, d.tipo, d.treino);
    if (energiaInstavel(tot)) energiaRuim += 1;
    registrados.push({
      kcal: tot.kcal / metas.kcal,
      prot: tot.prot / metas.prot,
      agua: (Number(d.agua) || 0) / metaAgua(perfil, d.tipo, d.treino),
    });
    for (const n of [...MICROS, ...AMINOACIDOS]) {
      if (n.limite || tot[n.k] >= metas[n.k] * 0.9) continue;
      contagem[n.k] = (contagem[n.k] ?? 0) + 1;
      faltaMedia[n.k] = (faltaMedia[n.k] ?? 0) + (metas[n.k] - tot[n.k]);
      metaSoma[n.k] = (metaSoma[n.k] ?? 0) + metas[n.k];
    }
  }

  const nReg = registrados.length;
  const mediaCheckin = {};
  for (const c of [{ k: 'sono' }, ...CHECKIN]) {
    mediaCheckin[c.k] = media(checkins.map((x) => Number(x[c.k])).filter((v) => v > 0));
  }

  // Nutriente "crônico": abaixo da meta em pelo menos metade dos dias registrados (mín. 2).
  const minimo = Math.max(2, Math.ceil(nReg / 2));
  const peso = (k) => (prioridade.includes(k) ? 0 : CEREBRO.includes(k) ? 1 : 2);
  const cronicos = [...MICROS, ...AMINOACIDOS]
    .filter((n) => (contagem[n.k] ?? 0) >= minimo)
    .map((n) => ({
      k: n.k, nome: n.nome, u: n.u, dias: contagem[n.k],
      falta: faltaMedia[n.k] / contagem[n.k], meta: metaSoma[n.k] / contagem[n.k],
      exame: prioridade.includes(n.k), cerebro: CEREBRO.includes(n.k),
    }))
    .sort((a, b) => peso(a.k) - peso(b.k) || b.dias - a.dias);

  const r = {
    chaves,
    diasRegistrados: nReg,
    kcal: media(registrados.map((x) => x.kcal)),
    prot: media(registrados.map((x) => x.prot)),
    agua: media(registrados.map((x) => x.agua)),
    checkin: mediaCheckin,
    diasCheckin: checkins.length,
    treinos, minutosTreino, kcalTreino,
    cafeinaTardia, energiaRuim,
    cronicos,
    pesoVariacao: variacaoPeso(pesos, 7),
  };
  r.ajustes = ajustesDaSemana(r, alimentos, perfil);
  return r;
}

// Até 3 ajustes, do mais importante para o menos.
export function ajustesDaSemana(r, alimentos, perfil) {
  const candidatos = [];
  const nutriente = (c) => {
    // falta média por dia, resolvida com os alimentos do cardápio
    const sugestao = sugerirPara({ k: c.k, meta: c.meta, falta: c.falta }, alimentos);
    return { tipo: 'nutriente', cronico: c, sugestao, ideia: IDEIAS[c.k] ?? IDEIAS.amino };
  };
  const [primeiro, ...outros] = r.cronicos;
  if (primeiro && (primeiro.exame || primeiro.cerebro)) candidatos.push(nutriente(primeiro));
  if (r.checkin.sono !== null && r.checkin.sono < 7) candidatos.push({ tipo: 'sono', valor: r.checkin.sono });
  if (r.prot !== null && r.prot < 0.9) candidatos.push({ tipo: 'proteina', valor: r.prot });
  if (r.agua !== null && r.agua < 0.8) candidatos.push({ tipo: 'agua', valor: r.agua, meta: metaAgua(perfil, 'comum') });
  if (r.cafeinaTardia >= 2) candidatos.push({ tipo: 'cafeina', valor: r.cafeinaTardia, ate: perfil.cafeinaAte ?? 15 });
  if (r.energiaRuim >= 2) candidatos.push({ tipo: 'energia', valor: r.energiaRuim });
  if (primeiro && !(primeiro.exame || primeiro.cerebro)) candidatos.push(nutriente(primeiro));
  for (const c of outros) candidatos.push(nutriente(c));
  return candidatos.slice(0, 3);
}
