# Alimentação

App pessoal (PWA) para controlar a alimentação do dia a dia com foco em alta
performance: calorias, macros, **vitaminas, minerais e os 9 aminoácidos
essenciais**, com metas diferentes para **dia de treino** e **dia comum**.

## Como usar

- **Hoje**: abre sempre no dia atual. Escolha treino ou comum e marque quanto
  comeu de cada alimento (medida caseira, com os gramas indicados, ou gramas).
  No fim da tela dá para mostrar ou ocultar a análise completa.
  Também mostra o quadro **Cérebro** (ômega-3, colina, B12, folato, ferro,
  vitamina D e magnésio), os contadores de **água** e **cafeína** (com aviso de
  cafeína tarde) e um aviso de **energia instável** quando o dia tem muito
  açúcar e pouca fibra e proteína.
- **Análise**: tudo o que está baixo, na meta ou acima do limite, e sugestões
  de quanto comer dos seus alimentos para fechar as metas.
- **Histórico**: últimos dias; toque num dia para ver e corrigir.
- **Alimentos**: o cardápio. Ligue ou desligue alimentos da lista rápida, apague
  ou cadastre manualmente.
- **Perfil**: peso, altura, idade, sexo, rotina e objetivo (as metas se calculam
  sozinhas), tema claro/escuro/automático e backup.

## Instalar no celular

O app fica publicado pelo GitHub Pages em
`https://joao-victor-alves-carvalho.github.io/Alimentacao/`.

- **iPhone**: abra o link no **Safari** → botão Compartilhar → **Adicionar à
  Tela de Início**.
- **Android**: abra no **Chrome** → menu ⋮ → **Instalar app** (ou Adicionar à
  tela inicial).

Depois de instalado, ele abre em tela cheia e funciona sem internet.

### Ativar o GitHub Pages (uma vez)

Settings → Pages → *Build and deployment* → Source: **Deploy from a branch** →
Branch: **main**, pasta **/ (root)** → Save. Em um ou dois minutos o link acima
passa a funcionar.

## Cadastrar alimentos

O jeito principal é pedir à Claude ("cadastra batata-doce assada"). Ela adiciona
o alimento em `data/alimentos.json` com os valores **por 100 g** de todos os
nutrientes, incluindo os aminoácidos essenciais, e abre um PR. Depois do merge,
o app atualiza sozinho na próxima vez que for aberto com internet.

Também dá para cadastrar pelo próprio app (aba Alimentos → Cadastrar
manualmente); esses ficam salvos só no aparelho.

## Dados e privacidade

Os registros ficam **só no aparelho** (armazenamento local do navegador). Nada é
enviado para servidor. Use **Perfil → Exportar backup** de vez em quando.

Valores nutricionais aproximados da TACO (Unicamp) e da USDA FoodData Central.
Metas: Mifflin-St Jeor, IOM (vitaminas e minerais), OMS (sódio e aminoácidos).
Não substitui orientação de nutricionista.

## Desenvolvimento

Sem build: HTML, CSS e JavaScript puros (módulos ES).

```bash
npm test          # testes dos cálculos e dos dados (node --test)
npm run check     # verifica a sintaxe dos arquivos JS
python3 -m http.server 8000   # abrir http://localhost:8000
```
