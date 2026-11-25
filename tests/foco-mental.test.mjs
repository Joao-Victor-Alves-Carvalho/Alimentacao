import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularMetas, somarDia, sugestoes, metaAgua, avaliarCafeina, energiaInstavel } from '../js/calculos.js';
import { CEREBRO, CHAVES, CAFEINA } from '../js/nutrientes.js';

const dados = JSON.parse(readFileSync(new URL('../data/alimentos.json', import.meta.url), 'utf8'));
const cat = Object.fromEntries(dados.alimentos.map((a) => [a.id, a]));
const perfil = { peso: 80, altura: 178, idade: 30, sexo: 'M', rotina: 'sentado', objetivo: 'manter' };

test('todos os nutrientes do quadro Cérebro existem e têm meta', () => {
  const metas = calcularMetas(perfil, 'comum');
  for (const k of CEREBRO) {
    assert.ok(CHAVES.includes(k), k);
    assert.ok(metas[k] > 0, k);
  }
});

test('açúcares nunca passam dos carboidratos', () => {
  for (const a of dados.alimentos) assert.ok(a.n.acucar <= a.n.carb + 1e-9, a.id);
});

test('água: 35 ml/kg e +500 ml no treino', () => {
  assert.equal(metaAgua(perfil, 'comum'), 2800);
  assert.equal(metaAgua(perfil, 'treino'), 3300);
});

test('cafeína: soma, limite de 400 mg e doses tardias', () => {
  const r = avaliarCafeina([{ mg: 90, hora: '08:10' }, { mg: 200, hora: '16:30' }, { mg: 150, hora: null }], 15);
  assert.equal(r.total, 440);
  assert.ok(r.acima);
  assert.deepEqual(r.tardias.map((e) => e.hora), ['16:30']);
  assert.equal(avaliarCafeina([], 15).total, 0);
  assert.ok(CAFEINA.every((c) => c.mg > 0));
});

test('energia instável: sucrilhos com leite sim, almoço comum não', () => {
  const cafe = somarDia({ itens: { sucrilhos: 2, 'leite-integral': 1 } }, cat);
  assert.ok(energiaInstavel(cafe));
  const almoco = somarDia({ itens: { 'arroz-branco': 6, 'feijao-carioca': 2, 'frango-peito': 150 } }, cat);
  assert.ok(!energiaInstavel(almoco));
  const lanche = somarDia({ itens: { 'banana-prata': 2, aveia: 3, whey: 1 } }, cat);
  assert.ok(!energiaInstavel(lanche));
  assert.ok(!energiaInstavel(somarDia({ itens: {} }, cat)));
});

test('sugestões começam pelos nutrientes do cérebro', () => {
  const metas = calcularMetas(perfil, 'treino');
  const { lista } = sugestoes(somarDia({ itens: {} }, cat), metas, dados.alimentos);
  const n = CEREBRO.length;
  assert.ok(lista.slice(0, n).every(({ alvo }) => alvo.cerebro));
  assert.ok(lista.slice(n).every(({ alvo }) => !alvo.cerebro));
});
