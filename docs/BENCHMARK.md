# PixelForge — Benchmark técnico do núcleo

> Qualidade > quantidade. Este documento é o gate da virada vertical (FASE A–J).
> Para cada sistema: o que a referência faz, o que o PixelForge tem HOJE (auditoria
> real do código, sem maquiagem) e o alvo técnico. Só avança de fase com o alvo cumprido.

Referências: Aseprite, Pixelorama, SpriteForge, SkelForm, Keyframe.it, God Mode AI (Spine),
Spine. Benchmark técnico, sem copiar código ou identidade visual.

Legenda de status: ✅ sólido · 🟡 funcional mas amador · 🔴 ausente/frágil

---

## CANVAS 🟢 (E1+ entregue: navegação + canvas size)

- **REFERENCE (Aseprite Canvas Size/Sprite Size/Trim):** redimensionar com âncora,
  cortar no conteúdo, dimensionar nearest, espelhar — tudo com undo.
- **CURRENT (E1+ entregue):** navegação (escada 1–64, Ctrl+wheel ancorado, pan
  H/meio/fundo, F fit, 1/2, HUD, auto-fit) + diálogo de canvas (`C` ou clique no
  tamanho no HUD): W/H + presets + âncora numpad 1–9 + aviso de corte em px +
  trim-to-content com padding + scale nearest + flip H/V (pixels + âncoras +
  hitbox + rig com re-solve FK de mundo preservado + seleção, undo único) +
  handles visuais de resize (8 bordas/cantos, Esc sai) + grade menor/maior
  configurável (1/2/4/8) + presets de criação (Ícone→Chefe, incl. 64×96).
- **TARGET:** rotação de canvas e bitmap infinito ficam DE FORA; navegação =
  content-bounded (como Aseprite); guias arrastáveis → E6.

## DRAWING (desenho livre) 🟢 (A + E2 entregues)

- **REFERENCE (Aseprite/Pixelorama):** interpolação entre eventos de ponteiro (nunca
  deixa falhas em traços rápidos); modo pixel-perfect (remove cantos duplos em
  diagonais 1px); coordenadas inteiras; pincel redondo/quadrado com preview do cursor.
- **CURRENT (E2 entregue):** interpolação; pixel-perfect 1px (P); pincel
  quadrado/redondo 1–8 + custom (captura da seleção, máscara colorida); preview do
  carimbo no hover; estabilizador 0–8 (média móvel sub-célula); pressure-size real
  p/ caneta (mouse inalterado); espelhos X/Y; borracha = brush completo.
- **TARGET:** espaçamento do carimbo custom (contínuo hoje, como o default do
  Aseprite); sem escopo novo.

## PIXEL TOOLS 🟡 → FASE A

- **REFERENCE:** lápis, borracha, balde (tolerância/contíguo), conta-gotas, linha,
  retângulo, elipse, seleção, laço, mover, recorte, degradê, simetria — cada uma com
  atalho, preview e undo corretos.
- **CURRENT:** pincel, borracha, balde (contíguo, sem tolerância — correto p/ pixel art),
  conta-gotas (+Alt), linha/ret/elipse com preview em overlay e Shift, espelho X/Y,
  grade. Atalhos B/E/G/I/L/R/O/M/T/N/P/X/Y/`[`/`]`. Bugs (1)–(4) TODOS resolvidos —
  (2) fill só empilha undo se mudou; (3) preview aplica espelho + preenchimento +
  modificadores idênticos ao commit (E2 re-verificou por inspeção + paridade
  preview/commit no código).
- **CURRENT (E2):** linha com snap 45° (Shift); retângulo quadrado (Shift), do centro
  (Alt), arredondado (raio 0–8), cheio/contorno; elipse círculo/centro/cheio
  (algoritmo auditado: simetria H/V + anel ⊆ cheio); Alt+clique = conta-gotas;
  barra de opções contextual por ferramenta.
- **TARGET:** tolerância do balde fica de fora (pixel art = contíguo exato);
  polígono/laço/varinha (→ E3).

## LAYERS 🟡 (B1 entregue; avançado → E5)

- **REFERENCE (Aseprite):** unidade de trabalho = frame × layer = cel; visibilidade,
  lock, opacidade, nome, ordem, grupos, layers de referência; blend/clipping.
- **CURRENT (B1 entregue):** modelo `frame × layer = cel` com vis/lock/opacity/nome/
  ordem + migração automática. Sem grupos/blend/alpha-lock/clipping.
- **TARGET:** grupos + blend + alpha lock + clipping (→ FASE E5).

## TIMELINE 🟢 (C1 entregue; tags → F)

- **REFERENCE (Aseprite tags):** frames + cels, duração por frame, duplicar/excluir/
  reordenar (drag), copiar/colar, tags com loops, modos de playback, step.
- **CURRENT (C1 entregue):** strip + duração por frame (ms), copiar/recortar/colar,
  drag-reorder, step ⏮/⏭. Sem tags.
- **TARGET:** tags por ação (→ FASE F).

## ANIMATION / PLAYBACK 🟢 (C2 entregue)

- **REFERENCE:** player com play/pause/loop/ping-pong/reverso, FPS real = FPS do jogo,
  preview em tamanho real + ampliado.
- **CURRENT (C2 entregue):** play/pause, ping-pong/reverso/step por ação, preview 1x
  "tamanho do jogo", fundos, tira com variação aplicada. Sem desenhar-com-play.
- **TARGET:** tags (→ F); desenhar-com-play em pesquisa.

## ONION SKIN 🟢 (C2 entregue; modos → F)

- **REFERENCE:** N frames antes/depois, opacidade, tinta por direção (vermelho/azul),
  alcance configurável; útil de verdade para in-between manual.
- **CURRENT (C2/D2 entregues):** prev/next configuráveis (contagem, opacidade, tintas)
  + ghosts das poses do rig. Sem modo outline-only/silhueta.
- **TARGET:** modo silhueta/outline-only (→ F).

## TRANSFORMS 🟢 (E3 entregue — mover/objeto/empurrar + rot/escala)

- **REFERENCE (Aseprite RotSprite):** seleção com pivô, mover/rotacionar/escalar com
  algoritmos pixel-safe (nearest, rotação que preserva clusters); flip H/V da seleção.
- **CURRENT (E3):** ferramenta seta `V` com modos **Mover** (clique-arrasta a ilha sem
  exigir pré-seleção), **Selecionar objeto** (ilha opaca 4-conectada) e **Empurrar**;
  caixa de transformação no overlay; rotação ortogonal ±90°; escala nearest 2×/½×;
  transparência não apaga o destino e cada operação tem um undo.
- **TARGET:** pivô livre/transformação contínua só se mantiver pixel-perfect; skew e
  perspectiva ficam DE FORA (conflitam com a promessa de pixels inteiros).

## SELECTION 🟢 (E3 entregue)

- **REFERENCE:** retângulo, elipse, laço, varinha; flutuar seleção; Esc cancela.
- **CURRENT (E3):** `M` expande para máscaras de retângulo, elipse, laço even-odd e
  varinha exacta 4-vizinhos; marching ants segue a máscara, não uma bbox falsa;
  mover conserva a máscara; Delete, setas e `Esc` funcionam. Captura de custom brush
  respeita a máscara, e o transform usa a mesma representação compacta linear.
- **TARGET:** combinar seleções (add/subtract/intersect) e tolerância de cor da varinha
  (deliberadamente fora deste corte para não introduzir heurística escondida).

## PALETTE 🟡 (B2 entregue; cor avançada → E4)

- **REFERENCE:** paleta indexada, slots, importar/exportar (.gpl/.pal), rampas, lock de cor.
- **CURRENT (B2 entregue):** slots editáveis + undo + importar/exportar `.gpl`;
  conta-gotas (+Alt). Sem rampas/recentes/favoritos.
- **TARGET:** rampas + dithering + shading (→ FASE E4); ASE/ACT/JSON depois.

## RIG / BONES / IK / MESH / SKIN 🟡 → FASE D/E

- **REFERENCE (SpriteForge/SkelForm/Spine):** hierarquia pai-filho com transforms locais/
  mundo matematicamente corretos, IK two-bone + FABRIK estável com limites, meshes com
  pesos, curvas de interpolação.
- **CURRENT (D2 entregue):** rig editável por projeto (`rig: Bone[]`, rest local
  x/y/rotation/length) + poses esparsas por frame (`Frame.pose`); FK puro em
  `src/lib/fk.ts` (20 testes); overlay pixel-snapped no canvas; tool N (cria
  root/filho, arrastar junta = move, arrastar corpo = gira); ghosts das poses no
  onion skin; `BonesPanel` (lista/hierarquia/rest/pose/copiar/colar); rig + poses no
  `pack.json`. Sem IK, sem skinning (fora do escopo D2).
- **TARGET FASE D/E:** two-bone IK + foot planting sobre o FK atual, tudo com teste
  matemático; curvas entram na FASE F.

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
  fundo configurável; `pack.json` com anchors/hitbox (D1) + rig/poses (D2).
  Sólido para packs; sem APNG, sem frames avulsos.
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

## Veredito FASE B2 (entregue)

1. Seleção retangular (`SelRect` normalizado, inclusivo) na camada atual, com lock respeitado.
2. Marching ants em overlay (tracejado animado, ferramenta `M`); laço elástico no marquee.
3. Mover: arrasto interno = 1 undo (`beginStroke` + `moveSelectionLive`); Esc reverte pixels + retângulo.
4. Setas movem 1px (Shift = 8px); Delete/Backspace limpa dentro; clique fora/Esc desseleciona.
5. `moveRect` puro: recorta origem, cola só opaco (transparente nunca apaga), recorta bordas.
6. Undo/redo inclui paleta + variações + renomeação/FPS; sliders coalescidos (~1.2s, sem passos vazios).
7. `.gpl` (GIMP): importar/exportar no PalettePanel; parser tolerante, roundtrip testado.
8. Testes: `select` (6), `gpl` (5), `store/history` (8) — suíte em 55/55.

## Veredito FASE C1 (entregue)

1. `Frame.durationMs` é a fonte da verdade do timing (20–2000ms, padrão 100ms).
2. `src/lib/timeline.ts`: fps↔ms, clamp, `durationsOf`, `totalDurationMs`, `frameIndexAtTime`, `moveIdTo`.
3. Migração preenche legados pelo fps da ação (timing antigo preservado); idempotente.
4. Copiar/recortar/colar frames (botões + Ctrl+C/X/V), colar após o atual, multi-colar, tudo com undo.
5. Drag-reorder no strip (drop = 1 undo); step ⏮/⏭ na UI e nas setas (store `stepFrame`).
6. Editor de ms do frame atual (commit no blur/Enter, sem spam de undo); badge `·ms` no thumb ativo.
7. FPS virou base: slider carimba 1000/fps ms em TODOS os frames (1 entrada coalescida).
8. Playback (`AnimatedSprite`), prévia e GIF usam duração por frame; JSON/pack.json trazem `durationsMs`.
9. Fix: excluir/recortar o atual seleciona o vizinho (antes pulava p/ o 1º).
10. Testes: `timeline` (13) + `store/timeline` (9) — suíte em 74/74.

## Veredito FASE C2 (entregue)

1. `Animation.playMode`: loop | ping-pong | reverso, por ação, com undo; migração preenche legados.
2. `playbackOrder`/`expandPlayback` puros: ping-pong não repete extremos; player, prévia e GIF ouvem o modo.
3. Seletor segmentado na Timeline + duração total da ação (ms/s).
4. Onion skin: 0–3 anteriores + 0–3 posteriores, opacidade 5–80%, tintas configuráveis, falloff linear.
5. Toggle onion também na Timeline (descoberta); ícone do rail corrigido (Layers → Ghost).
6. Preview 1x "tamanho do jogo"; JSON/pack.json trazem `playMode`.
7. Dicas de atalho atualizadas (M, Ctrl+C/X/V).
8. Testes: `timeline` +4, `store/timeline` +3 — suíte em 81/81.

## Veredito FASE D1 (entregue)

1. `Frame.anchors[]` + `Frame.hitbox` por frame (pixels inteiros, clampados ao canvas).
2. `src/lib/frameMeta.ts`: clamp/normalize, `opaqueBBox`, `pointInHitbox`, `pickAnchor`, `cloneFrameMeta`.
3. Migração preenche legados e saneia sujos (sem nome, fora do canvas, w/h 0); idempotente.
4. Ferramenta Âncoras (`T`): clique cria, arrasto move; hitbox move pelo corpo, redimensiona pelo SE.
5. Overlay: hitbox tracejada verde + alça, âncoras losango âmbar com nome; toggle por painel.
6. `MetaPanel`: lista c/ renomear, numerics X/Y, hitbox X/Y/W/H, auto-fit pela bbox, tudo com undo.
7. Arrasto = 1 undo (`beginStroke` + live); Esc reverte sem tocar na seleção de pixels.
8. Duplicar/copiar/colar frames carregam metadados; JSONs de export trazem `anchors`+`hitbox` por frame.
9. Testes: `frameMeta` (6) + `store/frameMeta` (6) — suíte em 94/94.

## Veredito E3 — Seleção + Transform

1. `src/lib/selection.ts`: máscaras lineares para retângulo/elipse/laço/varinha/objeto,
   bbox, move flutuante, rotação ortogonal e escala nearest; todos puros.
2. `M` escolhe a geometria na barra contextual; ants desenha a fronteira real da máscara.
3. `V` abre a ferramenta seta com modos Mover, Selecionar objeto e Empurrar; clique-arrasto
   move uma ilha opaca sem obrigar o usuário a entender seleção.
4. Rotação ±90° e escala 2×/½× são integer-safe, sem blur, com undo transacional.
5. Testes E3: 7 algoritmos novos; suíte total atual: 16 arquivos / 191 testes verdes.
