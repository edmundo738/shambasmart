import { useState } from 'react';
import { Check, Crown, Rocket, Sparkles, X } from 'lucide-react';
import { PlanId, useAuth } from '../store/auth';

const PLANS: Array<{
  id: PlanId; name: string; price: string; period: string; icon: React.ReactNode;
  features: string[]; highlight?: boolean; cta: string;
}> = [
  {
    id: 'free', name: 'Pixel Grátis', price: 'R$ 0', period: '/sempre', cta: 'Começar grátis',
    icon: <Sparkles size={18} />,
    features: ['3 projetos na nuvem', 'Canvas até 32×32', 'Export PNG + GIF', 'Até 2 variações por sprite', 'Templates iniciais'],
  },
  {
    id: 'pro', name: 'Forge Pro', price: 'R$ 29', period: '/mês', cta: 'Assinar Pro', highlight: true,
    icon: <Rocket size={18} />,
    features: ['Projetos ilimitados', 'Canvas até 64×64', 'Packs ZIP + JSON (Godot, Unity, Phaser)', 'Variações ilimitadas + forja automática', 'GIFs em alta escala', 'Sem marca d\'água'],
  },
  {
    id: 'studio', name: 'Studio Team', price: 'R$ 79', period: '/mês', cta: 'Assinar Studio',
    icon: <Crown size={18} />,
    features: ['Tudo do Pro', 'Biblioteca compartilhada da equipe', 'Versionamento de sprites', 'API de exportação', 'Suporte prioritário'],
  },
];

export function PlanCards({ compact = false }: { compact?: boolean }) {
  const user = useAuth((s) => s.user);
  const setPlan = useAuth((s) => s.setPlan);
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState<PlanId | null>(null);
  const [success, setSuccess] = useState<PlanId | null>(null);

  const choose = (id: PlanId) => {
    if (user) {
      setPlan(id);
      setSuccess(id);
      setTimeout(() => setSuccess(null), 2500);
    } else {
      setPending(id);
    }
  };

  const confirmWithEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@') || !pending) return;
    login(email.split('@')[0], email);
    setPlan(pending);
    setSuccess(pending);
    setPending(null);
    setEmail('');
    setTimeout(() => setSuccess(null), 2500);
  };

  return (
    <div>
      <div className={`grid gap-4 ${compact ? 'md:grid-cols-3' : 'md:grid-cols-3'}`}>
        {PLANS.map((p) => {
          const current = user?.plan === p.id;
          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border p-5 ${
                p.highlight ? 'border-pixel-500 bg-gradient-to-b from-pixel-500/10 to-transparent shadow-glow-green' : 'border-ink-600 bg-ink-900/60'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-pixel-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-950">
                  Mais popular
                </span>
              )}
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${p.highlight ? 'bg-pixel-500 text-ink-950' : 'bg-ink-800 text-forge-300'}`}>
                {p.icon}
              </div>
              <div className="font-display text-base font-bold text-white">{p.name}</div>
              <div className="mb-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-white">{p.price}</span>
                <span className="text-xs text-slate-400">{p.period}</span>
              </div>
              <ul className="mb-4 flex flex-col gap-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-300">
                    <Check size={13} className="mt-0.5 shrink-0 text-pixel-400" /> {f}
                  </li>
                ))}
              </ul>
              <div className="flex-1" />
              <button
                onClick={() => choose(p.id)}
                disabled={current}
                className={`w-full rounded-xl py-2.5 text-sm font-bold ${
                  current
                    ? 'bg-ink-800 text-slate-400'
                    : p.highlight
                      ? 'bg-pixel-500 text-ink-950 hover:brightness-110'
                      : 'border border-ink-600 text-white hover:border-forge-500'
                }`}
              >
                {success === p.id ? '✓ Plano ativado!' : current ? 'Plano atual' : p.cta}
              </button>
            </div>
          );
        })}
      </div>

      {pending && (
        <form onSubmit={confirmWithEmail} className="mt-4 flex flex-col gap-2 rounded-xl border border-forge-500/40 bg-forge-500/10 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-xs text-slate-300">
            Para ativar o <strong className="text-white">{PLANS.find((p) => p.id === pending)?.name}</strong>, confirme seu e-mail:
          </p>
          <input
            autoFocus
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@studio.com"
            className="rounded-lg border border-ink-600 bg-ink-950 px-3 py-2 text-sm text-white"
          />
          <button type="submit" className="rounded-lg bg-forge-500 px-4 py-2 text-sm font-bold text-ink-950 hover:brightness-110">
            Confirmar
          </button>
        </form>
      )}
      <p className="mt-3 text-center text-[11px] text-slate-500">
        Demonstração: o checkout é simulado e o plano fica salvo localmente. No MVP todos os recursos de edição estão liberados.
      </p>
    </div>
  );
}

export default function PricingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="cabinet w-full max-w-4xl rounded-2xl bg-ink-950 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-white">Planos do PixelForge</h2>
            <p className="text-sm text-slate-400">Do hobby ao studio profissional</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-ink-800 hover:text-white"><X size={18} /></button>
        </div>
        <PlanCards />
      </div>
    </div>
  );
}
