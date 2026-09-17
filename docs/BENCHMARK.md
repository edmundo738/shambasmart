# PixelForge — Benchmark técnico do núcleo

> Qualidade > quantidade. Este documento é o gate da virada vertical (FASE A–J).
> Para cada sistema: o que a referência faz, o que o PixelForge tem HOJE (auditoria
> real do código, sem maquiagem) e o alvo técnico. Só avança de fase com o alvo cumprido.

Referências: Aseprite, Pixelorama, SpriteForge, SkelForm, Keyframe.it, God Mode AI (Spine),
Spine. Benchmark técnico, sem copiar código ou identidade visual.

Legenda de status: ✅ sólido · 🟡 funcional mas amador · 🔴 ausente/frágil

---

## DRAWING (desenho livre) 🟡 → FASE A

- **REFERENCE (Aseprite/Pixelorama):** interpolação entre eventos de ponteiro (nunca
  deixa falhas em traços rápidos); modo pixel-perfect (remove cantos duplos em
  diagonais 1px); coordenadas inteiras; pincel redondo/quadrado com preview do cursor.
- **CURRENT:** `PixelCanvas` pinta só a célula do evento atual — **traço rápido vira
  tracejado com falhas** (o defeito mais visível do editor). Sem pixel-perfect. Pincel
  quadrado 1–4px, sem preview de cursor. Cada `pointermove` clona o array inteiro de
  células e dispara `set()` mesmo repetindo a mesma célula (lixo de render em telas grandes).
- **TARGET:** interpolar segmento entre última e atual célula em todo drag de
  pincel/borracha; pixel-perfect estilo Aseprite para pincel 1px (default ON, toggle `P`);
  pular `paint` quando os índices não mudaram; preview do pincel no hover.

## PIXEL TOOLS 🟡 → FASE A

- **REFERENCE:** lápis, borracha, balde (tolerância/contíguo), conta-gotas, linha,
  retângulo, elipse, seleção, laço, mover, recorte, degradê, simetria — cada uma com
  atalho, preview e undo corretos.
- **CURRENT:** pincel, borracha, balde (contíguo, sem tolerância — correto p/ pixel art),
  conta-gotas (+Alt), linha/ret/elipse com preview em overlay e Shift=preencher,
  espelho X/Y, grade. Atalhos B/E/G/I/L/R/O/X/`[`/`]`. **Bugs reais:** (1) atalho `Y`
  anunciado no botão de espelho vertical não existe no handler; (2) `fill` empilha
  undo mesmo quando nada mudou; (3) preview das formas não mostra o espelho nem o
  preenchimento (Shift) — o resultado final difere do preview; (4) `fillAt` é um stub
  morto na store.
- **TARGET:** corrigir os 4 bugs; tolerância do balde fica de fora (pixel art usa
  contíguo exato); simetria além do espelho vai para FASE B+.

## LAYERS 🔴 → FASE B

- **REFERENCE (Aseprite):** unidade de trabalho = frame × layer = cel; visibilidade,
  lock, opacidade, nome, ordem, grupos, layers de referência; blend/clipping.
- **CURRENT:** não existe. `Frame.cells` é uma camada única chapada. O botão com ícone
  de Layers na toolbar é o toggle de onion skin (nome enganoso, corrigir label).
- **TARGET:** modelo `frame × layer = cel` com vis/lock/opacity/nome/ordem; composição
  determinística; undo por cel; migração automática dos projetos antigos (1 layer).

## TIMELINE 🟡 → FASE C

- **REFERENCE (Aseprite tags):** frames + cels, duração por frame, duplicar/excluir/
  reordenar (drag), copiar/colar, tags com loops, modos de playback, step.
- **CURRENT:** strip horizontal com add/duplicar/excluir/mover(±1)/limpar, FPS por ação
  (slider 1–24), play/pause, setas ←/→ trocam frame. Sem duração individual, sem tags,
  sem copiar/colar, sem drag-reorder, sem ping-pong/reverso/step na UI.
- **TARGET:** copiar/colar frames (Ctrl+C/V), drag-reorder, duração por frame (ms),
  step ⏮/⏭ na UI, ping-pong; tags na FASE C2.

## ANIMATION / PLAYBACK 🟡 → FASE C

- **REFERENCE:** player com play/pause/loop/ping-pong/reverso, FPS real = FPS do jogo,
  preview em tamanho real + ampliado.
- **CURRENT:** `PreviewPanel` com play/pause, fundos (transparente/escuro/claro/chroma),
  zoom 4/6/8x, tira de frames com variação aplicada, contador do pack. Loop simples;
  sem ping-pong/reverso; sem preview 1x fiel (mínimo 4x).
- **TARGET:** ping-pong + reverso + step; modo 1x "tamanho do jogo"; manter o resto.

## ONION SKIN 🟡 → FASE C

- **REFERENCE:** N frames antes/depois, opacidade, tinta por direção (vermelho/azul),
  alcance configurável; útil de verdade para in-between manual.
- **CURRENT:** só 1 frame anterior, tinta vermelha fixa, alpha 0.32 fixo. Funciona,
  mas é mínimo.
- **TARGET:** anterior+posterior, contagem (1–3), opacidade, tintas configuráveis.

## TRANSFORMS 🔴 → FASE B (com seleção)

- **REFERENCE (Aseprite RotSprite):** seleção com pivô, mover/rotacionar/escalar com
  algoritmos pixel-safe (nearest, rotação que preserva clusters); flip H/V da seleção.
- **CURRENT:** não existe mover/selecionar pixels. Espelho é só assistência de desenho.
- **TARGET FASE B:** seleção retangular + mover (arrastar, setas, recorte) com
  composite determinístico; flip H/V da seleção; rot/escala pixel-safe entram na FASE D.

## SELECTION 🔴 → FASE B

- **REFERENCE:** retângulo, elipse, laço, varinha; flutuar seleção; Esc cancela.
- **CURRENT:** ausente.
- **TARGET FASE B:** retângulo + mover + Esc; laço/varinha depois, se necessário.

## PALETTE 🟡 → FASE B

- **REFERENCE:** paleta indexada, slots, importar/exportar (.gpl/.pal), rampas, lock de cor.
- **CURRENT:** paleta por projeto (lista hex), slots editáveis, conta-gotas; sem
  import/export de arquivo; sem undo em operações de paleta.
- **TARGET:** undo em paleta; importar/exportar `.gpl`; rampas ficam p/ StyleEngine.

## RIG / BONES / IK / MESH / SKIN 🟡 → FASE D/E

- **REFERENCE (SpriteForge/SkelForm/Spine):** hierarquia pai-filho com transforms locais/
  mundo matematicamente corretos, IK two-bone + FABRIK estável com limites, meshes com
  pesos, curvas de interpolação.
- **CURRENT:** rig procedural paramétrico (`rig.ts`: nós com attach/pivot/z + poses por
  ação) + retarget image-space com 7 presets — ótimo para geração, mas **não é um rig
  editável**: sem bones manipuláveis, sem IK, sem skinning de PNG importado.
- **TARGET FASE D/E:** Bone {pos, rot, scale, length, parent, children}, FK correto,
  two-bone IK + foot planting, tudo com teste matemático; render pixel-snapped (§14).

## KEYFRAMES / CURVES 🔴 → FASE F

- **REFERENCE:** keyframes por propriedade + curvas (linear/ease/bezier) visíveis.
- **CURRENT:** frames são poses chapadas (frame-by-frame); procedural gera poses sem
  curvas editáveis.
- **TARGET:** curvas para o rig (FASE F); frame-by-frame continua sem curvas (correto).

## IMPORT 🔴 → FASE G

- **REFERENCE:** PNG/spritesheet com detecção de grade, Aseprite (.ase) preservando
  layers/frames/paleta.
- **CURRENT:** **não existe importação alguma** (só templates internos e geração).
- **TARGET:** PNG (1 frame) → frame atual com undo; spritesheet (linhas×colunas) →
  frames; `.ase` se viável sem dependência pesada.

## EXPORT 🟡 → FASE G

- **REFERENCE (Aseprite CLI):** PNG, GIF/APNG, spritesheet + JSON com anchors/hitboxes,
  frames individuais, export por tag/variação.
- **CURRENT:** ZIP com spritesheets + GIF + JSON por animação/variação, escala inteira,
  fundo configurável. Sólido para packs; sem APNG, sem frames avulsos, sem metadata
  de anchors/hitboxes.
- **TARGET:** + frames PNG avulsos + APNG; anchors/hitboxes com o rig (FASE D).

## AUTOSAVE 🟡 → FASE H

- **REFERENCE:** salvamento contínuo + snapshots + recuperação de crash ("reabrir onde parou").
- **CURRENT:** debounce 900ms → localStorage + Ctrl+S. Funciona; sem snapshots, sem
  tela de recuperação, sem proteção contra quota estourada além de try/catch.
- **TARGET:** snapshot rotativo (últimos N) + banner de recuperação ao abrir.

## UNDO/REDO 🟡 → FASE A/H

- **REFERENCE:** tudo desfazível (desenho, layers, frames, bones, poses, timeline,
  paleta, transform); drag = 1 transação; limite de memória previsível.
- **CURRENT:** snapshots JSON full-project (frames+animações), limite 60, drag agrupa
  via `beginStroke` ✓. **Falhas:** variações, paleta e FPS não entram no histórico;
  snapshot inteiro por traço é pesado em projetos grandes (aceitável até 128px,
  medir além).
- **TARGET FASE A:** não empilhar undo vazio (fill sem mudança); documentar limite.
  **FASE H:** paleta/variações no histórico; trocar para diff por cel se o benchmark
  de 256px+ reprovar.

## PERFORMANCE 🟡 → FASE I (medir já)

- **REFERENCE:** 60fps de interação com muitas layers/frames; dirty regions, cache,
  incremental; workers p/ export pesado.
- **CURRENT:** render full-canvas por `set()` (fillRect por pixel, ok até 64–128px);
  `paint` clona cells por evento; export GIF/ZIP síncrono na thread principal.
- **TARGET:** medir render/paint em 32→2048 + 10/50/100 frames (tabela na FASE I);
  pular paints redundantes (FASE A); cache/incremental conforme o laudo.

## MOBILE 🔴 → depois da FASE J (só não quebrar a arquitetura)

- **REFERENCE:** canvas-cêntrico, bottom sheets, gestos, timeline compacta.
- **CURRENT:** layout desktop; sem gestos.
- **TARGET agora:** nenhum — apenas não acoplar o engine ao mouse (ponteiro genérico
  já usado ✓). FASE MOBILE após J.

---

## Veredito FASE A (entregue)

1. Interpolação de traço (fim do tracejado).
2. Pixel-perfect 1px (default ON) + toggle `P`.
3. Pular `paint` redundante.
4. `fill` só empilha undo se mudou algo.
5. Atalho `Y` do espelho vertical funcionando.
6. Preview de forma = resultado final (espelho + Shift).
7. Remover stub morto `fillAt`.
8. Suíte de testes `tests/pixel/` (vitest) cobrindo os algoritmos acima.

## Veredito FASE B1 (entregue)

1. Modelo `frame × layer = cel` (`Frame.cels`, `ProjectData.layers`).
2. `src/lib/layers.ts`: composite fundo→topo, flatten topmost-wins, migração idempotente.
3. `LayersPanel`: add/renomear/excluir/reordenar + vis/lock/opacidade, tudo funcional.
4. Pintura respeita camada atual + lock; conta-gotas lê o composto.
5. Render (canvas, thumbs, previews) e export (sheet/GIF/sequência/PNG) por camada com alpha.
6. Undo/redo inclui estrutura das layers; metadata do ZIP lista as layers.
7. Testes `tests/pixel/layers.test.ts` (12 testes: composite, migração, idempotência).

## FASE B2 (próxima)

Seleção retangular + mover (arrastar, setas, Esc), undo em paleta/variações, `.gpl`.
