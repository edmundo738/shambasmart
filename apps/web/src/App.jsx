import { useMemo } from 'react';
import SectionCard from './components/SectionCard.jsx';

const dashboard = {
  location: 'Huambo, Angola',
  weather: '28°C - Ensolarado',
  roads: 'EN260 com trânsito moderado',
  tip: 'Irrigue no final do dia para reduzir evaporação.',
  alerts: ['Chuva prevista para quinta', 'Atenção a praga no milho']
};

const marketplace = [
  { item: 'Milho (100kg)', price: '32.000 Kz', area: 'Caála' },
  { item: 'Sementes de feijão', price: '4.500 Kz', area: 'Bailundo' }
];

const logistics = [{ route: 'Huambo → Benguela', vehicle: 'Camião 6T', score: '4.8' }];
const courses = [{ name: 'Solo saudável', badge: 'Aprendiz Verde' }];

export default function App() {
  const slogan = useMemo(() => 'Onde o campo encontra oportunidades', []);

  return (
    <main className="container">
      <header className="hero">
        <h1>CHAMBA / ShambaSmart</h1>
        <p>{slogan}</p>
      </header>

      <div className="grid">
        <SectionCard title="Dashboard Agrícola">
          <p><strong>Localização:</strong> {dashboard.location}</p>
          <p><strong>Clima:</strong> {dashboard.weather}</p>
          <p><strong>Estradas:</strong> {dashboard.roads}</p>
          <p><strong>Dica:</strong> {dashboard.tip}</p>
          <ul>{dashboard.alerts.map((alert) => <li key={alert}>{alert}</li>)}</ul>
        </SectionCard>

        <SectionCard title="Marketplace">
          <ul>
            {marketplace.map((m) => (
              <li key={m.item}>{m.item} — {m.price} ({m.area})</li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Transporte & Logística">
          {logistics.map((l) => (
            <p key={l.route}>{l.route} | {l.vehicle} | ⭐ {l.score}</p>
          ))}
        </SectionCard>

        <SectionCard title="Modo Estudante">
          {courses.map((c) => (
            <p key={c.name}>{c.name} — Medalha: {c.badge}</p>
          ))}
        </SectionCard>
      </div>
    </main>
  );
}
