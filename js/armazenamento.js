// Estado salvo no próprio aparelho (localStorage). Nada vai para a internet.
const CHAVE = 'alimentacao:v1';

export const PERFIL_PADRAO = {
  peso: 80, altura: 178, idade: 30, sexo: 'M', rotina: 'sentado', objetivo: 'manter',
};

export function estadoVazio() {
  return {
    versao: 1,
    perfil: { ...PERFIL_PADRAO },
    perfilDefinido: false,
    tema: 'sistema', // 'claro' | 'escuro' | 'sistema'
    dias: {}, // 'AAAA-MM-DD' -> { tipo, itens: {id: qtd}, base: {id: alimento} }
    meus: [], // alimentos cadastrados no próprio app
    removidos: [], // ids de alimentos apagados do cardápio
    lista: {}, // id -> true/false (sobrescreve o padrão da lista rápida)
  };
}

export function carregar(storage = globalThis.localStorage) {
  try {
    const bruto = storage?.getItem(CHAVE);
    if (!bruto) return estadoVazio();
    return { ...estadoVazio(), ...JSON.parse(bruto) };
  } catch {
    return estadoVazio();
  }
}

export function salvar(estado, storage = globalThis.localStorage) {
  try {
    storage?.setItem(CHAVE, JSON.stringify(estado));
    return true;
  } catch {
    return false;
  }
}

export function importar(texto) {
  const dados = JSON.parse(texto);
  if (!dados || typeof dados !== 'object' || typeof dados.dias !== 'object') {
    throw new Error('Arquivo de backup inválido.');
  }
  return { ...estadoVazio(), ...dados };
}

// Datas sempre no fuso do aparelho.
export function chaveData(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dataDeChave(chave) {
  const [a, m, d] = chave.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function somarDias(chave, n) {
  const d = dataDeChave(chave);
  d.setDate(d.getDate() + n);
  return chaveData(d);
}
