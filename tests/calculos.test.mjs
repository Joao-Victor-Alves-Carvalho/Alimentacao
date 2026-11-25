import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularMetas, somarDia, status, sugerirPara, sugestoes, contarNaMeta, gramasDe } from '../js/calculos.js';
import { CHAVES, MICROS, AMINOACIDOS } from '../js/nutrientes.js';
import { chaveData, somarDias, importar, carregar, salvar } from '../js/armazenamento.js';

const dados = JSON.parse(readFileSync(new URL('../data/alimentos.json', import.meta.url), 'utf8'));
const cat = Object.fromEntries(dados.alimentos.map((a) => [a.id, a]));
const perfil = { peso: 80, altura: 178, idade: 30, sexo: 'M', rotina: 'sentado', objetivo: 'manter' };

test('cada alimento padrão tem todos os nutrientes, id único e medida válida', () => {
  const ids = new Set();
  for (const a of dados.alimentos) {
    assert.ok(!ids.has(a.id), `id repetido: ${a.id}`);
    ids.add(a.id);
    assert.ok(a.nome);
    for (const k of CHAVES) {
      assert.equal(typeof a.n[k], 'number', `${a.id} sem ${k}`);
      assert.ok(a.n[k] >= 0, `${a.id}.${k} negativo`);
    }
    if (a.medida) assert.ok(a.medida.gramas > 0 && a.medida.nome && a.medida.plural);
    // Calorias coerentes com os macros (tolerância larga: fibra, arredondamentos).
    const estimado = a.n.prot * 4 + a.n.carb * 4 + a.n.gord * 9;
    assert.ok(Math.abs(estimado - a.n.kcal) <= Math.max(40, a.n.kcal * 0.2), `${a.id}: kcal ${a.n.kcal} vs ${estimado}`);
  }
});

test('metas: Mifflin-St Jeor e treino maior que dia comum', () => {
  const t = calcularMetas(perfil, 'treino');
  const c = calcularMetas(perfil, 'comum');
  assert.equal(Math.round(t.tmb), 1768);
  assert.equal(Math.round(c.kcal), Math.round(1767.5 * 1.3));
  assert.equal(Math.round(t.kcal), Math.round(1767.5 * 1.55));
  assert.equal(t.prot, 160);
  assert.equal(c.prot, 144);
  assert.equal(t.gord, 72);
  assert.ok(Math.abs(t.leu - 3.12) < 1e-9);
  assert.ok(t.kcal > c.kcal);
});

test('somarDia usa a medida caseira e gramas', () => {
  const dia = { tipo: 'comum', itens: { ovo: 2, 'frango-peito': 150 } };
  const tot = somarDia(dia, cat);
  const esperado = cat.ovo.n.prot * 1 + cat['frango-peito'].n.prot * 1.5;
  assert.ok(Math.abs(tot.prot - esperado) < 1e-9);
  assert.equal(gramasDe(cat.ovo, 2), 100);
});

test('somarDia usa o alimento congelado no dia (histórico não muda)', () => {
  const antigo = { ...cat.ovo, n: { ...cat.ovo.n, prot: 100 } };
  const dia = { tipo: 'comum', itens: { ovo: 1 }, base: { ovo: antigo } };
  assert.equal(somarDia(dia, cat).prot, 50);
});

test('status e contagem', () => {
  assert.equal(status(95, 100), 'ok');
  assert.equal(status(60, 100), 'perto');
  assert.equal(status(10, 100), 'baixo');
  assert.equal(status(2100, 2000, true), 'acima');
  assert.equal(status(1000, 2000, true), 'ok');
  const metas = calcularMetas(perfil, 'comum');
  const c = contarNaMeta(somarDia({ itens: {} }, cat), metas);
  assert.equal(c.micros, 0);
  assert.equal(c.microsTotal, MICROS.length - 1);
  assert.equal(c.aminosTotal, AMINOACIDOS.length);
});

test('sugestão fecha a meta com quantidade razoável', () => {
  const alvo = { k: 'vitC', meta: 90, falta: 60 };
  const s = sugerirPara(alvo, dados.alimentos);
  assert.ok(s && !s.parcial);
  assert.ok(s.fornece >= 60);
});

test('sugestão parcial quando o cardápio não cobre', () => {
  const s = sugerirPara({ k: 'vitD', meta: 15, falta: 15 }, [cat.ovo]);
  assert.ok(s.parcial);
  assert.ok(s.qtd <= 6);
});

test('dia vazio gera plano e sugestões para tudo que falta', () => {
  const metas = calcularMetas(perfil, 'treino');
  const { lista, plano } = sugestoes(somarDia({ itens: {} }, cat), metas, dados.alimentos);
  assert.equal(lista.length, MICROS.length - 1 + AMINOACIDOS.length);
  assert.ok(Object.keys(plano).length > 0);
});

test('datas locais e backup', () => {
  assert.equal(chaveData(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(somarDias('2026-03-01', -1), '2026-02-28');
  assert.throws(() => importar('{"x":1}'));
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const e = carregar(storage);
  e.dias['2026-01-05'] = { tipo: 'treino', itens: { ovo: 3 } };
  assert.ok(salvar(e, storage));
  assert.equal(carregar(storage).dias['2026-01-05'].itens.ovo, 3);
});

test('nenhuma sugestão passa de ~400 kcal', () => {
  const metas = calcularMetas(perfil, 'treino');
  const { lista } = sugestoes(somarDia({ itens: {} }, cat), metas, dados.alimentos);
  for (const { sugestao: s } of lista) {
    if (!s) continue;
    const kcal = (s.alimento.n.kcal * gramasDe(s.alimento, s.qtd)) / 100;
    assert.ok(kcal <= 400 + 1e-9, `${s.alimento.id} x${s.qtd} = ${kcal} kcal`);
  }
});

test('ômega-3 e creatina: metas e sugestões com peixe ou suplemento', () => {
  const metas = calcularMetas(perfil, 'treino');
  assert.equal(metas.epadha, 0.5);
  assert.equal(metas.creatina, 3);
  const omega = sugerirPara({ k: 'epadha', meta: 0.5, falta: 0.5 }, dados.alimentos);
  assert.ok(omega && !omega.parcial && omega.fornece >= 0.5);
  const cr = sugerirPara({ k: 'creatina', meta: 3, falta: 3 }, dados.alimentos);
  assert.equal(cr.alimento.id, 'creatina');
  assert.equal(cr.qtd, 1);
});
