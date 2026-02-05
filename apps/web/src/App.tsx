import { DashboardCard } from './components/DashboardCard';
import { FeedList } from './feed/FeedList';
import { LogisticsPanel } from './logistics/LogisticsPanel';
import { MarketplaceGrid } from './marketplace/MarketplaceGrid';
import { FarmerProfileCard } from './profile/FarmerProfileCard';
import { StudentModePanel } from './student/StudentModePanel';

export function App() {
  return (
    <main className="container">
      <header className="hero">
        <h1>CHAMBA / ShambaSmart</h1>
        <p>Onde o campo encontra oportunidades.</p>
      </header>

      <section className="grid">
        <DashboardCard />
        <MarketplaceGrid />
        <LogisticsPanel />
        <FarmerProfileCard />
        <FeedList />
        <StudentModePanel />
      </section>
    </main>
  );
}
