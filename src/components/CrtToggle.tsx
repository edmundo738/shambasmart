import { useEffect, useState } from 'react';
import { Monitor, MonitorOff } from 'lucide-react';

const KEY = 'pixelforge-crt';

export function isCrtOn(): boolean {
  try {
    return (localStorage.getItem(KEY) ?? 'on') !== 'off';
  } catch {
    return true;
  }
}

export function applyCrt(on: boolean) {
  document.body.classList.toggle('crt-on', on);
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* modo privado: segue sem persistir */
  }
}

/** Liga/desliga o efeito CRT (scanlines + vinheta). Puro cosmético. */
export default function CrtToggle({ className = '' }: { className?: string }) {
  const [on, setOn] = useState(isCrtOn);
  useEffect(() => {
    applyCrt(on);
  }, [on]);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      title={on ? 'Desligar efeito CRT' : 'Ligar efeito CRT'}
      className={className}
    >
      {on ? <Monitor size={16} /> : <MonitorOff size={16} />}
    </button>
  );
}
