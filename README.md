# PixelForge Studio 🎮

**SaaS online para criar animações, variações e asset packs 2D/pixel art** — feito para desenvolvedores de jogos 2D e ilustradores pixel.

> Um modelo. Infinitas animações. Exporte packs sequenciados prontos para Godot, Unity, Phaser e GameMaker.

## ✨ O que o app faz

- **Editor pixel profissional** — pincel, borracha, balde, conta-gotas, linha, retângulo, elipse, espelhamento X/Y, grade e onion skin
- **Ações bem sequenciadas** — cada animação (`idle`, `andar`, `ataque`…) com seus frames, FPS e ordem garantidos
- **Forja de variações** — gere skins do mesmo modelo (sombra, gelo, ouro, veneno…) de forma não-destrutiva, aplicadas a todas as ações de uma vez
- **Troca de cores fina** — remapeie qualquer cor da paleta por variação, com prévia animada em tempo real
- **Prévia do jogo** — veja a animação na velocidade real, com fundo transparente/chroma e tira de frames
- **Export de packs** — ZIP organizado com spritesheets PNG, metadados JSON por engine, GIFs e frames avulsos (`andar__gelo_f00.png`)
- **Modelos prontos** — slime, cavaleiro, moeda e fantasma, todos animados e editáveis
- **Laboratório Procedural** — algoritmo com seed que gera personagens (5 corpos, paletas, olhos, armas, acessórios) e anima 6 ações via rig de poses: idle, andar, correr, pular, ataque e dança
- **Auto-movimento** — movimento procedural para qualquer sprite desenhado à mão: a partir de um frame, gere respirar, flutuar, pular, investida, dano (flash + tremor) e dissolve de spawn/despawn
- **Gerador de Sprites** (`/gerador`) — para quem não sabe desenhar: 5 categorias (personagem, criatura, arma, item, efeito), 6 estilos visuais, seed reproduzível, prévia animada e receita (`AssetRecipe`) que regenera o mesmo asset sempre; cria no Studio ou baixa o pack ZIP direto
- **Biblioteca** (`/biblioteca`) — packs completos de jogo em 1 clique (Herói da Aldeia, Masmorra Sombria, Caça ao Tesouro), grade animada com busca/filtros e variações 1-clique (Ouro, Brasa, Veneno, Gelo, Noturna, Irmão) com salvar individual ou em lote
- **Asset Master** (`src/lib/core`) — fonte da verdade serializável (seed + receita + esqueleto + fingerprint FNV); painel no Studio com verificação de determinismo, Master JSON e Motion Library aplicável (rig, image-space e procedural → adiciona à timeline)
- **SaaS completo** — landing page, contas, planos (Grátis/Pro/Studio) e dashboard de projetos com autosave

## 🚀 Como rodar

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # build de produção (tsc + vite)
```

## 🗺️ Rotas

| Rota | Página |
|------|--------|
| `/` | Landing page do SaaS |
| `/projetos` | Dashboard: criar, templates, projetos salvos, planos |
| `/lab` | Laboratório Procedural: gere personagens + movimentos e envie ao Studio |
| `/studio` | Editor (cria via `?template=slime` ou `?name=...&w=32&h=32`) |
| `/studio/:projectId` | Editor de um projeto salvo |

## 🧱 Stack

React 18 + TypeScript + Vite + Tailwind + Zustand + React Router + `gifenc` (GIF) + `jszip` (packs). Persistência local (localStorage) no MVP, com arquitetura pronta para backend.

## ⌨️ Atalhos do Studio

`B E G I L R O` ferramentas · `Espaço` play/pause · `←→` navegar frames · `Ctrl+Z/Y` desfazer/refazer · `Ctrl+S` salvar · `Alt+clique` capturar cor · `X` espelhar · `[ ]` tamanho do pincel
