# PixelForge — Auditoria Comparativa (pré-Editor Core)

Data: 2026-09-18. Objetivo: mapear **onde cada ferramenta vence**, **o que falta no
PixelForge** e **onde podemos ultrapassar todo mundo** — antes de escrever a FASE E.
Complementa `docs/BENCHMARK.md` (que mede o nosso núcleo contra a referência ideal).

Metodologia: pesquisa web nas fontes abaixo + conhecimento geral do domínio.
Células marcadas com `~` = confiança média (confirmar antes de citar como fato).
Legenda: ✅ tem · 🟡 parcial/limitado · ❌ não tem · FOSSO = ninguém tem, nós
temos ou vamos construir.

Fontes: Wikipedia/Aseprite · GitHub Pixelorama · Godot showcase · Slant
Aseprite-vs-Piskel · SourceForge LibreSprite · Aseprite tools overview ·
Krita features · docs oficiais de cada projeto.

## 1. Perfis (resumo honesto)

| Ferramenta | Natureza | Preço | Plataforma | Essência |
|---|---|---|---|---|
| **Aseprite** | Proprietário, source-available (era GPL até 2016) | ~US$20, perpétuo | Win/Mac/Linux | O padrão-ouro do pixel art: pixel-perfect, tags, indexed, tilemap, Lua+CLI. Sem rig, sem procedural, sem web. |
| **LibreSprite** | GPL, fork do Aseprite pré-2016, comunitário | Grátis | Win/Mac/Linux | "Aseprite antigo grátis": núcleo sólido (layers, onion, dithering pens, simetria), mas parado no tempo. |
| **Pixelorama** | Open-source (Godot 4, GDScript) | Grátis | Win/Mac/Linux/**Web** | O rival mais completo: guides, grids iso, clipping masks, FX não-destrutivos, rotxel/OmniScale, APNG, vídeo, metadata por cel, CLI. Sem rig, sem procedural. |
| **Piskel** | Open-source | Grátis | **Web** + desktop | Simplicidade campeã: desenhar+animar+exportar em minutos. Teto baixo (sem grupos, sem tags, sem seleção avançada). |
| **Krita** | Open-source | Grátis | Desktop (+Android) | Pintura digital profissional: 100+ brush engines, estabilizador, multibrush (caleidoscópio), máscaras de transformação, animação com onion. Fraco em pixel (sem indexed, sem pixel-perfect, sem spritesheet). |
| **Photoshop** | Proprietário, Adobe | Assinatura | Desktop (+iPad/web parcial) | Tudo raster existe, mas nada é pixel-first: transform borra, sem tags, sem spritesheet nativo, sem onion decente fora do vídeo. |

## 2. Matriz — CANVAS ENGINE

| Recurso | Aseprite | LibreSprite | Pixelorama | Piskel | Krita | PS | PF hoje | Alvo |
|---|---|---|---|---|---|---|---|---|
| Zoom amplo + fit + custom | ✅ | ✅ | ✅ | 🟡 limitado | ✅ | ✅ | 🟡 4–32, sem fit | E1 |
| Ctrl+wheel zoom-no-cursor | ✅ | ✅ | ✅ | ❌~ | ✅ | ✅ | ❌ | E1 |
| Pan (espaço/mão/meio) | ✅ | ✅ | ✅ | 🟡 mão | ✅ | ✅ | ❌ só scroll | E1 |
| Rotação de canvas | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | FORA* |
| Render pixel fiel (nearest) | ✅ | ✅ | ✅ | ✅ | 🟡~ | 🟡 | ✅ | — |
| HUD mínima (zoom/frame/layer/tool) | 🟡 barras | 🟡 | 🟡 | ❌ | 🟡 | 🟡 | 🟡 hints parcial | E1 |

\* Rotação de canvas: irrelevante para pixel art (ninguém do segmento tem). Riscar.

## 3. Matriz — ART TOOLS

| Recurso | Aseprite | LibreSprite | Pixelorama | Piskel | Krita | PS | PF hoje | Alvo |
|---|---|---|---|---|---|---|---|---|
| Pincel quad/redondo/linha | ✅ | ✅ | ✅ | ✅~ | ✅ | ✅ | 🟡 quad só | E2 |
| Brush custom (de imagem) | ✅ Ctrl+B | 🟡~ | ✅~ | ❌ | ✅ | ✅ | ❌ | E2 |
| Dinâmica (pressão/velocidade) | ✅ | 🟡~ | ✅ | ❌ | ✅ | ✅ | ❌ | E2 |
| Estabilização de traço | ❌ | ❌ | ❌~ | ❌ | ✅ | ✅~ | ❌ | E2 |
| Pixel-perfect | ✅ | ✅~ | ✅ | ❌ | ❌ | ❌ | ✅ (1px) | — |
| Linha: preview + Shift-snap | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Retângulo (fill/outline/□/centro) | ✅ | ✅ | ✅ | 🟡 | ✅ | ✅ | 🟡 Shift=fill | E2 |
| Elipse pixel-perfect | ✅ | ✅~ | ✅ | ✅~ | 🟡 borra | 🟡 borra | 🟡 auditar | E2 |
| Polígono/curva | ✅~ | ❌ | ✅~ | ❌ | ✅ | ✅ | ❌ | E3 |
| Dithering (Bayer/ordenado) | 🟡 gradiente+custom | ✅ dither pens~ | 🟡~ | 🟡~ | 🟡 texturas | ✅ gradiente | ❌ | E4 |
| Dodge/burn/hue-shift | 🟡~ | ❌ | ✅ efeitos | 🟡 claro/escuro~ | ✅ | ✅ | ❌ | E4 |
| Outline automático | ❌~ | ❌ | ✅ fx camada | ❌ | ❌ | ✅ stroke | ❌ | E4 |
| Simetria espelho | ✅ | ✅ | ✅ | ✅ mirror pen | ✅ | ✅ | ✅ X/Y | — |
| Simetria radial/caleidoscópio | ❌~ | ❌ | ❌~ | ❌ | ✅ multibrush | ❌~ | ❌ | E6 |
| Imagem de referência | 🟡 layer ref 1.3+ | ❌ | ❌~ | ❌ | ✅ docker | ✅ | ❌ | E6 |
| Borracha = brush completo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 tamanhos | E2 |

## 4. Matriz — SELECTION + TRANSFORM

| Recurso | Aseprite | LibreSprite | Pixelorama | Piskel | Krita | PS | PF hoje | Alvo |
|---|---|---|---|---|---|---|---|---|
| Sel. ret/elipse/laço/poly | ✅ | ✅ | ✅ | 🟡 ret+laço~ | ✅ | ✅ | 🟡 ret só | E3 |
| Varinha mágica / por cor | ✅ | ✅~ | ✅ | ❌ | ✅ | ✅ | ❌ | E3 |
| Mover/copiar/colar/flip | ✅ | ✅ | ✅ | ✅~ | ✅ | ✅ | 🟡 mover+flip | E3 |
| Rot/escala pixel-safe | ✅ RotSprite | 🟡~ | ✅ rotxel | ❌ | ❌ borra | ❌ borra | ❌ | E3 |
| Skew/perspectiva livres | 🟡~ | ❌ | 🟡~ | ❌ | ✅ | ✅ | ❌ | FORA* |
| Expand/contract/feather/invert | ✅~ | 🟡~ | ✅~ | ❌ | ✅ | ✅ | ❌ | E3 parcial |

\* Skew/perspectiva/rotate-livre destroem clusters de pixel. Só entra versão
pixel-safe (90°/flip/escala inteira + algoritmo dedicado). Decisão alinhada ao
mandato pixel-perfect do projeto.

## 5. Matriz — COLOR ENGINE

| Recurso | Aseprite | LibreSprite | Pixelorama | Piskel | Krita | PS | PF hoje | Alvo |
|---|---|---|---|---|---|---|---|---|
| Paleta edit/reord/salvar | ✅ | ✅ | ✅ | ✅~ | ✅ | ✅ | ✅ | — |
| Import/export (GPL/ASE/JSON/ACT) | ✅+ | 🟡~ | ✅ vários | 🟡~ | ✅ | ✅ | 🟡 GPL | E4 |
| **Gerador de rampas** | ❌~ | ❌ | ❌~ | ❌ | ❌ | ❌ | ❌ | **E4 FOSSO** |
| Picker (layer/merged/média) | ✅ | ✅~ | ✅ | 🟡 | ✅ | ✅ | 🟡 atual+Alt | E4 |
| Modo indexado | ✅ | ✅ | ✅ | ❌~ | ❌ | 🟡 modo img | ❌ | pesquisa |
| Cores recentes/favoritas | ✅~ | ❌~ | ✅~ | ❌ | ✅ hist | ✅ | ❌ | E4 |

## 6. Matriz — LAYER ENGINE

| Recurso | Aseprite | LibreSprite | Pixelorama | Piskel | Krita | PS | PF hoje | Alvo |
|---|---|---|---|---|---|---|---|---|
| Grupos | ✅ | ✅~ | ✅ | ❌ | ✅ | ✅ | ❌ | E5 |
| Opacidade/blend modes | ✅ | ✅ | ✅ | 🟡 opac~ | ✅ | ✅ | 🟡 opac | E5 |
| Alpha lock | ❌~ | ❌ | ✅~ | ❌ | ✅ | ✅ transp. | ❌ | E5 |
| Clipping mask | 🟡~ | ❌ | ✅ | ❌ | ✅ herdar | ✅ | ❌ | E5 |
| FX não-destrutivos | ❌ | ❌ | ✅ | ❌ | ✅ máscaras | ✅ estilos | ❌ | E5/E7 |

## 7. Matriz — GUIDES + HISTORY

| Recurso | Aseprite | LibreSprite | Pixelorama | Piskel | Krita | PS | PF hoje | Alvo |
|---|---|---|---|---|---|---|---|---|
| Grade configurável + major | ✅ | ✅ | ✅+iso | ✅~ | ✅ | ✅ | 🟡 fixa | E6 |
| Guias arrastáveis + snap | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | E6 |
| Undo/redo | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Snapshots/recuperação | 🟡 recuperar | ❌~ | ✅ backup | ❌ | 🟡 | ✅ | 🟡 autosave | E7 |

## 8. Matriz — ANIMAÇÃO (nossa base pronta)

| Recurso | Aseprite | LibreSprite | Pixelorama | Piskel | Krita | PS | PF hoje | Alvo |
|---|---|---|---|---|---|---|---|---|
| Timeline frames+cels | ✅ | ✅ | ✅ | ✅ simples | ✅ | 🟡 | ✅ ações | — |
| Tags | ✅ | ✅~ | ✅ | ❌ | ❌ | ❌ | ❌ | F |
| Duração por frame | ✅ | ✅~ | ✅ | ❌~ | ✅ | ✅ | ✅ ms | — |
| Onion multi + tintas | ✅ | ✅ | ✅ | ✅ básico | ✅ | 🟡 vídeo | ✅ +poses rig | — |
| Ping-pong/reverso | ✅ | ✅~ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Desenhar com play rodando | ❌~ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | pesquisa |
| Audio sync | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | FORA |

## 9. Matriz — ASSET + RIG + GENERATIVO (nosso fosso)

| Recurso | Aseprite | LibreSprite | Pixelorama | Piskel | Krita | PS | PF hoje | Alvo |
|---|---|---|---|---|---|---|---|---|
| Anchors/hitbox por frame | 🟡 slice~ | ❌ | 🟡 metadata | ❌ | ❌ | ❌ | ✅ | — FOSSO |
| Bones FK editável | ❌ | ❌ | ❌ | ❌ | ❌ | ❌~ | ✅ | — FOSSO |
| IK | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | F |
| Variações via palette-map | 🟡~ | ❌ | 🟡 palettize | ❌ | ❌ | 🟡 | ✅ | — FOSSO |
| Personagens procedurais | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | — FOSSO |
| Style grammar / DNA / roupas / multi-angle | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | K–N FOSSO |

## 10. Matriz — IMPORT/EXPORT

| Recurso | Aseprite | LibreSprite | Pixelorama | Piskel | Krita | PS | PF hoje | Alvo |
|---|---|---|---|---|---|---|---|---|
| Import PNG/sheet/GIF | ✅ | ✅ | ✅ +vídeo | 🟡 | ✅ img | ✅ | ❌ | G |
| Export sheet/GIF/APNG | ✅ | ✅ | ✅ +vídeo | ✅ GIF/PNG | 🟡 render | ✅ | 🟡 sheet+GIF | G |
| JSON/presets p/ engines | ✅ JSON | 🟡~ | 🟡~ | ❌ | ❌ | ❌ | ✅ pack.json | — FOSSO |
| Scripting/CLI | ✅ Lua+CLI | 🟡 CLI~ | ✅ CLI | ❌ | ✅ python | ✅ actions | ❌ | pesquisa |

## 11. Leitura: onde cada um vence (e por quê)

- **Aseprite** vence no *fluxo pixel completo* (indexed + tags + tilemap + CLI/Lua) e
  na maturidade de 10+ anos. Fraquezas para nós: desktop pago, sem web, sem rig,
  sem procedural, sem referência decente, sem estabilizador.
- **Pixelorama** vence em *modernidade open-source* (guides, FX não-destrutivos,
  rotxel, APNG, metadata, CLI). É o rival a monitorar de perto — mas também não
  tem rig/procedural e a UX é densa para não-artistas.
- **Piskel** vence em *tempo-até-primeiro-sprite* (web, zero fricção). Teto baixo:
  sem grupos/tags/seleção avançada. É o piso que já ultrapassamos em animação.
- **Krita** vence em *pintura* (brushes, estabilizador, caleidoscópio, máscaras).
  Irrelevante para pixel-first, mas é a referência para E2 (brush) e E6 (simetria).
- **Photoshop** vence em *ubiquidade profissional*. Caro, genérico, nada pixel-first.
  Referência apenas para layers/E5 e guides/E6.
- **LibreSprite** não vence em nada hoje — existe como lembrete de que "Aseprite
  grátis e parado" não é estratégia.

## 12. Onde o PixelForge pode vencer TODO MUNDO (fosso real)

Ninguém combina, num único ambiente web e guiado para não-artistas:

1. **Editor pixel + rig FK + procedural + variações + export engine-ready.**
   Aseprite/Pixelorama não têm rig nem procedural; geradores não têm editor.
2. **Asset Master** (receita + rig + variações + motions + pack.json). PNG vira
   representação descartável; o `.json` do projeto é o ativo.
3. **Rampas/dithering/shading guiados** (E4): nenhum pixel editor gera rampa com
   gramática de estilo; todos esperam que o artista já saiba.
4. **Style grammar + DNA + roupas + multi-angle** (K–N): blue ocean total.
5. **Web + colaborativo-futuro + preço acessível**: Aseprite é desktop pago;
   Piskel é web mas raso; Pixelorama-web existe mas Mira artista técnico.

Estratégia em uma frase: **empatar com o Aseprite no núcleo (E1–E7), ultrapassar
no asset pipeline (F–J), e ser inalcançável no generativo dirigido (K–N).**

## 13. Correções ao plano colado (auditoria honesta, duas vias)

O plano subestimou o que já temos — registrar para não retrabalhar:

- Onion "só 1 frame, tinta fixa" ❌ → C2 entregou prev/next + opacidade + tintas.
- Linha/ret/elipse sem Shift ❌ → Shift existe (snap/fill); falta Alt-centro e redondo.
- Paleta "sem import/export/undo" ❌ → B2 entregou `.gpl` + undo.
- Playback "sem ping-pong/1x" ❌ → C2 entregou playModes + preview 1x.

E estes pontos do plano **conflitam com constraints vigentes** do projeto:

1. **`T` = Transform**: hoje `T` é âncoras/meta (D1, entregue). Transform deve
   morar em `M` (contexto seleção) ou tecla livre — nunca roubar o `T`.
2. **`Space` = pan**: hoje `Space` é play/pause. Proposta E1: manter `Space`=play
   (como Aseprite), pan via `H` (segurar = temporário) + botão-do-meio + `F`=fit,
   `1`=100%, `2`=200%.
3. **Skew/perspectiva/rotate-livre e rotação de canvas**: FORA (destroem pixels;
   nenhum pixel editor sério tem). Só versões pixel-safe.
4. **2.5D / AI / image→asset**: fora de escopo nesta fase (constraint vigente;
   2.5D mora em K–N, AI além).
5. **Polígono/bezier**: prioridade baixa (E3, depois de laço+varinha+transform).

## 14. Proposta: FASE E = Editor Core (decisão pendente)

Recomendação: executar o Editor Core **agora**, antes de IK/Motion — exatamente
para não cair na armadilha que o plano denuncia (gerar o que não se consegue editar).

| Bloco | Conteúdo | Base |
|---|---|---|
| **E1 Canvas Navigation** | Ctrl+wheel zoom-no-cursor, pan (H/meio), F fit, 1/2 zoom, HUD mínima | zoom 4–32 existe |
| **E2 Brush Engine** | pincel redondo/custom, preview no hover, dinâmica-lite, estabilizador, retângulo □/◎, auditar elipse | pixel-perfect, Shift, interpolação |
| **E3 Selection+Transform** | elipse/laço/varinha, flutuar, rot/escala pixel-safe, V=Move | seleção ret + mover + flip |
| **E4 Color Engine** | rampas (FOSSO), dithering Bayer, dodge/burn/hue, picker modos, recentes | paleta + `.gpl` + undo |
| **E5 Layer Engine** | grupos, blend, alpha lock, clipping, referência | vis/lock/opac/ordem |
| **E6 Guide Engine** | grade configurável, guias+snap, simetria radial | grade fixa, espelhos X/Y |
| **E7 History Engine** | snapshots nomeados, recuperação de crash | undo/redo, autosave |

Mapeamento de fases (sem renumerar nada além de E/F):

- **E** = Editor Core (E1–E7) — antes "IK".
- **F** = Rig+Motion (IK two-bone + 6 motions + tags + modo silhueta) — fusão do
  antigo E + antigo F. G–J inalterados. Ordem A→J, depois K–N: preservada.
