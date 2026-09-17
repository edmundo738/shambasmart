import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Box, Brush, Clapperboard, Download, FileJson, Film, Gamepad2, Layers,
  Shapes, Sparkles, User as UserIcon, Wand2, Zap,
} from 'lucide-react';
import { TEMPLATES, TemplateBuild } from '../lib/templates';
import { Variation } from '../types';
import { AnimatedSprite } from '../components/SpriteView';
import AuthModal from '../components/AuthModal';
import { PlanCards } from '../components/PricingModal';
import { useAuth } from '../store/auth';

const SHOWCASE_VARS: Array<{ name: string; v: Variation | null }> = [
  { name: 'original', v: null },
  { name: 'sombra', v: { id: 's', name: 'sombra', mapping: {}, hue: 0, sat: -10, light: -22 } },
  { name: 'gelo', v: { id: 'g', name: 'gelo', mapping: {}, hue: 140, sat: 10, light: 8 } },
  { name: 'ouro', v: { id: 'o', name: 'ouro', mapping: {}, hue: -45, sat: 20, light: 6 } },
  { name: 'veneno', v: { id: 'v', name: 'veneno', mapping: {}, hue: 90, sat: 25, light: -5 } },
];

function Logo() {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-8 w-8 grid-cols-2 overflow-hidden rounded-lg border border-ink-600">
        <span className="bg-pixel-500" /><span className="bg-forge-500" />
        <span className="bg-ember-500" /><span className="bg-[#ff4d6d]" />
      </span>
      <span className="font-display text-base font-bold text-white">PixelForge <span className="font-medium text-slate-500">Studio</span></span>
    </span>
  );
}

export default function Landing() {
  const user = useAuth((s) => s.user);
  const [authOpen, setAuthOpen] = useState(false);

  const slime = useMemo(() => TEMPLATES[0].build(), []);
  const knight = useMemo(() => TEMPLATES[1].build(), []);
  const coin = useMemo(() => TEMPLATES[2].build(), []);
  const ghost = useMemo(() => TEMPLATES[3].build(), []);

  const framesOf = (built: ReturnType<typeof slime extends never ? never : () => typeof slime>, animName: string) => {
    const b = built as unknown as { animations: { name: string; fps: number; frameIds: string[] }[]; frames: Record<string, { id: string; cells: string[] }> };
    const a = b.animations.find((x) => x.name === animName) ?? b.animations[0];
    return { frames: a.frameIds.map((fid) => b.frames[fid]), fps: a.fps, name: a.name };
  };

  const slimeIdle = framesOf(slime as never, 'idle');
  const knightWalk = framesOf(knight as never, 'andar');
  const knightAtk = framesOf(knight as never, 'ataque');
  const coinSpin = framesOf(coin as never, 'girar');
  const ghostFloat = framesOf(ghost as never, 'flutuar');

  return (
    <div className="min-h-full bg-ink-950">
      {/* NAV */}
      <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Link to="/"><Logo /></Link>
          <nav className="hidden items-center gap-5 text-sm text-slate-400 md:flex">
            <a href="#recursos" className="hover:text-white">Recursos</a>
            <a href="#como-funciona" className="hover:text-white">Como funciona</a>
            <a href="#vitrine" className="hover:text-white">Vitrine</a>
            <a href="#planos" className="hover:text-white">Planos</a>
          </nav>
          <div className="flex-1" />
          {user ? (
            <Link to="/projetos" className="flex items-center gap-2 rounded-lg border border-ink-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-forge-500">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-forge-500 to-pixel-500 text-[10px] font-bold text-ink-950">
                {user.name.charAt(0).toUpperCase()}
              </span>
              Meus projetos
            </Link>
          ) : (
            <button onClick={() => setAuthOpen(true)} className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white sm:flex">
              <UserIcon size={15} /> Entrar
            </button>
          )}
          <Link to="/projetos" className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-forge-500 to-pixel-500 px-4 py-2 text-sm font-bold text-ink-950 hover:brightness-110">
            Criar sprite <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,rgba(34,184,240,0.15),transparent_55%),radial-gradient(ellipse_at_80%_110%,rgba(142,224,0,0.1),transparent_50%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 lg:grid-cols-2 lg:items-center lg:pt-20">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pixel-500/40 bg-pixel-500/10 px-3 py-1 text-xs font-semibold text-pixel-400">
              <Sparkles size={13} /> Novo: forja automática de variações
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
              Um modelo.
              <br />
              <span className="bg-gradient-to-r from-forge-400 via-pixel-400 to-ember-400 bg-clip-text text-transparent">
                Infinitas animações.
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
              O estúdio online para <strong className="text-slate-200">devs 2D e ilustradores pixel</strong> criarem
              animações sequenciadas, forjarem <strong className="text-slate-200">variações do mesmo modelo</strong> e
              exportarem <strong className="text-slate-200">asset packs prontos</strong> para Godot, Unity, Phaser e GameMaker.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/projetos" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-forge-500 to-pixel-500 px-6 py-3 text-sm font-bold text-ink-950 shadow-glow hover:brightness-110">
                <Brush size={16} /> Começar a criar grátis
              </Link>
              <a href="#vitrine" className="flex items-center gap-2 rounded-xl border border-ink-600 px-6 py-3 text-sm font-semibold text-slate-200 hover:border-forge-500">
                <Gamepad2 size={16} /> Ver pack de exemplo
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
              <span className="flex items-center gap-1.5"><Zap size={13} className="text-ember-400" /> Sem instalar nada</span>
              <span className="flex items-center gap-1.5"><Box size={13} className="text-forge-400" /> Spritesheets + JSON + GIF</span>
              <span className="flex items-center gap-1.5"><Layers size={13} className="text-pixel-400" /> Variações não-destrutivas</span>
            </div>
          </div>

          {/* palco animado */}
          <div className="relative">
            <div className="checker overflow-hidden rounded-2xl border border-ink-600 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-ink-700 bg-ink-900/90 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff4d6d]" />
                <span className="h-2.5 w-2.5 rounded-full bg-ember-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-pixel-500" />
                <span className="ml-2 font-mono text-[11px] text-slate-400">cavaleiro__original — andar · 8fps</span>
              </div>
              <div className="flex items-end justify-around px-6 pb-6 pt-8">
                <div className="animate-float-slow flex flex-col items-center gap-2">
                  <AnimatedSprite frames={slimeIdle.frames} width={32} height={32} fps={slimeIdle.fps} scale={4} />
                  <span className="rounded-full bg-ink-950/80 px-2 py-0.5 font-mono text-[10px] text-pixel-400">slime·idle</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <AnimatedSprite frames={knightWalk.frames} width={32} height={32} fps={knightWalk.fps} scale={5} />
                  <span className="rounded-full bg-ink-950/80 px-2 py-0.5 font-mono text-[10px] text-forge-300">cavaleiro·andar</span>
                </div>
                <div className="animate-float-slow flex flex-col items-center gap-2" style={{ animationDelay: '-2.5s' }}>
                  <AnimatedSprite frames={ghostFloat.frames} width={32} height={32} fps={ghostFloat.fps} scale={4} />
                  <span className="rounded-full bg-ink-950/80 px-2 py-0.5 font-mono text-[10px] text-fuchsia-300">fantasma·flutuar</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-ink-700 bg-ink-900/90 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <AnimatedSprite frames={coinSpin.frames} width={32} height={32} fps={coinSpin.fps} scale={2} />
                  <AnimatedSprite frames={knightAtk.frames} width={32} height={32} fps={knightAtk.fps} scale={2} />
                </div>
                <span className="font-mono text-[11px] text-slate-400">pack.zip <span className="text-pixel-400">↓ 47 arquivos</span><span className="animate-blink text-forge-300">▌</span></span>
              </div>
            </div>
            <div className="absolute -right-3 -top-3 rotate-3 rounded-xl border border-ember-400/50 bg-ink-950 px-3 py-2 font-mono text-[11px] text-ember-400 shadow-xl">
              andar__gelo.png ✓
            </div>
            <div className="absolute -left-3 bottom-16 -rotate-2 rounded-xl border border-pixel-500/50 bg-ink-950 px-3 py-2 font-mono text-[11px] text-pixel-400 shadow-xl">
              ataque__veneno.gif ✓
            </div>
          </div>
        </div>

        {/* engines */}
        <div className="relative border-y border-ink-800 bg-ink-900/40">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-4 text-sm font-semibold text-slate-500">
            <span className="text-xs font-medium uppercase tracking-widest">Exporta para</span>
            {['Godot', 'Unity', 'Phaser 3', 'GameMaker', 'Construct'].map((e) => (
              <span key={e} className="font-display tracking-wide text-slate-300">{e}</span>
            ))}
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-display text-3xl font-bold text-white">Tudo que um asset 2D precisa</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-400">
          Do primeiro pixel ao pack final, sem trocar de ferramenta.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Brush size={20} />, color: 'text-forge-400 bg-forge-500/10 border-forge-500/30', title: 'Editor pixel profissional', desc: 'Pincel, balde, formas, espelhamento, grade e onion skin. Desenhe frame a frame com precisão.' },
            { icon: <Clapperboard size={20} />, color: 'text-ember-400 bg-ember-500/10 border-ember-500/30', title: 'Ações bem sequenciadas', desc: 'idle, andar, ataque… cada ação com seus frames, FPS e ordem garantidos no export.' },
            { icon: <Shapes size={20} />, color: 'text-pixel-400 bg-pixel-500/10 border-pixel-500/30', title: 'Forja de variações', desc: 'Gere skins do mesmo modelo: sombras, gelo, ouro, veneno. Não-destrutivo, aplicado a tudo.' },
            { icon: <Wand2 size={20} />, color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30', title: 'Troca de cores fina', desc: 'Remapeie qualquer cor da paleta por variação, com prévia animada em tempo real.' },
            { icon: <FileJson size={20} />, color: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30', title: 'Metadados por engine', desc: 'JSON no formato certo para Phaser, Godot, Unity e GameMaker. Chega de fatiar na mão.' },
            { icon: <Download size={20} />, color: 'text-lime-300 bg-lime-500/10 border-lime-500/30', title: 'Pack ZIP organizado', desc: 'Spritesheets, GIFs, frames avulsos e manifesto — nomeados como andar__gelo_f00.png.' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-ink-700 bg-ink-900/50 p-5 transition-colors hover:border-ink-600">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl border ${f.color}`}>{f.icon}</div>
              <h3 className="font-display text-base font-bold text-white">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="border-y border-ink-800 bg-ink-900/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-white">Do pixel ao jogo em 3 passos</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { n: '01', title: 'Modele o sprite', desc: 'Desenhe do zero ou parta de um modelo animado pronto: slime, cavaleiro, moeda, fantasma e mais.' },
              { n: '02', title: 'Anime as ações', desc: 'Crie idle, andar, pulo e ataque com timeline, onion skin e prévia em tempo real na velocidade do jogo.' },
              { n: '03', title: 'Forje e exporte', desc: 'Gere variações do mesmo modelo e baixe o pack ZIP sequenciado com spritesheets, JSON e GIFs.' },
            ].map((s) => (
              <div key={s.n} className="relative overflow-hidden rounded-2xl border border-ink-700 bg-ink-950 p-6">
                <span className="font-pixel text-2xl text-ink-600">{s.n}</span>
                <h3 className="mt-2 font-display text-lg font-bold text-white">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VITRINE */}
      <section id="vitrine" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center font-display text-3xl font-bold text-white">
          Um modelo <span className="text-slate-500">→</span> <span className="bg-gradient-to-r from-forge-400 to-pixel-400 bg-clip-text text-transparent">pack completo</span>
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-400">
          Isto é real: o mesmo cavaleiro, 3 ações × 5 variações = 15 spritesheets animadas, geradas em segundos.
        </p>
        <div className="mt-8 overflow-x-auto thin-scroll rounded-2xl border border-ink-700 bg-ink-900/40 p-4">
          <div className="grid min-w-[720px] grid-cols-[110px_repeat(5,1fr)] gap-2">
            <div />
            {SHOWCASE_VARS.map((v) => (
              <div key={v.name} className="rounded-lg bg-gradient-to-r from-forge-500/20 to-pixel-500/20 px-2 py-1.5 text-center font-mono text-[11px] font-bold text-white">
                {v.name}
              </div>
            ))}
            {knight.animations.map((a) => (
              <>
                <div key={`label-${a.name}`} className="flex items-center justify-end gap-1.5 pr-2 text-right">
                  <Film size={13} className="text-ember-400" />
                  <div>
                    <div className="text-xs font-bold text-white">{a.name}</div>
                    <div className="font-mono text-[10px] text-slate-500">{a.fps}fps · {a.frameIds.length}f</div>
                  </div>
                </div>
                {SHOWCASE_VARS.map((v) => (
                  <div key={`${a.name}-${v.name}`} className="checker flex items-center justify-center rounded-lg border border-ink-700 py-3 transition-colors hover:border-forge-500">
                    <AnimatedSprite
                      frames={a.frameIds.map((fid) => knight.frames[fid])}
                      width={32} height={32} fps={a.fps} scale={3} variation={v.v}
                    />
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>
        <div className="mt-6 text-center">
          <Link to="/projetos" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-forge-500 to-pixel-500 px-6 py-3 text-sm font-bold text-ink-950 hover:brightness-110">
            Forjar meu próprio pack <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="border-y border-ink-800 bg-ink-900/40 py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-display text-3xl font-bold text-white">Planos para cada fase do seu jogo</h2>
          <p className="mt-2 text-center text-sm text-slate-400">Comece grátis. Escale quando o pack crescer.</p>
          <div className="mt-8"><PlanCards /></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16">
        <h2 className="text-center font-display text-2xl font-bold text-white">Perguntas frequentes</h2>
        <div className="mt-6 flex flex-col gap-3">
          {[
            { q: 'Preciso instalar alguma coisa?', a: 'Não. O PixelForge roda 100% no navegador — desenhe, anime e exporte de qualquer computador.' },
            { q: 'Meus sprites funcionam na minha engine?', a: 'Sim. Exportamos spritesheets PNG com metadados JSON nos formatos de Phaser, Godot, Unity e GameMaker, além de GIFs e frames avulsos sequenciados.' },
            { q: 'As variações destroem meu desenho original?', a: 'Nunca. Variações são não-destrutivas: o modelo base fica intacto e cada skin é um remapeamento aplicado na hora de visualizar e exportar.' },
            { q: 'Posso usar os assets em jogos comerciais?', a: 'Tudo que você cria (incluindo a partir dos modelos iniciais) é 100% seu, inclusive para uso comercial.' },
            { q: 'Como funcionam os tamanhos de canvas?', a: 'No plano grátis até 32×32px; no Pro e Studio até 64×64px — com export em escala de até 8x sem perda.' },
          ].map((f) => (
            <details key={f.q} className="group rounded-xl border border-ink-700 bg-ink-900/50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-white marker:text-forge-400">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-ink-600 bg-gradient-to-br from-forge-600/30 via-ink-900 to-pixel-600/20 p-10 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(142,224,0,0.12),transparent_60%)]" />
          <h2 className="relative font-display text-3xl font-bold text-white">Seu próximo pack está a um clique</h2>
          <p className="relative mx-auto mt-2 max-w-md text-sm text-slate-300">Junte-se a devs e ilustradores criando assets 2D mais rápido — do pixel ao ZIP.</p>
          <Link to="/projetos" className="relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-forge-500 to-pixel-500 px-8 py-3.5 text-sm font-bold text-ink-950 shadow-glow hover:brightness-110">
            Criar meu primeiro sprite <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-ink-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between">
          <Logo />
          <p className="text-xs text-slate-500">© 2026 PixelForge Studio — Forjado com pixels no Brasil.</p>
          <div className="flex gap-4 text-xs text-slate-500">
            <a href="#recursos" className="hover:text-white">Recursos</a>
            <a href="#planos" className="hover:text-white">Planos</a>
            <Link to="/projetos" className="hover:text-white">Abrir Studio</Link>
          </div>
        </div>
      </footer>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
