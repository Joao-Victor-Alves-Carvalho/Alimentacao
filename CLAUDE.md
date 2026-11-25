# Alimentação — instruções para o Claude

App pessoal do João (PWA, uso principal no iPhone) para controlar a alimentação:
calorias, macros, vitaminas, minerais e aminoácidos essenciais, com metas para dia
de treino e dia comum. Conversa, código, commits e documentação em português do
Brasil.

## Estrutura

- `index.html`, `css/estilo.css`, `js/*.js`: app sem build (módulos ES).
  - `js/nutrientes.js`: lista de nutrientes (chaves, nomes, unidades).
  - `js/calculos.js`: funções puras (metas, totais, sugestões). Testadas.
  - `js/armazenamento.js`: estado no `localStorage` do aparelho.
  - `js/app.js`: telas e eventos.
- `data/alimentos.json`: alimentos padrão, valores **por 100 g** (ou 100 ml).
- `sw.js`: service worker (offline). **Aumente `VERSAO` a cada mudança no app.**
- `icones/`: ícones do app.

## Cadastrar um alimento (pedido comum do João)

1. Adicione um objeto em `data/alimentos.json` → `alimentos`:
   `id` (minúsculo, com hífens, único), `nome`, `medida` (`{"nome","plural","gramas"}`
   para medida caseira, ou `null` para gramas), `lista` (`true` para aparecer na
   lista rápida) e `n` com **todas** as chaves de `js/nutrientes.js` (`CHAVES`).
2. Valores por 100 g do alimento **no estado em que é comido** (cozido, grelhado…).
   Fontes: TACO (Unicamp) e USDA FoodData Central; aminoácidos e vitaminas que a
   TACO não traz vêm da USDA. Aminoácidos em gramas; `metcys` = metionina +
   cisteína, `phetyr` = fenilalanina + tirosina.
   `acucar` = açúcares totais (naturais + adicionados), usado no aviso de
   "energia instável".
3. Informe no PR a fonte e a medida caseira usada (ex.: "1 concha = 86 g").
4. Rode `npm test` (o teste confere chaves, valores e kcal coerentes com macros).
5. Aumente `VERSAO` em `sw.js`.

## Regras

- Fluxo autorizado pelo João (vale para toda tarefa): branch própria a partir da
  `main` atualizada → PR → esperar o workflow `testes` passar → merge pelo próprio
  Claude → conferir que o GitHub Pages publicou (o Pages publica sozinho a partir
  da `main`) → avisar o João que é só fechar e abrir o app. Se os testes falharem,
  corrigir na mesma branch ou num novo PR; nunca enviar direto para a `main`, nunca
  pular testes e nunca fazer merge com teste falhando.
- Commits convencionais (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Sem telemetria nem servidor: os registros do João ficam só no aparelho.
- Antes de entregar: `npm test` e `npm run check`. Testes não confirmam a
  experiência no iPhone: diga ao João o que ele precisa conferir no celular.
