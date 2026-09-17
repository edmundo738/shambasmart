import { useState } from 'react';
import { Gamepad2, LogOut, X } from 'lucide-react';
import { useAuth } from '../store/auth';

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const user = useAuth((s) => s.user);
  const login = useAuth((s) => s.login);
  const logout = useAuth((s) => s.logout);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    login(name || email.split('@')[0], email);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-ink-600 bg-ink-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-forge-500 to-pixel-500 text-ink-950">
            <Gamepad2 size={20} />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white">{user ? 'Sua conta' : 'Entrar no PixelForge'}</h2>
            <p className="text-xs text-slate-400">Sincronize projetos e desbloqueie o Pro</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-ink-800 hover:text-white"><X size={18} /></button>
        </div>

        {user ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-ink-700 bg-ink-950 p-4">
              <div className="text-sm font-semibold text-white">{user.name}</div>
              <div className="text-xs text-slate-400">{user.email}</div>
              <div className="mt-2 inline-block rounded-full bg-pixel-500/20 px-2.5 py-1 text-[11px] font-bold uppercase text-pixel-400">
                Plano {user.plan}
              </div>
            </div>
            <button onClick={() => { logout(); onClose(); }} className="flex items-center justify-center gap-2 rounded-xl border border-ink-600 py-2.5 text-sm font-semibold text-slate-300 hover:border-red-500 hover:text-red-400">
              <LogOut size={15} /> Sair
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="block text-xs text-slate-400">
              Nome artístico
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ana Pixel" className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600" />
            </label>
            <label className="block text-xs text-slate-400">
              E-mail
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@studio.com" type="email" required className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-600" />
            </label>
            <button type="submit" className="rounded-xl bg-gradient-to-r from-forge-500 to-pixel-500 py-3 text-sm font-bold text-ink-950 hover:brightness-110">
              Criar conta grátis
            </button>
            <p className="text-center text-[11px] text-slate-500">MVP: a conta fica salva neste navegador. Sem senha, sem spam.</p>
          </form>
        )}
      </div>
    </div>
  );
}
