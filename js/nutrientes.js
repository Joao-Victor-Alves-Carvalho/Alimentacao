// Definição de todos os nutrientes acompanhados pelo app.
// Valores dos alimentos ficam sempre "por 100 g" (ou 100 ml) em data/alimentos.json.

export const MACROS = [
  { k: 'kcal', nome: 'Calorias', u: 'kcal' },
  { k: 'prot', nome: 'Proteína', u: 'g' },
  { k: 'carb', nome: 'Carboidratos', u: 'g' },
  { k: 'gord', nome: 'Gorduras', u: 'g' },
];

export const MINERAIS = [
  { k: 'ca', nome: 'Cálcio', u: 'mg' },
  { k: 'fe', nome: 'Ferro', u: 'mg' },
  { k: 'mg', nome: 'Magnésio', u: 'mg' },
  { k: 'fosf', nome: 'Fósforo', u: 'mg' },
  { k: 'k', nome: 'Potássio', u: 'mg' },
  { k: 'zn', nome: 'Zinco', u: 'mg' },
  { k: 'cu', nome: 'Cobre', u: 'mg' },
  { k: 'mn', nome: 'Manganês', u: 'mg' },
  { k: 'se', nome: 'Selênio', u: 'µg' },
  { k: 'na', nome: 'Sódio', u: 'mg', limite: true },
];

export const FIBRA = { k: 'fibra', nome: 'Fibra', u: 'g' };

export const VITAMINAS = [
  { k: 'vitA', nome: 'Vitamina A', u: 'µg' },
  { k: 'vitC', nome: 'Vitamina C', u: 'mg' },
  { k: 'vitD', nome: 'Vitamina D', u: 'µg' },
  { k: 'vitE', nome: 'Vitamina E', u: 'mg' },
  { k: 'vitK', nome: 'Vitamina K', u: 'µg' },
  { k: 'b1', nome: 'Tiamina (B1)', u: 'mg' },
  { k: 'b2', nome: 'Riboflavina (B2)', u: 'mg' },
  { k: 'b3', nome: 'Niacina (B3)', u: 'mg' },
  { k: 'b6', nome: 'Vitamina B6', u: 'mg' },
  { k: 'b9', nome: 'Folato (B9)', u: 'µg' },
  { k: 'b12', nome: 'Vitamina B12', u: 'µg' },
];

// Referência da OMS (mg por kg de peso por dia).
export const AMINOACIDOS = [
  { k: 'leu', nome: 'Leucina', u: 'g', mgPorKg: 39 },
  { k: 'lys', nome: 'Lisina', u: 'g', mgPorKg: 30 },
  { k: 'val', nome: 'Valina', u: 'g', mgPorKg: 26 },
  { k: 'ile', nome: 'Isoleucina', u: 'g', mgPorKg: 20 },
  { k: 'thr', nome: 'Treonina', u: 'g', mgPorKg: 15 },
  { k: 'phetyr', nome: 'Fenilalanina + tirosina', u: 'g', mgPorKg: 25 },
  { k: 'metcys', nome: 'Metionina + cisteína', u: 'g', mgPorKg: 15 },
  { k: 'his', nome: 'Histidina', u: 'g', mgPorKg: 10 },
  { k: 'trp', nome: 'Triptofano', u: 'g', mgPorKg: 4 },
];

// Tudo o que entra na contagem "na meta" e nas sugestões (sódio é limite máximo).
export const MICROS = [FIBRA, ...VITAMINAS, ...MINERAIS];
export const TODOS = [...MACROS, ...MICROS, ...AMINOACIDOS];
export const CHAVES = TODOS.map((n) => n.k);

// Ideias de alimentos para cadastrar quando o cardápio não cobre um nutriente.
export const IDEIAS = {
  fibra: 'chia, linhaça, feijão',
  ca: 'iogurte, queijo, sardinha',
  fe: 'carne vermelha, feijão preto, fígado',
  mg: 'castanhas, semente de abóbora, espinafre',
  fosf: 'carnes, peixes, laticínios',
  k: 'batata, abacate, água de coco',
  zn: 'carne vermelha, semente de abóbora',
  cu: 'castanhas, fígado, cacau',
  mn: 'aveia, arroz integral, castanhas',
  se: 'castanha-do-pará, peixes, ovos',
  vitA: 'cenoura, abóbora, espinafre',
  vitC: 'laranja, acerola, kiwi',
  vitD: 'salmão, sardinha (e sol)',
  vitE: 'amêndoas, semente de girassol, azeite',
  vitK: 'couve, espinafre, brócolis',
  b1: 'carne de porco, aveia, feijão',
  b2: 'leite, ovos, fígado',
  b3: 'frango, atum, amendoim',
  b6: 'frango, banana, batata',
  b9: 'folhas verdes, feijão, lentilha',
  b12: 'carne bovina, sardinha, ovos',
  amino: 'carnes, peixes, ovos, whey',
};
