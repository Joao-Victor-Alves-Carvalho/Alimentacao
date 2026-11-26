import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calcularMetas, kcalExercicio, metaAgua, sugestoes, somarDia } from '../js/calculos.js';
import {
  EXAMES, ultimoExame, exameBaixo, nutrientesPrioritarios, registrarPeso, diasDesdeUltimoPeso,
  variacaoPeso, relatorioSemana,
} from '../js/bemestar.js';
import { somarDias } from '../js/armazenamento.js';

const dados = JSON.parse(readFileSync(new URL('../data/alimentos.json', import.meta.url), 'utf8'));
const cat = Object.fromEntries(dados.alimentos.map((a) => [a.id, a]));
const perfil = { peso: 80, altura: 178, idade: 30, sexo: 'M', rotina: 'sentado', objetivo: 'manter', cafeinaAte: 15 };

test('treino detalhado: gasto pelo MET e metas usam o exercício', () => {
  const t = { modalidade: 'musculacao', intensidade: 'moderada', minutos: 60 };
  assert.equal(kcalExercicio(perfil, t), 320); // (5 − 1) × 80 × 1 h
  assert.equal(kcalExercicio(perfil, { ...t, minutos: 0 }), 0);
  const comum = calcularMetas(perfil, 'comum');
  const detalhado = calcularMetas(perfil, 'treino', t);
  assert.equal(Math.round(detalhado.kcal), Math.round(comum.kcal + 320));
  assert.equal(detalhado.exercicio, 320);
  // Sem detalhes continua usando o acréscimo padrão.
  assert.equal(Math.round(calcularMetas(perfil, 'treino').kcal), Math.round(1767.5 * 1.55));
  // Corrida intensa gasta mais que caminhada leve.
  assert.ok(kcalExercicio(perfil, { modalidade: 'corrida', intensidade: 'intensa', minutos: 30 })
    > kcalExercicio(perfil, { modalidade: 'caminhada', intensidade: 'leve', minutos: 30 }));
});

test('água acompanha a duração do treino', () => {
  assert.equal(metaAgua(perfil, 'treino', { minutos: 30 }), 3300);
  assert.equal(metaAgua(perfil, 'treino', { minutos: 120 }), 2800 + 960);
});

test('peso: um registro por dia, ordenado, variação e lembrete semanal', () => {
  let p = registrarPeso([], '2026-11-01', 81);
  p = registrarPeso(p, '2026-11-10', 80.2);
  p = registrarPeso(p, '2026-11-10', 80); // substitui o do mesmo dia
  p = registrarPeso(p, '2026-11-05', 80.6);
  assert.deepEqual(p.map((x) => x.data), ['2026-11-01', '2026-11-05', '2026-11-10']);
  assert.equal(p.at(-1).kg, 80);
  assert.equal(Math.round(variacaoPeso(p, 7) * 10) / 10, -1);
  assert.equal(diasDesdeUltimoPeso(p, '2026-11-17'), 7);
  assert.equal(diasDesdeUltimoPeso([], '2026-11-17'), Infinity);
});

test('exames: último resultado e nutrientes prioritários', () => {
  const ex = [
    { k: 'vitD', valor: 35, data: '2026-01-10' },
    { k: 'vitD', valor: 22, data: '2026-10-01' },
    { k: 'b12', valor: 450, data: '2026-10-01' },
  ];
  assert.equal(ultimoExame(ex, 'vitD').valor, 22);
  assert.ok(exameBaixo(ultimoExame(ex, 'vitD')));
  assert.deepEqual(nutrientesPrioritarios(ex), ['vitD']);
  assert.ok(EXAMES.every((e) => e.baixo > 0 && e.nutriente));
});

test('exame baixo vem antes de tudo nas sugestões', () => {
  const metas = calcularMetas(perfil, 'comum');
  const { lista } = sugestoes(somarDia({ itens: {} }, cat), metas, dados.alimentos, ['zn']);
  assert.equal(lista[0].alvo.k, 'zn');
  assert.ok(lista[0].alvo.exame);
});

test('relatório da semana: médias, crônicos e ajustes', () => {
  const hoje = '2026-11-26';
  const dias = {};
  for (let i = 0; i < 5; i++) {
    dias[somarDias(hoje, -i)] = {
      tipo: i % 2 ? 'treino' : 'comum',
      treino: i % 2 ? { modalidade: 'musculacao', intensidade: 'moderada', minutos: 60 } : undefined,
      itens: { 'arroz-branco': 6, 'feijao-carioca': 2, 'frango-peito': 150, ovo: 2 },
      agua: 1000,
      checkin: { sono: 6, energia: 3, foco: 3, humor: 4, qualidade: 3 },
      cafeina: i < 2 ? [{ mg: 90, hora: '17:00' }] : [],
    };
  }
  dias['2026-01-01'] = { tipo: 'comum', itens: { ovo: 50 } }; // fora da janela
  const r = relatorioSemana({ dias, catalogo: cat, perfil, alimentos: dados.alimentos, hoje });
  assert.equal(r.diasRegistrados, 5);
  assert.equal(r.treinos, 2);
  assert.equal(r.minutosTreino, 120);
  assert.equal(r.checkin.sono, 6);
  assert.equal(r.cafeinaTardia, 2);
  assert.ok(r.cronicos.some((c) => c.k === 'vitD'));
  assert.ok(r.ajustes.length > 0 && r.ajustes.length <= 3);
  assert.ok(r.ajustes.some((a) => a.tipo === 'sono'));
  // Sem registros: relatório vazio sem quebrar.
  const vazio = relatorioSemana({ dias: {}, catalogo: cat, perfil, alimentos: dados.alimentos, hoje });
  assert.equal(vazio.diasRegistrados, 0);
  assert.equal(vazio.kcal, null);
});
