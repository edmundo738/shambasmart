# PixelForge Studio — Arquitetura

> Documento vivo da **Fase 1 (auditoria)** + arquitetura-alvo (Asset Master).
> Princípios: mesma seed = mesmo asset · procedural gera receita, não imagem descartável ·
> o procedural amplia o artista, nunca o substitui · o app deve funcionar para quem não sabe desenhar.

## 1. Auditoria do código atual

### Rotas (`src/App.tsx`)

| Rota | Página | Papel |
|------|--------|-------|
| `/` | `pages/Landing.tsx` | Marketing do SaaS + vitrine animada |
| `/projetos` | `pages/Projects.tsx` | Dashboard: criar, templates, salvos, planos |
| `/lab` | `pages/Lab.tsx` | Laboratório procedural (personagens + rig + seeds) |
| `/gerador` | `pages/Generator.tsx` | Gerador guiado para não-artistas (5 categorias) |
| `/studio` | `pages/Studio.tsx` | Editor profissional |
| `/studio/:projectId` | `pages/Studio.tsx` | Editor de projeto salvo |

### Modelo de dados (`src/types.ts`)

- `Frame { id, cells: string[] }` — `""` = transparente, senão `#rrggbb`.
- `Animation { id, name, fps, frameIds[] }` — ação = sequência ordenada de frames.
- `Variation { id, name, mapping, hue, sat, light }` — remapeamento não-destrutivo.
- `ProjectData { id, name, width, height, frames, animations, variations, palette, recipe?, createdAt, updatedAt }`.
- `AssetRecipe { version, kind, seed, subtype, style, size, outline, hueShift, actions[], motion?, intensity? }` — a **receita reproduzível** de assets gerados.

### Stores (Zustand)

- `store/studio.ts` — projeto aberto + estado do editor (tool, cor, seleção, zoom, onion...),
  histórico undo/redo (snapshots de frames+animações, limite 60), CRUD de frames/ações/variações/paleta.
- `store/projects.ts` — persistência localStorage (`pixelforge_project_*` + metas com thumbnail).
- `store/auth.ts` — conta/plano simulados (MVP local).

### Renderização

- Editor: `<canvas>` com `image-rendering: pixelated`, pintura por célula, grade, onion skin,
  overlay de formas (linha/retângulo/elipse), espelhamento, zoom 4–32x.
- Reutilizável: `components/SpriteView.tsx` (`SpriteCanvas` estático + `AnimatedSprite` com rAF).
- Export: `lib/exporters.ts` — spritesheet, JSON por engine (generic/phaser/godot/unity/gamemaker),
  GIF (`gifenc`, paleta global + transparência), pack ZIP (`jszip`) com manifesto + LEIAME.

### Motores procedurais (`src/lib/procgen/`)

| Módulo | Papel |
|--------|-------|
| `rng.ts` | PRNG `mulberry32` + helpers (pick/range/chance/hue) |
| `rig.ts` | Rig hierárquico: nós, pivôs, pose (dx/dy/rot/sx/sy/alt/visible), rasterizador + outline automático + `renderStatic` |
| `bodies.ts` | DNA de personagens: 5 corpos, paletas por clima, olhos, bocas, armas, acessórios, efeitos |
| `motions.ts` | Motion engine por grupo (bípede/blob/quadrúpede) × 6 ações, foot planting, janelas de FX |
| `generator.ts` | Fachada personagem/criatura: `generateCharacter` + `generateActionFrames` + `ACTION_DEFS` |
| `retarget.ts` | Auto-movimento p/ sprites manuais: 7 presets via deformação no espaço da imagem |
| `styles.ts` | 6 estilos visuais (Fantasia, Sci-fi, Fofo, Sombrio, Retrô, Natureza) |
| `weapons.ts` | Gerador de armas (7 tipos + idle/brilho) |
| `items.ts` | Gerador de itens/props (8 tipos + idle/brilho, tocha com chama viva) |
| `fx.ts` | Gerador de efeitos (explosão, faíscas, corte, fumaça, anel) |
| `sprites.ts` | Fachada unificada `generateSprite(kind, req)` + hue-shift + receita |

### Fluxos principais

- **Pintura**: `PixelCanvas` (pointer events + captura) → `beginStroke()` → `paint(indices)` → autosave 900ms.
- **Variações**: aplicadas em preview/export via `applyVariationToColor` (nunca no dado).
- **Pack**: `buildPackZip` = ações × (original+variações) → PNG/JSON/GIF/frames + `pack.json`.
- **Procgen → Studio**: Lab/Gerador produzem `ProjectData` (+`recipe`) → `saveProject` → `/studio/:id`.

## 2. Arquitetura-alvo: Asset Master

Pipeline oficial do produto (evolução incremental, sem reescrever o que funciona):

```
Asset Master → estrutura → peças → esqueleto → pose → câmera → render
  → pixelização → variações → exportação
```

Camadas do core (independentes de React, testáveis em Node):

```
packages/core (alvo futura separação; hoje: src/lib/)
├── asset/      Asset Master: parts, layers, anchors, pivôs, metadados, hitboxes
├── rig/        skeleton genérico (qualquer topologia), FK + IK (FABRIK), constraints
├── motion/     motion primitives + ações paramétricas + loop checker
├── camera/     2D multi-direção → 2.5D (MVP: projeção ortográfica)
├── render/     rasterização alvo, pixel snap, palette mapping, outline, shading, dither
├── procgen/    regras + seeds + estilos + roupas/equipamentos
└── export/     spritesheet/atlas/GIF/APNG/ZIP/JSON + presets de engine
```

Regras de engenharia:

1. **Receita > imagem**: todo gerador retorna dados + `recipe` que reconstrói o asset.
2. **Determinismo**: mesma seed + mesmos parâmetros = mesmos bytes (testes de regressão por seed).
3. **Lógica fora do React**: componentes apenas despacham para o core.
4. **Render incremental**: paleta/roupa/frame alterado não recalcula o resto (memoização; workers p/ batch).
5. **Nada decorativo**: todo controle altera o resultado de verdade.

## 3. Roadmap por fases (status)

- [x] **F1 — Audit + arquitetura** (este documento)
- [x] **F2 (parcial) — Studio profissional**: editor, timeline, layers de UI, atalhos
- [x] **F3 (parcial) — Core separado da UI**: `src/lib` puro + fachadas
- [x] **F4 (parcial) — Parts + recipe**: rig parts, `AssetRecipe`, `RecipeCard`
- [x] **F5 (parcial) — Rig**: hierarquia + poses + blink/alts (IK completo pendente)
- [x] **F6 (parcial) — Motion**: 6 ações × 3 grupos + 7 presets de auto-movimento
- [x] **F9 (parcial) — Variantes**: 6 temas determinísticos sobre `AssetRecipe` + modal compara/salva (forma/roupa/raridade pendentes)
- [x] **F11 (parcial) — Batch**: 3 packs temáticos coerentes + ZIP combinado + grade da Biblioteca (fila/galeria de candidatos pendentes)
- [ ] **F7 — Multi-ângulo**: 4/8 direções do mesmo Master (próx. núcleo grande)
- [ ] **F8 — 2.5D**: profundidade, câmera orbital, projeção ortográfica
- [ ] **F9 — Variantes profundas**: forma/proporção/roupa/raridade + LOCK/REROLL
- [ ] **F10 — Roupas/equipamentos**: categorias, encaixes, compatibilidade, z-depth por pose
- [ ] **F11 — Batch**: fila de geração, galeria de candidatos, compare
- [ ] **F12 — Export robusto**: APNG, atlas, Aseprite-compat, anchors/hitboxes no JSON
- [ ] **F13 — Mobile**: toolbar inferior, bottom sheets, gestos, timeline compacta
- [ ] **F14 — Performance**: workers, OffscreenCanvas, cache incremental, 60fps
- [ ] **F15 — QA**: suíte de regressão por seeds + checklist de demo (20 itens)

## 4. Modelo de negócio (resumo)

Edição + export básico sempre úteis no grátis, sem watermark obrigatório.
Cobrança = nuvem, colaboração, render/batch pesado, versionamento, equipes.
Usuário é dono dos assets; projeto sempre baixável (JSON + ZIP abertos).
