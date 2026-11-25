// Cálculos puros (sem DOM, sem armazenamento): metas, totais do dia e sugestões.
import { MICROS, AMINOACIDOS, CHAVES, IDEIAS } from './nutrientes.js';

export const FATOR_ROTINA = { sentado: 1.3, empe: 1.45, bracal: 1.6 };
export const AJUSTE_OBJETIVO = { perder: 0.85, manter: 1, ganhar: 1.1 };
export const EXTRA_TREINO = 0.25;

// Ingestão diária recomendada (IOM/DRI) por sexo e idade. Sódio: limite da OMS.
export function metasMicros({ sexo, idade }, kcal) {
  const f = sexo === 'F';
  return {
    fibra: (14 * kcal) / 1000,
    ca: (f && idade > 50) || idade > 70 ? 1200 : 1000,
    fe: f && idade <= 50 ? 18 : 8,
    mg: f ? (idade > 30 ? 320 : 310) : idade > 30 ? 420 : 400,
    fosf: 700,
    k: f ? 2600 : 3400,
    zn: f ? 8 : 11,
    cu: 0.9,
    mn: f ? 1.8 : 2.3,
    se: 55,
    na: 2000,
    vitA: f ? 700 : 900,
    vitC: f ? 75 : 90,
    vitD: idade > 70 ? 20 : 15,
    vitE: 15,
    vitK: f ? 90 : 120,
    b1: f ? 1.1 : 1.2,
    b2: f ? 1.1 : 1.3,
    b3: f ? 14 : 16,
    b6: idade > 50 ? (f ? 1.5 : 1.7) : 1.3,
    b9: 400,
    b12: 2.4,
  };
}

// Mifflin-St Jeor; no dia de treino o fator de atividade sobe.
export function calcularMetas(perfil, tipo) {
  const { peso, altura, idade, sexo, rotina, objetivo } = perfil;
  const tmb = 10 * peso + 6.25 * altura - 5 * idade + (sexo === 'F' ? -161 : 5);
  const base = FATOR_ROTINA[rotina] ?? FATOR_ROTINA.sentado;
  const fator = tipo === 'treino' ? base + EXTRA_TREINO : base;
  const kcal = tmb * fator * (AJUSTE_OBJETIVO[objetivo] ?? 1);
  const prot = peso * (tipo === 'treino' ? 2.0 : 1.8);
  const gord = peso * 0.9;
  const carb = Math.max(0, (kcal - prot * 4 - gord * 9) / 4);
  const metas = { tmb, kcal, prot, carb, gord, ...metasMicros(perfil, kcal) };
  for (const a of AMINOACIDOS) metas[a.k] = (a.mgPorKg * peso) / 1000;
  return metas;
}

export function zeros() {
  const t = {};
  for (const k of CHAVES) t[k] = 0;
  return t;
}

// A quantidade digitada é na medida caseira (se o alimento tiver) ou em gramas.
export function gramasDe(alimento, qtd) {
  return alimento.medida ? qtd * alimento.medida.gramas : qtd;
}

// dia = { tipo, itens: {id: qtd}, base: {id: alimento congelado no dia} }
export function somarDia(dia, catalogo) {
  const tot = zeros();
  for (const [id, q] of Object.entries(dia?.itens ?? {})) {
    const qtd = Number(q) || 0;
    const al = dia.base?.[id] ?? catalogo[id];
    if (!al || qtd <= 0) continue;
    const fator = gramasDe(al, qtd) / 100;
    for (const k of CHAVES) tot[k] += (al.n[k] || 0) * fator;
  }
  return tot;
}

// 'ok' (90%+), 'perto' (50–89%), 'baixo' (<50%); limite: 'ok' ou 'acima'.
export function status(valor, meta, limite = false) {
  const pct = meta > 0 ? valor / meta : 0;
  if (limite) return pct > 1 ? 'acima' : 'ok';
  if (pct >= 0.9) return 'ok';
  if (pct >= 0.5) return 'perto';
  return 'baixo';
}

export function contarNaMeta(tot, metas) {
  const micros = MICROS.filter((n) => !n.limite);
  return {
    micros: micros.filter((n) => status(tot[n.k], metas[n.k]) === 'ok').length,
    microsTotal: micros.length,
    aminos: AMINOACIDOS.filter((n) => status(tot[n.k], metas[n.k]) === 'ok').length,
    aminosTotal: AMINOACIDOS.length,
  };
}

export function resumoDia(dia, catalogo, perfil) {
  const tot = somarDia(dia, catalogo);
  const metas = calcularMetas(perfil, dia.tipo);
  return {
    tot,
    metas,
    kcal: tot.kcal / metas.kcal,
    prot: tot.prot / metas.prot,
    ...contarNaMeta(tot, metas),
  };
}

// Limites de uma sugestão: até 300 g do alimento e até ~400 kcal.
export const MAX_GRAMAS_SUGESTAO = 300;
export const MAX_KCAL_SUGESTAO = 400;

function passoMax(al) {
  const passo = al.medida ? 1 : 10;
  const kcalPorPasso = ((al.n.kcal || 0) * gramasDe(al, passo)) / 100;
  const porKcal = kcalPorPasso > 0 ? Math.floor(MAX_KCAL_SUGESTAO / kcalPorPasso) * passo : Infinity;
  const porPeso = al.medida ? Math.min(8, Math.floor(MAX_GRAMAS_SUGESTAO / al.medida.gramas)) : MAX_GRAMAS_SUGESTAO;
  return { passo, max: Math.max(0, Math.min(porKcal, porPeso)) };
}

// Melhor alimento do cardápio para fechar um nutriente: maior densidade por caloria
// que feche a meta numa quantidade razoável; se nenhum fechar, o que mais contribui.
export function sugerirPara(alvo, alimentos) {
  const cands = alimentos
    .map((al) => {
      const { passo, max } = passoMax(al);
      const porUn = (al.n[alvo.k] || 0) * gramasDe(al, 1) / 100;
      if (max < passo || porUn <= 0 || porUn * (al.medida ? 1 : 100) < alvo.meta * 0.05) return null;
      const qtd = Math.max(passo, Math.ceil(alvo.falta / porUn / passo) * passo);
      return { al, porUn, max, qtd, dens: (al.n[alvo.k] || 0) / Math.max(al.n.kcal || 0, 1) };
    })
    .filter(Boolean);
  if (!cands.length) return null;
  const fecha = cands.filter((c) => c.qtd <= c.max).sort((a, b) => b.dens - a.dens)[0];
  if (fecha) return { alimento: fecha.al, qtd: fecha.qtd, fornece: fecha.porUn * fecha.qtd, parcial: false };
  const melhor = cands.sort((a, b) => b.porUn * b.max - a.porUn * a.max)[0];
  return { alimento: melhor.al, qtd: melhor.max, fornece: melhor.porUn * melhor.max, parcial: true };
}

export function sugestoes(tot, metas, alimentos) {
  const alvos = [];
  for (const n of MICROS) {
    if (n.limite || tot[n.k] >= metas[n.k] * 0.9) continue;
    alvos.push({ ...n, meta: metas[n.k], falta: metas[n.k] - tot[n.k], ideia: IDEIAS[n.k] });
  }
  for (const n of AMINOACIDOS) {
    if (tot[n.k] >= metas[n.k] * 0.9) continue;
    alvos.push({ ...n, meta: metas[n.k], falta: metas[n.k] - tot[n.k], ideia: IDEIAS.amino });
  }
  const plano = {};
  const lista = alvos.map((alvo) => {
    const s = sugerirPara(alvo, alimentos);
    if (s && !s.parcial) plano[s.alimento.id] = Math.max(plano[s.alimento.id] ?? 0, s.qtd);
    return { alvo, sugestao: s };
  });
  return { lista, plano };
}
